import { supabase } from '@/integrations/supabase/client';
import { BalanceSnapshot, Facility, RateSchedule } from '@/types/debt';

const CHANGE_EVENT = 'debt_tracker_supabase_changed';

// In-memory local cache populated from Supabase for instant rendering
let cachedFacilities: Facility[] = [];
let cachedRateSchedules: RateSchedule[] = [];
let cachedSnapshots: BalanceSnapshot[] = [];
let isInitialized = false;

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

/**
 * Fetch fresh data directly from Supabase tables
 */
export async function fetchSupabaseData(): Promise<{
  facilities: Facility[];
  rateSchedules: RateSchedule[];
  snapshots: BalanceSnapshot[];
}> {
  try {
    const [facRes, ratesRes, snapRes] = await Promise.all([
      supabase.from('facilities').select('*').order('created_at', { ascending: false }),
      supabase.from('rate_schedules').select('*').order('effective_date', { ascending: false }),
      supabase.from('balance_snapshots').select('*').order('value_date', { ascending: false }),
    ]);

    if (facRes.error) {
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

    isInitialized = true;
    emitChange();
  } catch (err) {
    console.error('Unexpected error during Supabase sync:', err);
  }

  return {
    facilities: cachedFacilities,
    rateSchedules: cachedRateSchedules,
    snapshots: cachedSnapshots,
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

  // Initial load
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
): Promise<Facility | null> {
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
      return null;
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

    // Optimistically update cache
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
    return newFacility;
  } catch (err) {
    console.error('Error saving facility:', err);
    return null;
  }
}

export async function updateFacility(
  id: string,
  updates: Partial<Facility>
): Promise<Facility | null> {
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
      return null;
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
    return updated;
  } catch (err) {
    console.error('Error updating facility:', err);
    return null;
  }
}

export async function deleteFacility(id: string): Promise<void> {
  try {
    // Postgres foreign keys with ON DELETE CASCADE will handle rate_schedules and balance_snapshots
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete facility in Supabase:', error.message);
      return;
    }

    cachedFacilities = cachedFacilities.filter((f) => f.id !== id);
    cachedRateSchedules = cachedRateSchedules.filter((r) => r.facility_id !== id);
    cachedSnapshots = cachedSnapshots.filter((s) => s.facility_id !== id);
    emitChange();
  } catch (err) {
    console.error('Error deleting facility:', err);
  }
}

// Rate Schedule Operations with Supabase
export async function saveRateSchedule(
  schedule: Omit<RateSchedule, 'id'>
): Promise<RateSchedule | null> {
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
      return null;
    }

    const newSchedule: RateSchedule = {
      id: data.id,
      facility_id: data.facility_id,
      annual_rate_pct: Number(data.annual_rate_pct),
      effective_date: data.effective_date,
    };

    cachedRateSchedules = [newSchedule, ...cachedRateSchedules];
    emitChange();
    return newSchedule;
  } catch (err) {
    console.error('Error saving rate schedule:', err);
    return null;
  }
}

export async function deleteRateSchedule(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('rate_schedules').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete rate schedule in Supabase:', error.message);
      return;
    }

    cachedRateSchedules = cachedRateSchedules.filter((r) => r.id !== id);
    emitChange();
  } catch (err) {
    console.error('Error deleting rate schedule:', err);
  }
}

// Balance Snapshot Operations with Supabase
export async function saveSnapshot(
  snapshot: Omit<BalanceSnapshot, 'id' | 'entry_timestamp'>
): Promise<BalanceSnapshot | null> {
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
      return null;
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
    return newSnapshot;
  } catch (err) {
    console.error('Error saving balance snapshot:', err);
    return null;
  }
}

export async function deleteSnapshot(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('balance_snapshots').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete balance snapshot in Supabase:', error.message);
      return;
    }

    cachedSnapshots = cachedSnapshots.filter((s) => s.id !== id);
    emitChange();
  } catch (err) {
    console.error('Error deleting balance snapshot:', err);
  }
}

// Clean Slate & Sample Demo Loader with Supabase
export async function clearAllData(): Promise<void> {
  try {
    await supabase.from('balance_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('rate_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('facilities').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    cachedFacilities = [];
    cachedRateSchedules = [];
    cachedSnapshots = [];
    emitChange();
  } catch (err) {
    console.error('Error clearing data in Supabase:', err);
  }
}

export async function loadSampleCommercialData(): Promise<void> {
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
      return;
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
  } catch (err) {
    console.error('Error loading sample data to Supabase:', err);
  }
}
