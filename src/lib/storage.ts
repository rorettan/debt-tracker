import { supabase } from '@/integrations/supabase/client';
import { BalanceSnapshot, Facility, RateSchedule } from '@/types/debt';

const CHANGE_EVENT = 'debt_tracker_supabase_data_sync';

// Live in-memory mirror kept strictly in sync with Supabase PostgreSQL
let cachedFacilities: Facility[] = [];
let cachedRateSchedules: RateSchedule[] = [];
let cachedSnapshots: BalanceSnapshot[] = [];
let lastSyncError: string | null = null;
let isSyncing = false;
let isRealtimeSubscribed = false;

function emitChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function subscribeToDataChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function getLastSyncError(): string | null {
  return lastSyncError;
}

export function getIsSyncing(): boolean {
  return isSyncing;
}

/**
 * Fetch all facilities, rate schedules, and balance snapshots directly from Supabase PostgreSQL
 */
export async function fetchSupabaseData(): Promise<{
  facilities: Facility[];
  rateSchedules: RateSchedule[];
  snapshots: BalanceSnapshot[];
  error?: string;
}> {
  isSyncing = true;
  lastSyncError = null;

  try {
    const [facRes, ratesRes, snapRes] = await Promise.all([
      supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('rate_schedules')
        .select('*')
        .order('effective_date', { ascending: false }),
      supabase
        .from('balance_snapshots')
        .select('*')
        .order('value_date', { ascending: false }),
    ]);

    if (facRes.error) {
      console.error('[Supabase Error] Facilities query failed:', facRes.error.message);
      lastSyncError = `Facilities: ${facRes.error.message}`;
    } else if (facRes.data) {
      cachedFacilities = facRes.data.map((f: any) => ({
        id: f.id,
        bank_name: f.bank_name,
        facility_name: f.facility_name,
        facility_type: f.facility_type,
        sanction_limit: Number(f.sanction_limit),
        status: f.status,
        created_at: f.created_at,
      }));
    }

    if (ratesRes.error) {
      console.error('[Supabase Error] Rate schedules query failed:', ratesRes.error.message);
      lastSyncError = `Rate schedules: ${ratesRes.error.message}`;
    } else if (ratesRes.data) {
      cachedRateSchedules = ratesRes.data.map((r: any) => ({
        id: r.id,
        facility_id: r.facility_id,
        annual_rate_pct: Number(r.annual_rate_pct),
        effective_date: r.effective_date,
      }));
    }

    if (snapRes.error) {
      console.error('[Supabase Error] Balance snapshots query failed:', snapRes.error.message);
      lastSyncError = `Snapshots: ${snapRes.error.message}`;
    } else if (snapRes.data) {
      cachedSnapshots = snapRes.data.map((s: any) => ({
        id: s.id,
        facility_id: s.facility_id,
        value_date: s.value_date,
        balance_amount: Number(s.balance_amount),
        notes: s.notes || undefined,
        entry_timestamp: s.entry_timestamp || s.created_at || new Date().toISOString(),
      }));
    }

    emitChange();
  } catch (err: any) {
    lastSyncError = err?.message || 'Network error reaching Supabase';
    console.error('[Supabase Error] Failed to sync data:', err);
  } finally {
    isSyncing = false;
  }

  return {
    facilities: cachedFacilities,
    rateSchedules: cachedRateSchedules,
    snapshots: cachedSnapshots,
    error: lastSyncError || undefined,
  };
}

/**
 * Initialize live Supabase Realtime channel subscription
 */
function initSupabaseRealtime() {
  if (typeof window === 'undefined' || isRealtimeSubscribed) return;

  try {
    supabase
      .channel('public_postgres_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'facilities' },
        () => {
          fetchSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rate_schedules' },
        () => {
          fetchSupabaseData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'balance_snapshots' },
        () => {
          fetchSupabaseData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isRealtimeSubscribed = true;
        }
      });
  } catch (err) {
    console.warn('[Supabase Realtime] Setup error:', err);
  }
}

// Kick off initial fetch and realtime subscription
if (typeof window !== 'undefined') {
  initSupabaseRealtime();
  fetchSupabaseData();
}

// Active memory mirror accessors
export function getStoredFacilities(): Facility[] {
  return cachedFacilities;
}

export function getStoredRateSchedules(): RateSchedule[] {
  return cachedRateSchedules;
}

export function getStoredSnapshots(): BalanceSnapshot[] {
  return cachedSnapshots;
}

/**
 * Save a new facility directly to Supabase PostgreSQL
 */
export async function saveFacility(
  facility: Omit<Facility, 'id' | 'created_at'>,
  initialApr?: number
): Promise<{ data: Facility | null; error: string | null }> {
  try {
    const { data: insertedFacility, error } = await supabase
      .from('facilities')
      .insert({
        bank_name: facility.bank_name,
        facility_name: facility.facility_name,
        facility_type: facility.facility_type,
        sanction_limit: facility.sanction_limit,
        status: facility.status,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase Insert Error] facilities:', error.message);
      return { data: null, error: error.message };
    }

    const newFacility: Facility = {
      id: insertedFacility.id,
      bank_name: insertedFacility.bank_name,
      facility_name: insertedFacility.facility_name,
      facility_type: insertedFacility.facility_type,
      sanction_limit: Number(insertedFacility.sanction_limit),
      status: insertedFacility.status,
      created_at: insertedFacility.created_at,
    };

    // If initial APR provided, save to rate_schedules table
    if (initialApr && initialApr > 0) {
      const today = new Date().toISOString().split('T')[0];
      const rateRes = await supabase.from('rate_schedules').insert({
        facility_id: newFacility.id,
        annual_rate_pct: initialApr,
        effective_date: today,
      });

      if (rateRes.error) {
        console.warn('[Supabase Insert Warning] rate_schedules:', rateRes.error.message);
      }
    }

    await fetchSupabaseData();
    return { data: newFacility, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] saveFacility:', err);
    return { data: null, error: err?.message || 'Failed to connect to Supabase' };
  }
}

/**
 * Update facility parameters directly in Supabase
 */
export async function updateFacility(
  id: string,
  updates: Partial<Facility>
): Promise<{ data: Facility | null; error: string | null }> {
  try {
    const payload: any = {};
    if (updates.bank_name !== undefined) payload.bank_name = updates.bank_name;
    if (updates.facility_name !== undefined) payload.facility_name = updates.facility_name;
    if (updates.facility_type !== undefined) payload.facility_type = updates.facility_type;
    if (updates.sanction_limit !== undefined) payload.sanction_limit = updates.sanction_limit;
    if (updates.status !== undefined) payload.status = updates.status;

    const { data, error } = await supabase
      .from('facilities')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Supabase Update Error] facilities:', error.message);
      return { data: null, error: error.message };
    }

    const updated: Facility = {
      id: data.id,
      bank_name: data.bank_name,
      facility_name: data.facility_name,
      facility_type: data.facility_type,
      sanction_limit: Number(data.sanction_limit),
      status: data.status,
      created_at: data.created_at,
    };

    await fetchSupabaseData();
    return { data: updated, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] updateFacility:', err);
    return { data: null, error: err?.message || 'Failed to update facility' };
  }
}

/**
 * Delete a facility directly from Supabase (foreign keys cascade to rates and snapshots)
 */
export async function deleteFacility(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) {
      console.error('[Supabase Delete Error] facilities:', error.message);
      return { success: false, error: error.message };
    }

    await fetchSupabaseData();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] deleteFacility:', err);
    return { success: false, error: err?.message || 'Failed to delete facility' };
  }
}

/**
 * Save rate schedule directly to Supabase
 */
export async function saveRateSchedule(
  schedule: Omit<RateSchedule, 'id'>
): Promise<{ data: RateSchedule | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('rate_schedules')
      .insert({
        facility_id: schedule.facility_id,
        annual_rate_pct: schedule.annual_rate_pct,
        effective_date: schedule.effective_date,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase Insert Error] rate_schedules:', error.message);
      return { data: null, error: error.message };
    }

    const newSchedule: RateSchedule = {
      id: data.id,
      facility_id: data.facility_id,
      annual_rate_pct: Number(data.annual_rate_pct),
      effective_date: data.effective_date,
    };

    await fetchSupabaseData();
    return { data: newSchedule, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] saveRateSchedule:', err);
    return { data: null, error: err?.message || 'Failed to save rate revision' };
  }
}

/**
 * Delete rate schedule revision directly from Supabase
 */
export async function deleteRateSchedule(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('rate_schedules').delete().eq('id', id);
    if (error) {
      console.error('[Supabase Delete Error] rate_schedules:', error.message);
      return { success: false, error: error.message };
    }

    await fetchSupabaseData();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] deleteRateSchedule:', err);
    return { success: false, error: err?.message || 'Failed to delete rate revision' };
  }
}

/**
 * Save balance snapshot directly to Supabase
 */
export async function saveSnapshot(
  snapshot: Omit<BalanceSnapshot, 'id' | 'entry_timestamp'>
): Promise<{ data: BalanceSnapshot | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('balance_snapshots')
      .insert({
        facility_id: snapshot.facility_id,
        value_date: snapshot.value_date,
        balance_amount: snapshot.balance_amount,
        notes: snapshot.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase Insert Error] balance_snapshots:', error.message);
      return { data: null, error: error.message };
    }

    const newSnapshot: BalanceSnapshot = {
      id: data.id,
      facility_id: data.facility_id,
      value_date: data.value_date,
      balance_amount: Number(data.balance_amount),
      notes: data.notes || undefined,
      entry_timestamp: data.entry_timestamp || new Date().toISOString(),
    };

    await fetchSupabaseData();
    return { data: newSnapshot, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] saveSnapshot:', err);
    return { data: null, error: err?.message || 'Failed to log snapshot' };
  }
}

/**
 * Delete balance snapshot directly from Supabase
 */
export async function deleteSnapshot(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('balance_snapshots').delete().eq('id', id);
    if (error) {
      console.error('[Supabase Delete Error] balance_snapshots:', error.message);
      return { success: false, error: error.message };
    }

    await fetchSupabaseData();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] deleteSnapshot:', err);
    return { success: false, error: err?.message || 'Failed to delete snapshot' };
  }
}

/**
 * Reset portfolio by deleting all records in Supabase PostgreSQL
 */
export async function clearAllData(): Promise<{ success: boolean; error: string | null }> {
  try {
    // Delete in order of dependencies (or cascade from facilities)
    await supabase.from('balance_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('rate_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('facilities').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await fetchSupabaseData();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] clearAllData:', err);
    return { success: false, error: err?.message || 'Failed to clear data' };
  }
}

/**
 * Load commercial demo portfolio directly into Supabase PostgreSQL
 */
export async function loadSampleCommercialData(): Promise<{ success: boolean; error: string | null }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Insert Facilities into Supabase
    const { data: facs, error: facErr } = await supabase
      .from('facilities')
      .insert([
        {
          bank_name: 'HDFC Bank',
          facility_name: 'Working Capital Overdraft',
          facility_type: 'OVERDRAFT',
          sanction_limit: 5000000, // ₹50 Lakhs
          status: 'ACTIVE',
        },
        {
          bank_name: 'ICICI Bank',
          facility_name: 'Vendor Channel Financing',
          facility_type: 'CHANNEL_FINANCE',
          sanction_limit: 3000000, // ₹30 Lakhs
          status: 'ACTIVE',
        },
        {
          bank_name: 'State Bank of India',
          facility_name: 'Plant Expansion Term Loan',
          facility_type: 'TERM_LOAN',
          sanction_limit: 12500000, // ₹1.25 Crore
          status: 'ACTIVE',
        },
      ])
      .select();

    if (facErr || !facs) {
      console.error('[Supabase Insert Error] demo facilities:', facErr?.message);
      return { success: false, error: facErr?.message || 'Failed to insert demo facilities' };
    }

    const hdfc = facs.find((f: any) => f.bank_name === 'HDFC Bank');
    const icici = facs.find((f: any) => f.bank_name === 'ICICI Bank');
    const sbi = facs.find((f: any) => f.bank_name === 'State Bank of India');

    // 2. Insert Rate Schedules into Supabase
    const ratesToInsert = [];
    if (hdfc) {
      ratesToInsert.push(
        { facility_id: hdfc.id, annual_rate_pct: 9.75, effective_date: '2024-01-01' },
        { facility_id: hdfc.id, annual_rate_pct: 9.25, effective_date: today }
      );
    }
    if (icici) {
      ratesToInsert.push(
        { facility_id: icici.id, annual_rate_pct: 11.2, effective_date: '2024-01-01' },
        { facility_id: icici.id, annual_rate_pct: 10.85, effective_date: today }
      );
    }
    if (sbi) {
      ratesToInsert.push({ facility_id: sbi.id, annual_rate_pct: 8.65, effective_date: '2024-01-01' });
    }

    if (ratesToInsert.length > 0) {
      await supabase.from('rate_schedules').insert(ratesToInsert);
    }

    // 3. Insert Balance Snapshots into Supabase
    const snapshotsToInsert = [];
    if (hdfc) {
      snapshotsToInsert.push({
        facility_id: hdfc.id,
        value_date: today,
        balance_amount: 3250000, // ₹32.50 Lakhs
        notes: 'Post monthly payroll drawdown',
      });
    }
    if (icici) {
      snapshotsToInsert.push({
        facility_id: icici.id,
        value_date: today,
        balance_amount: 1840000, // ₹18.40 Lakhs
        notes: 'Supplier invoices cleared',
      });
    }
    if (sbi) {
      snapshotsToInsert.push({
        facility_id: sbi.id,
        value_date: today,
        balance_amount: 9800000, // ₹98.00 Lakhs
        notes: 'Tranche 2 disbursement balance',
      });
    }

    if (snapshotsToInsert.length > 0) {
      await supabase.from('balance_snapshots').insert(snapshotsToInsert);
    }

    await fetchSupabaseData();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('[Supabase Exception] loadSampleCommercialData:', err);
    return { success: false, error: err?.message || 'Failed to load sample data' };
  }
}
