import { BalanceSnapshot, Facility, RateSchedule } from '@/types/debt';

const STORAGE_KEYS = {
  FACILITIES: 'debt_tracker_facilities_v1',
  RATE_SCHEDULES: 'debt_tracker_rates_v1',
  SNAPSHOTS: 'debt_tracker_snapshots_v1',
};

const CHANGE_EVENT = 'debt_tracker_data_changed';

function emitChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function subscribeToDataChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get raw arrays from localStorage
export function getStoredFacilities(): Facility[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FACILITIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStoredRateSchedules(): RateSchedule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RATE_SCHEDULES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStoredSnapshots(): BalanceSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Facility Operations
export function saveFacility(facility: Omit<Facility, 'id' | 'created_at'>, initialApr?: number): Facility {
  const facilities = getStoredFacilities();
  const id = generateId();
  const now = new Date().toISOString();
  const newFacility: Facility = {
    ...facility,
    id,
    created_at: now,
  };

  facilities.push(newFacility);
  localStorage.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(facilities));

  if (initialApr && initialApr > 0) {
    saveRateSchedule({
      facility_id: id,
      annual_rate_pct: initialApr,
      effective_date: new Date().toISOString().split('T')[0],
    });
  }

  emitChange();
  return newFacility;
}

export function updateFacility(id: string, updates: Partial<Facility>): Facility | null {
  const facilities = getStoredFacilities();
  const index = facilities.findIndex((f) => f.id === id);
  if (index === -1) return null;

  facilities[index] = { ...facilities[index], ...updates };
  localStorage.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(facilities));
  emitChange();
  return facilities[index];
}

export function deleteFacility(id: string): void {
  const facilities = getStoredFacilities().filter((f) => f.id !== id);
  const rates = getStoredRateSchedules().filter((r) => r.facility_id !== id);
  const snapshots = getStoredSnapshots().filter((s) => s.facility_id !== id);

  localStorage.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(facilities));
  localStorage.setItem(STORAGE_KEYS.RATE_SCHEDULES, JSON.stringify(rates));
  localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
  emitChange();
}

// Rate Schedule Operations
export function saveRateSchedule(schedule: Omit<RateSchedule, 'id'>): RateSchedule {
  const rates = getStoredRateSchedules();
  const newSchedule: RateSchedule = {
    ...schedule,
    id: generateId(),
  };

  rates.push(newSchedule);
  localStorage.setItem(STORAGE_KEYS.RATE_SCHEDULES, JSON.stringify(rates));
  emitChange();
  return newSchedule;
}

export function deleteRateSchedule(id: string): void {
  const rates = getStoredRateSchedules().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.RATE_SCHEDULES, JSON.stringify(rates));
  emitChange();
}

// Balance Snapshot Operations
export function saveSnapshot(snapshot: Omit<BalanceSnapshot, 'id' | 'entry_timestamp'>): BalanceSnapshot {
  const snapshots = getStoredSnapshots();
  const newSnapshot: BalanceSnapshot = {
    ...snapshot,
    id: generateId(),
    entry_timestamp: new Date().toISOString(),
  };

  snapshots.push(newSnapshot);
  localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
  emitChange();
  return newSnapshot;
}

export function deleteSnapshot(id: string): void {
  const snapshots = getStoredSnapshots().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
  emitChange();
}

// Clean Slate & Sample Demo Loader
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.FACILITIES);
  localStorage.removeItem(STORAGE_KEYS.RATE_SCHEDULES);
  localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
  emitChange();
}

export function loadSampleCommercialData(): void {
  const today = new Date().toISOString().split('T')[0];

  const sampleFacilities: Facility[] = [
    {
      id: 'fac_hdfc_od',
      bank_name: 'HDFC Bank',
      facility_name: 'Working Capital Overdraft',
      facility_type: 'OVERDRAFT',
      sanction_limit: 5000000, // ₹50 Lakhs
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      id: 'fac_icici_cf',
      bank_name: 'ICICI Bank',
      facility_name: 'Vendor Channel Financing',
      facility_type: 'CHANNEL_FINANCE',
      sanction_limit: 3000000, // ₹30 Lakhs
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    {
      id: 'fac_sbi_tl',
      bank_name: 'State Bank of India',
      facility_name: 'Plant Expansion Term Loan',
      facility_type: 'TERM_LOAN',
      sanction_limit: 12500000, // ₹1.25 Crore
      status: 'ACTIVE',
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
  ];

  const sampleRates: RateSchedule[] = [
    {
      id: 'rate_1',
      facility_id: 'fac_hdfc_od',
      annual_rate_pct: 9.75,
      effective_date: '2024-01-01',
    },
    {
      id: 'rate_2',
      facility_id: 'fac_hdfc_od',
      annual_rate_pct: 9.25,
      effective_date: today,
    },
    {
      id: 'rate_3',
      facility_id: 'fac_icici_cf',
      annual_rate_pct: 11.2,
      effective_date: '2024-01-01',
    },
    {
      id: 'rate_4',
      facility_id: 'fac_icici_cf',
      annual_rate_pct: 10.85,
      effective_date: today,
    },
    {
      id: 'rate_5',
      facility_id: 'fac_sbi_tl',
      annual_rate_pct: 8.65,
      effective_date: '2024-01-01',
    },
  ];

  const sampleSnapshots: BalanceSnapshot[] = [
    {
      id: 'snap_1',
      facility_id: 'fac_hdfc_od',
      value_date: today,
      balance_amount: 3250000, // ₹32.50 Lakhs
      notes: 'Post monthly payroll drawdown',
      entry_timestamp: new Date().toISOString(),
    },
    {
      id: 'snap_2',
      facility_id: 'fac_icici_cf',
      value_date: today,
      balance_amount: 1840000, // ₹18.40 Lakhs
      notes: 'Supplier invoices cleared',
      entry_timestamp: new Date().toISOString(),
    },
    {
      id: 'snap_3',
      facility_id: 'fac_sbi_tl',
      value_date: today,
      balance_amount: 9800000, // ₹98.00 Lakhs
      notes: 'Tranche 2 disbursement balance',
      entry_timestamp: new Date().toISOString(),
    },
  ];

  localStorage.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(sampleFacilities));
  localStorage.setItem(STORAGE_KEYS.RATE_SCHEDULES, JSON.stringify(sampleRates));
  localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(sampleSnapshots));
  emitChange();
}
