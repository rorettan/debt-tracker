import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Facility,
  FacilityInterestSummary,
  PortfolioSummary,
  RateSchedule,
  BalanceSnapshot,
  PaydownRecommendation,
} from '@/types/debt';
import {
  getStoredFacilities,
  getStoredRateSchedules,
  getStoredSnapshots,
  subscribeToDataChanges,
  saveFacility as apiSaveFacility,
  updateFacility as apiUpdateFacility,
  deleteFacility as apiDeleteFacility,
  saveRateSchedule as apiSaveRateSchedule,
  deleteRateSchedule as apiDeleteRateSchedule,
  saveSnapshot as apiSaveSnapshot,
  deleteSnapshot as apiDeleteSnapshot,
  clearAllData as apiClearAll,
  loadSampleCommercialData as apiLoadSample,
} from '@/lib/storage';
import {
  getFacilitySummary,
  getPortfolioSummary,
  getPaydownPriority,
} from '@/lib/calculations';

export function useDebtData(selectedDate?: string) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [rateSchedules, setRateSchedules] = useState<RateSchedule[]>([]);
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const asOfDate = selectedDate || today;

  const refreshData = useCallback(() => {
    setFacilities(getStoredFacilities());
    setRateSchedules(getStoredRateSchedules());
    setSnapshots(getStoredSnapshots());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToDataChanges(refreshData);
    return unsubscribe;
  }, [refreshData]);

  const activeFacilities = useMemo(
    () => facilities.filter((f) => f.status === 'ACTIVE'),
    [facilities]
  );

  const closedFacilities = useMemo(
    () => facilities.filter((f) => f.status === 'CLOSED'),
    [facilities]
  );

  const facilitySummaries: FacilityInterestSummary[] = useMemo(() => {
    return facilities.map((facility) =>
      getFacilitySummary(facility, asOfDate, rateSchedules, snapshots)
    );
  }, [facilities, asOfDate, rateSchedules, snapshots]);

  const activeSummaries = useMemo(
    () => facilitySummaries.filter((s) => s.facility.status === 'ACTIVE'),
    [facilitySummaries]
  );

  const portfolioSummary: PortfolioSummary = useMemo(() => {
    return getPortfolioSummary(facilities, asOfDate, rateSchedules, snapshots);
  }, [facilities, asOfDate, rateSchedules, snapshots]);

  const paydownPriority: PaydownRecommendation | null = useMemo(() => {
    return getPaydownPriority(facilities, asOfDate, rateSchedules, snapshots);
  }, [facilities, asOfDate, rateSchedules, snapshots]);

  return {
    isLoaded,
    facilities,
    activeFacilities,
    closedFacilities,
    rateSchedules,
    snapshots,
    asOfDate,
    facilitySummaries,
    activeSummaries,
    portfolioSummary,
    paydownPriority,
    actions: {
      saveFacility: apiSaveFacility,
      updateFacility: apiUpdateFacility,
      deleteFacility: apiDeleteFacility,
      saveRateSchedule: apiSaveRateSchedule,
      deleteRateSchedule: apiDeleteRateSchedule,
      saveSnapshot: apiSaveSnapshot,
      deleteSnapshot: apiDeleteSnapshot,
      clearAllData: apiClearAll,
      loadSampleCommercialData: apiLoadSample,
    },
  };
}
