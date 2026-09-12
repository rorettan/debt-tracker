export type FacilityType = 'OVERDRAFT' | 'CHANNEL_FINANCE' | 'TERM_LOAN';
export type FacilityStatus = 'ACTIVE' | 'CLOSED';

export interface Facility {
  id: string;
  bank_name: string;
  facility_name: string;
  facility_type: FacilityType;
  sanction_limit: number;
  status: FacilityStatus;
  created_at: string;
}

export interface RateSchedule {
  id: string;
  facility_id: string;
  annual_rate_pct: number;
  effective_date: string; // ISO date string: YYYY-MM-DD
}

export interface BalanceSnapshot {
  id: string;
  facility_id: string;
  value_date: string; // ISO date string: YYYY-MM-DD
  balance_amount: number;
  notes?: string;
  entry_timestamp: string;
}

export interface FacilityInterestSummary {
  facility: Facility;
  currentBalance: number;
  currentAPR: number;
  rateEffectiveDate: string;
  lastSnapshotDate: string | null;
  dailyBurn: number;
  weeklyBurn: number;
  monthlyBurn: number;
  annualBurn: number;
  utilizationPct: number;
  costPerLakhPerDay: number;
}

export interface PortfolioSummary {
  totalBalance: number;
  totalLimit: number;
  totalDailyBurn: number;
  totalWeeklyBurn: number;
  totalMonthlyBurn: number;
  totalAnnualBurn: number;
  blendedAPR: number;
  activeFacilitiesCount: number;
  closedFacilitiesCount: number;
  utilizationPct: number;
}

export interface PaydownRecommendation {
  facility: Facility;
  apr: number;
  currentBalance: number;
  dailyBurn: number;
  costPerLakhPerDay: number;
  potentialDailySavingPerLakh: number;
  reason: string;
}
