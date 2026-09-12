import {
  BalanceSnapshot,
  Facility,
  FacilityInterestSummary,
  PaydownRecommendation,
  PortfolioSummary,
  RateSchedule,
} from '@/types/debt';

/**
 * Format any number to Indian Rupee standard format (e.g. ₹12,34,567.00)
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  };

  const formatted = new Intl.NumberFormat('en-IN', options).format(absAmount);
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Compact Indian Rupee format for charts and small badges (e.g. ₹1.25 Cr, ₹50.00 L)
 */
export function formatINRCompact(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    // Crores (1 Cr = 1,00,00,000)
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    // Lakhs (1 L = 1,00,000)
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    // Thousands
    return `${sign}₹${(abs / 1000).toFixed(1)} K`;
  }
  return `${sign}₹${abs.toFixed(0)}`;
}

/**
 * Format a raw numeric string with Indian comma grouping (for input displays)
 */
export function formatIndianNumberString(val: string | number): string {
  if (val === '' || val === undefined || val === null) return '';
  const cleanStr = val.toString().replace(/[^0-9.]/g, '');
  if (!cleanStr) return '';

  const parts = cleanStr.split('.');
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? `.${parts[1].slice(0, 2)}` : '';

  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const rest = integerPart.substring(0, integerPart.length - 3);
    integerPart = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  return `${integerPart}${decimalPart}`;
}

/**
 * Core Interest Calculations as specified:
 * - Daily Interest: (Balance * (Annual_Rate_Pct / 100)) / 365
 * - Weekly Interest: Daily Interest * 7
 * - Monthly Interest: Daily Interest * 30
 * - Annualized Interest: Daily Interest * 365
 */
export function calculateDailyInterest(balance: number, annualRatePct: number): number {
  if (balance <= 0 || annualRatePct <= 0) return 0;
  return (balance * (annualRatePct / 100)) / 365;
}

export function calculateWeeklyInterest(dailyInterest: number): number {
  return dailyInterest * 7;
}

export function calculateMonthlyInterest(dailyInterest: number): number {
  return dailyInterest * 30;
}

export function calculateAnnualInterest(dailyInterest: number): number {
  return dailyInterest * 365;
}

/**
 * Daily interest cost per ₹1,00,000 (1 Lakh)
 */
export function calculateCostPerLakhPerDay(annualRatePct: number): number {
  if (annualRatePct <= 0) return 0;
  return (100000 * (annualRatePct / 100)) / 365;
}

/**
 * Historical Interpolation:
 * For any date T, the applicable rate is the rate from the most recent rate schedule
 * where effective_date <= T.
 */
export function getApplicableRate(
  facilityId: string,
  asOfDate: string,
  rateSchedules: RateSchedule[]
): { rate: number; effectiveDate: string } {
  const facilityRates = rateSchedules.filter((r) => r.facility_id === facilityId);
  if (facilityRates.length === 0) {
    return { rate: 0, effectiveDate: asOfDate };
  }

  // Filter effective_date <= asOfDate and sort descending
  const applicable = facilityRates
    .filter((r) => r.effective_date <= asOfDate)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  if (applicable.length > 0) {
    return {
      rate: applicable[0].annual_rate_pct,
      effectiveDate: applicable[0].effective_date,
    };
  }

  // Fallback: if all rates are future, take the earliest available
  const earliest = [...facilityRates].sort((a, b) => a.effective_date.localeCompare(b.effective_date))[0];
  return {
    rate: earliest.annual_rate_pct,
    effectiveDate: earliest.effective_date,
  };
}

/**
 * Historical Interpolation:
 * For any date T, the balance is the balance from the most recent snapshot
 * where value_date <= T.
 */
export function getLatestBalanceSnapshot(
  facilityId: string,
  asOfDate: string,
  snapshots: BalanceSnapshot[]
): BalanceSnapshot | null {
  const facilitySnapshots = snapshots.filter((s) => s.facility_id === facilityId);
  if (facilitySnapshots.length === 0) return null;

  const applicable = facilitySnapshots
    .filter((s) => s.value_date <= asOfDate)
    .sort((a, b) => {
      const cmp = b.value_date.localeCompare(a.value_date);
      if (cmp !== 0) return cmp;
      return b.entry_timestamp.localeCompare(a.entry_timestamp);
    });

  return applicable.length > 0 ? applicable[0] : null;
}

/**
 * Get current summary for a single facility as of a given date (defaults to today)
 */
export function getFacilitySummary(
  facility: Facility,
  asOfDate: string,
  rateSchedules: RateSchedule[],
  snapshots: BalanceSnapshot[]
): FacilityInterestSummary {
  const latestSnapshot = getLatestBalanceSnapshot(facility.id, asOfDate, snapshots);
  const balance = latestSnapshot ? latestSnapshot.balance_amount : 0;
  const { rate, effectiveDate } = getApplicableRate(facility.id, asOfDate, rateSchedules);

  const dailyBurn = calculateDailyInterest(balance, rate);
  const weeklyBurn = calculateWeeklyInterest(dailyBurn);
  const monthlyBurn = calculateMonthlyInterest(dailyBurn);
  const annualBurn = calculateAnnualInterest(dailyBurn);
  const utilizationPct = facility.sanction_limit > 0 ? (balance / facility.sanction_limit) * 100 : 0;
  const costPerLakhPerDay = calculateCostPerLakhPerDay(rate);

  return {
    facility,
    currentBalance: balance,
    currentAPR: rate,
    rateEffectiveDate: effectiveDate,
    lastSnapshotDate: latestSnapshot ? latestSnapshot.value_date : null,
    dailyBurn,
    weeklyBurn,
    monthlyBurn,
    annualBurn,
    utilizationPct: Math.min(utilizationPct, 100),
    costPerLakhPerDay,
  };
}

/**
 * Aggregate summary across all facilities in portfolio
 */
export function getPortfolioSummary(
  facilities: Facility[],
  asOfDate: string,
  rateSchedules: RateSchedule[],
  snapshots: BalanceSnapshot[]
): PortfolioSummary {
  const activeFacilities = facilities.filter((f) => f.status === 'ACTIVE');
  const closedFacilities = facilities.filter((f) => f.status === 'CLOSED');

  let totalBalance = 0;
  let totalLimit = 0;
  let totalDailyBurn = 0;
  let weightedRateSum = 0;

  activeFacilities.forEach((facility) => {
    const summary = getFacilitySummary(facility, asOfDate, rateSchedules, snapshots);
    totalBalance += summary.currentBalance;
    totalLimit += facility.sanction_limit;
    totalDailyBurn += summary.dailyBurn;
    weightedRateSum += summary.currentBalance * summary.currentAPR;
  });

  const blendedAPR = totalBalance > 0 ? weightedRateSum / totalBalance : 0;
  const utilizationPct = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  return {
    totalBalance,
    totalLimit,
    totalDailyBurn,
    totalWeeklyBurn: calculateWeeklyInterest(totalDailyBurn),
    totalMonthlyBurn: calculateMonthlyInterest(totalDailyBurn),
    totalAnnualBurn: calculateAnnualInterest(totalDailyBurn),
    blendedAPR,
    activeFacilitiesCount: activeFacilities.length,
    closedFacilitiesCount: closedFacilities.length,
    utilizationPct: Math.min(utilizationPct, 100),
  };
}

/**
 * Paydown Priority Recommender:
 * Identifies the active facility with the highest APR, calculates daily interest cost per ₹1,00,000,
 * and gives clear actionable insight for commercial debt optimization.
 */
export function getPaydownPriority(
  facilities: Facility[],
  asOfDate: string,
  rateSchedules: RateSchedule[],
  snapshots: BalanceSnapshot[]
): PaydownRecommendation | null {
  const activeFacilities = facilities.filter((f) => f.status === 'ACTIVE');
  if (activeFacilities.length === 0) return null;

  const summaries = activeFacilities.map((facility) =>
    getFacilitySummary(facility, asOfDate, rateSchedules, snapshots)
  );

  // First check active facilities with balance > 0, highest APR first
  const withBalance = summaries.filter((s) => s.currentBalance > 0);
  const candidates = withBalance.length > 0 ? withBalance : summaries;

  // Sort by highest APR, then highest balance
  candidates.sort((a, b) => {
    if (b.currentAPR !== a.currentAPR) return b.currentAPR - a.currentAPR;
    return b.currentBalance - a.currentBalance;
  });

  const top = candidates[0];
  if (!top) return null;

  const costPerLakh = top.costPerLakhPerDay;
  // If there's another facility with lower APR, show potential savings difference
  const otherRates = summaries.map((s) => s.currentAPR).filter((r) => r < top.currentAPR);
  const lowestRate = otherRates.length > 0 ? Math.min(...otherRates) : null;
  const potentialDailySavingPerLakh =
    lowestRate !== null ? calculateCostPerLakhPerDay(top.currentAPR) - calculateCostPerLakhPerDay(lowestRate) : 0;

  return {
    facility: top.facility,
    apr: top.currentAPR,
    currentBalance: top.currentBalance,
    dailyBurn: top.dailyBurn,
    costPerLakhPerDay: costPerLakh,
    potentialDailySavingPerLakh,
    reason:
      top.currentBalance > 0
        ? `Highest interest rate at ${top.currentAPR}% APR. Prioritize allocating surplus cash flow to this facility to stop ₹${costPerLakh.toFixed(2)} daily bleed per ₹1,00,000 borrowed.`
        : `Highest APR line at ${top.currentAPR}%. Avoid drawing on this facility unless lower-cost credit is exhausted.`,
  };
}
