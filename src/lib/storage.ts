import { supabase } from '@/integrations/supabase/client';
import { BalanceSnapshot, Facility, RateSchedule } from '@/types/debt';

const CHANGE_EVENT = 'debt_tracker_supabase_changed';
const LEGACY_STORAGE_KEYS = {
  FACILITIES: 'debt_tracker_facilities_v1',
  RATE_SCHEDULES: 'debt_tracker_rates_v1',
  SNAPSHOTS: 'debt_tracker_snapshots_v1',
};

// In-memory cache populated from Supabase
let cachedFacilities: Facility[] = [];
let cachedRateSchedules: RateSchedule[] = [];
let cachedSnapshots: BalanceSnapshot[] = [];
let lastSyncError: string | null = null;
let isSyncing = false;

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
 * Automatically migrate any legacy localStorage data from before the Supabase upgrade
 */
async function migrateLegacyLocalData(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const rawFac = localStorage.getItem(LEGACY_STORAGE_KEYS.FACILITIES);
    const rawRates = localStorage.getItem(LEGACY_STORAGE_KEYS.RATE_SCHEDULES);
    const rawSnaps = localStorage.getItem(LEGACY_STORAGE_KEYS.SNAPSHOTS);

    if (!rawFac) return;

    const legacyFacilities: any[] = JSON.parse(rawFac);
    if (!Array.isArray(legacyFacilities) || legacyFacilities.length === 0) return;

    console.log('[Supabase Migration] Found legacy local facilities to migrate:', legacyFacilities.length);

    const legacyRates: any[] = rawRates ? JSON.parse(rawRates) : [];
    const legacySnaps: any[] = rawSnaps ? JSON.parse(rawSnaps) : [];

    // Map old string IDs to newly generated UUIDs in Supabase
    for (const oldFac of legacyFacilities) {
      const { data: newFac, error: facErr } = await supabase
        .from('facilities')
        .insert({
          bank_name: oldFac.bank_name,
          facility_name: oldFac.facility_name,
          facility_type: oldFac.facility_type,
          sanction_limit: oldFac.sanction_limit,
          status: oldFac.status || 'ACTIVE',
        })
        .select()
        .single();

      if (facErr || !newFac) {
        console.error('[Supabase Migration] Error migrating facility:', facErr?.message);
        continue;
      }

      // Migrate corresponding rates
      const oldRatesForFac = legacyRates.filter((r) => r.facility_id === oldFac.id);
      for (const r of oldRatesForFac) {
        await supabase.from('rate_schedules').insert({
          facility_id: newFac.id,
          annual_rate_pct: r.annual_rate_pct,
          effective_date: r.effective_date,
        });
      }

      // Migrate corresponding snapshots
      const oldSnapsForFac = legacySnaps.filter((s) => s.facility_id === oldFac.id);
      for (const s of oldSnapsForFac) {
        await supabase.from('balance_snapshots').insert({
          facility_id: newFac.id,
          value_date: s.value_date,
          balance_amount: s.balance_amount,
          notes: s.notes || null,
        });
      }
    }

    // Clear legacy keys once successfully migrated to prevent duplicates
    localStorage.removeItem(LEGACY_STORAGE_KEYS.FACILITIES);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.RATE_SCHEDULES);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.SNAPSHOTS);
    console.log('[Supabase Migration] Legacy data migrated successfully and cleaned up.');
  } catch (err) {
    console.warn('[Supabase Migration] Error during legacy data check:', err);
  }
}

/**
 * Fetch fresh data directly from Supabase tables
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
    // Check if we need to migrate local phone data first
    await migrateLegacyLocalData();

    const [facRes, ratesRes, snapRes] = await Promise.all([
      supabase.from('facilities').select('*').order('created_at', { ascending: false }),
      supabase.from('rate_schedules').select('*').order('effective_date', { ascending: false }),
      supabase.from('balance_snapshots').select('*').order('value_date', { ascending: false }),
    ]);

    if (facRes.error) {
      lastSyncError = `Facilities: ${facRes.error.message}`;
      console.error('Error fetching facilities from Supabase:', facRes.error.message);
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
      lastSyncError = `Rates: ${ratesRes.error.message}`;
      console.error('Error fetching rate_schedules from Supabase:', ratesRes.error.message);
    } else if (ratesRes.data) {
      cachedRateSchedules = ratesRes.data.map((r: any) => ({
        id: r.id,
        facility_id: r.facility_id,
        annual_rate_pct: Number(r.annual_rate_pct),
        effective_date: r.effective_date,
      }));
    }

    if (snapRes.error) {
      lastSyncError = `Snapshots: ${snapRes.error.message}`;
      console.error('Error fetching balance_snapshots from Supabase:', snapRes.error.message);
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
    lastSyncError = err?.message || 'Network error connecting to Supabase';
    console.error('Unexpected error during Supabase sync:', err);
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

// Subscribe to Supabase Realtime channel for live multi-tab & multi-device sync
if (typeof window !== 'undefined') {
  const channel = supabase
    .channel('debt_tracker_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'facilities' },
      () => fetchSupabaseData()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rate_schedules' },
      () => fetchSupabaseData()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'balance_snapshots' },
      () => fetchSupabaseData()
    )
    .subscribe();

  // Initial fetch
  fetchSupabaseData();
}

// Synchronous getters from the active Supabase memory cache
export function getStoredFacilities(): Facility[] {
  return cachedFacilities;
}

export function getStoredRateSchedules(): RateSchedule[] {
  return cachedRateSchedules;
}

export function getStoredSnapshots(): BalanceSnapshot[] {
  return cachedSnapshots;
}

// Facility Operations with Supabase
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
      console.error('Failed to create facility in Supabase:', error.message);
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

    cachedFacilities = [newFacility, ...cachedFacilities];

    if (initialApr && initialApr > 0) {
      const today = new Date().toISOString().split('T')[0];
      await saveRateSchedule({
        facility_id: newFacility.id,
        annual_rate_pct: initialApr,
        effective_date: today,
      });
    }

    emitChange();
    await fetchSupabaseData();
    return { data: newFacility, error: null };
  } catch (err: any) {
    console.error('Error saving facility:', err);
    return { data: null, error: err?.message || 'Failed to save facility' };
  }
}

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
      console.error('Failed to update facility in Supabase:', error.message);
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

    cachedFacilities = cachedFacilities.map((f) => (f.id === id ? updated : f));
    emitChange();
    return { data: updated, error: null };
  } catch (err: any) {
    console.error('Error updating facility:', err);
    return { data: null, error: err?.message || 'Failed to update facility' };
  }
}

export async function deleteFacility(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete facility in Supabase:', error.message);
      return { success: false, error: error.message };
    }

    cachedFacilities = cachedFacilities.filter((f) => f.id !== id);
    cachedRateSchedules = cachedRateSchedules.filter((r) => r.facility_id !== id);
    cachedSnapshots = cachedSnapshots.filter((s) => s.facility_id !== id);
    emitChange();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error deleting facility:', err);
    return { success: false, error: err?.message || 'Failed to delete facility' };
  }
}

// Rate Schedule Operations with Supabase
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
      console.error('Failed to save rate schedule in Supabase:', error.message);
      return { data: null, error: error.message };
    }

    const newSchedule: RateSchedule = {
      id: data.id,
      facility_id: data.facility_id,
      annual_rate_pct: Number(data.annual_rate_pct),
      effective_date: data.effective_date,
    };

    cachedRateSchedules = [newSchedule, ...cachedRateSchedules];
    emitChange();
    return { data: newSchedule, error: null };
  } catch (err: any) {
    console.error('Error saving rate schedule:', err);
    return { data: null, error: err?.message || 'Failed to save rate schedule' };
  }
}

export async function deleteRateSchedule(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('rate_schedules').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete rate schedule in Supabase:', error.message);
      return { success: false, error: error.message };
    }

    cachedRateSchedules = cachedRateSchedules.filter((r) => r.id !== id);
    emitChange();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error deleting rate schedule:', err);
    return { success: false, error: err?.message || 'Failed to delete rate schedule' };
  }
}

// Balance Snapshot Operations with Supabase
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
      console.error('Failed to save balance snapshot in Supabase:', error.message);
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

    cachedSnapshots = [newSnapshot, ...cachedSnapshots];
    emitChange();
    return { data: newSnapshot, error: null };
  } catch (err: any) {
    console.error('Error saving balance snapshot:', err);
    return { data: null, error: err?.message || 'Failed to save snapshot' };
  }
}

export async function deleteSnapshot(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('balance_snapshots').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete balance snapshot in Supabase:', error.message);
      return { success: false, error: error.message };
    }

    cachedSnapshots = cachedSnapshots.filter((s) => s.id !== id);
    emitChange();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error deleting balance snapshot:', err);
    return { success: false, error: err?.message || 'Failed to delete snapshot' };
  }
}

// Clean Slate & Sample Demo Loader with Supabase
export async function clearAllData(): Promise<{ success: boolean; error: string | null }> {
  try {
    await supabase.from('balance_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('rate_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('facilities').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    cachedFacilities = [];
    cachedRateSchedules = [];
    cachedSnapshots = [];
    emitChange();
    return { success: true, error: null };
  } catch (err: any) {
    console.error('Error clearing data in Supabase:', err);
    return { success: false, error: err?.message || 'Failed to clear data' };
  }
}

export async function loadSampleCommercialData(): Promise<{ success: boolean; error: string | null }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Insert Facilities
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
      console.error('Error inserting sample facilities in Supabase:', facErr?.message);
      return { success: false, error: facErr?.message || 'Failed to insert demo facilities' };
    }

    const hdfc = facs.find((f: any) => f.bank_name === 'HDFC Bank');
    const icici = facs.find((f: any) => f.bank_name === 'ICICI Bank');
    const sbi = facs.find((f: any) => f.bank_name === 'State Bank of India');

    // 2. Insert Rates
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

    // 3. Insert Snapshots
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
    console.error('Error loading sample data to Supabase:', err);
    return { success: false, error: err?.message || 'Failed to load sample data' };
  }
}
