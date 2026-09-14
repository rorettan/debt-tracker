import React, { useState } from 'react';
import { useDebtData } from '@/hooks/use-debt-data';
import { ExecutiveHeader } from '@/components/dashboard/ExecutiveHeader';
import { BurnMetrics } from '@/components/dashboard/BurnMetrics';
import { PaydownPriorityBanner } from '@/components/dashboard/PaydownPriorityBanner';
import { DebtBreakdownChart } from '@/components/dashboard/DebtBreakdownChart';
import { ActiveFacilitiesGrid } from '@/components/dashboard/ActiveFacilitiesGrid';
import { FacilityManagement } from '@/components/facilities/FacilityManagement';
import { BalanceLogModal } from '@/components/modals/BalanceLogModal';
import { FacilityFormModal } from '@/components/facilities/FacilityFormModal';
import { RateScheduleModal } from '@/components/facilities/RateScheduleModal';
import { SnapshotHistoryModal } from '@/components/history/SnapshotHistoryModal';
import { PaydownSimulator } from '@/components/tools/PaydownSimulator';
import { EmptyStateIllustration } from '@/components/brand/EmptyStateIllustration';
import { Facility } from '@/types/debt';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Building2,
  History,
  Plus,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';

export default function IndexPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState<'dashboard' | 'facilities' | 'history'>(
    'dashboard'
  );

  // Data hook
  const {
    isLoaded,
    facilities,
    activeFacilities,
    rateSchedules,
    snapshots,
    asOfDate,
    facilitySummaries,
    activeSummaries,
    portfolioSummary,
    paydownPriority,
    actions,
  } = useDebtData(selectedDate);

  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedFacilityForLog, setSelectedFacilityForLog] = useState<string | undefined>(undefined);

  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [facilityToEdit, setFacilityToEdit] = useState<Facility | null>(null);

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [facilityForRates, setFacilityForRates] = useState<Facility | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [facilityForHistory, setFacilityForHistory] = useState<string | null>(null);

  const hasFacilities = facilities.length > 0;

  const handleOpenQuickLog = (facId?: string) => {
    setSelectedFacilityForLog(facId);
    setIsLogModalOpen(true);
  };

  const handleOpenAddFacility = () => {
    setFacilityToEdit(null);
    setIsFacilityModalOpen(true);
  };

  const handleEditFacility = (facility: Facility) => {
    setFacilityToEdit(facility);
    setIsFacilityModalOpen(true);
  };

  const handleOpenRateSchedule = (facility: Facility) => {
    setFacilityForRates(facility);
    setIsRateModalOpen(true);
  };

  const handleOpenHistory = (facId?: string) => {
    setFacilityForHistory(facId || null);
    setIsHistoryModalOpen(true);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            Initializing DebtTracker Engine...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500/20">
      {/* Executive Header */}
      <ExecutiveHeader
        asOfDate={asOfDate}
        onDateChange={setSelectedDate}
        onOpenQuickLog={() => handleOpenQuickLog()}
        onOpenAddFacility={handleOpenAddFacility}
        hasFacilities={hasFacilities}
        onLoadSampleData={async () => {
          const res = await actions.loadSampleCommercialData();
          if (res?.success) {
            toast.success('Demo commercial portfolio loaded to Supabase');
          } else {
            toast.error(res?.error || 'Failed to load demo data');
          }
        }}
        onClearData={async () => {
          const res = await actions.clearAllData();
          if (res?.success) {
            toast.success('All portfolio data cleared from Supabase');
          }
        }}
        onManualSync={async () => {
          const res = await actions.refreshData();
          if (res.error) {
            toast.error(`Sync error: ${res.error}`);
          } else {
            toast.success('Live sync complete with Supabase');
          }
        }}
      />

      {/* Primary Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-[57px] z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between overflow-x-auto no-scrollbar">
            <nav className="flex space-x-2 py-2" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all touch-target-48 sm:h-10 ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Executive Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('facilities')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all touch-target-48 sm:h-10 ${
                  activeTab === 'facilities'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Credit Facilities & Rates</span>
                {facilities.length > 0 && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === 'facilities'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {facilities.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all touch-target-48 sm:h-10 ${
                  activeTab === 'history'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Ledger</span>
                {snapshots.length > 0 && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === 'history'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {snapshots.length}
                  </span>
                )}
              </button>
            </nav>

            {hasFacilities && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Live Daily Interpolation Active
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* EMPTY STATE: If no facilities exist yet */}
        {!hasFacilities ? (
          <div className="my-6 max-w-2xl mx-auto text-center bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-sm">
            <div className="flex justify-center mb-4">
              <EmptyStateIllustration className="w-48 h-48 sm:w-56 sm:h-56" />
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              Clean Ledger Initialized
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              Zero Commercial Debt Configured
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              Start tracking Overdraft, Channel Financing, and Term Loans. Get real-time daily interest
              burn computations, paydown priority algorithms, and cost per Lakh metrics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button
                onClick={handleOpenAddFacility}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm h-12 px-6 rounded-xl touch-target-48 shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Facility
              </Button>

              <Button
                variant="outline"
                onClick={actions.loadSampleCommercialData}
                className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm h-12 px-5 rounded-xl touch-target-48"
              >
                <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
                Load Demo Commercial Portfolio
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: EXECUTIVE DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Top Banner & Horizontal Burn Metric Cards */}
                <BurnMetrics summary={portfolioSummary} />

                {/* Paydown Priority Banner */}
                {paydownPriority && (
                  <PaydownPriorityBanner
                    recommendation={paydownPriority}
                    onQuickLogForFacility={(id) => handleOpenQuickLog(id)}
                  />
                )}

                {/* Active Facilities Grid */}
                <ActiveFacilitiesGrid
                  summaries={activeSummaries}
                  onQuickLog={(id) => handleOpenQuickLog(id)}
                  onManageRates={(id) => {
                    const fac = facilities.find((f) => f.id === id);
                    if (fac) handleOpenRateSchedule(fac);
                  }}
                  onViewHistory={(id) => handleOpenHistory(id)}
                />

                {/* Debt Breakdown Donut Chart */}
                <DebtBreakdownChart
                  summaries={activeSummaries}
                  totalBalance={portfolioSummary.totalBalance}
                />

                {/* What-If Paydown Simulator */}
                {portfolioSummary.totalBalance > 0 && (
                  <PaydownSimulator summaries={activeSummaries} />
                )}
              </div>
            )}

            {/* VIEW 2: FACILITY & RATE SCHEDULE GOVERNANCE */}
            {activeTab === 'facilities' && (
              <FacilityManagement
                facilities={facilities}
                summaries={facilitySummaries}
                rateSchedules={rateSchedules}
                onOpenCreateFacility={handleOpenAddFacility}
                onEditFacility={handleEditFacility}
                onOpenRateSchedule={handleOpenRateSchedule}
                onToggleFacilityStatus={async (id, curStatus) => {
                  const newStatus = curStatus === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
                  const res = await actions.updateFacility(id, { status: newStatus });
                  if (res?.error) {
                    toast.error(`Failed to update status: ${res.error}`);
                  } else {
                    toast.success(newStatus === 'ACTIVE' ? 'Facility reopened' : 'Facility archived');
                  }
                }}
                onDeleteFacility={async (id) => {
                  const res = await actions.deleteFacility(id);
                  if (res?.error) {
                    toast.error(`Failed to delete facility: ${res.error}`);
                  } else {
                    toast.success('Facility removed from Supabase');
                  }
                }}
              />
            )}

            {/* VIEW 3: AUDIT LEDGER & SNAPSHOTS */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-700" />
                      Balance Snapshot Audit Trail
                    </h2>
                    <p className="text-xs text-slate-500">
                      Complete log of historical balance submissions and interpolated interest rate schedules.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenQuickLog()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 px-4 rounded-lg shadow-sm touch-target-48"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Log New Balance
                    </Button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {snapshots.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-sm font-semibold text-slate-700">No balance snapshots logged yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Use the "Log Balance" button to record value-dated balances for any facility.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Value Date</th>
                            <th className="py-3 px-4">Facility & Bank</th>
                            <th className="py-3 px-4 text-right">Balance (₹)</th>
                            <th className="py-3 px-4">Notes</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {snapshots
                            .slice()
                            .sort((a, b) => b.value_date.localeCompare(a.value_date))
                            .map((snap) => {
                              const fac = facilities.find((f) => f.id === snap.facility_id);
                              return (
                                <tr key={snap.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                    {snap.value_date}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-900">
                                      {fac ? fac.facility_name : 'Unknown Facility'}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {fac?.bank_name} • {fac?.facility_type}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                                    {new Intl.NumberFormat('en-IN', {
                                      style: 'currency',
                                      currency: 'INR',
                                    }).format(snap.balance_amount)}
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                                    {snap.notes || <span className="text-slate-300 italic">—</span>}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (window.confirm('Delete this balance snapshot?')) {
                                          actions.deleteSnapshot(snap.id);
                                        }
                                      }}
                                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 px-2"
                                    >
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">DebtTracker</span>
            <span>• Commercial Debt & Daily Interest Intelligence</span>
          </div>
          <div className="flex items-center gap-3">
            {hasFacilities && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Clear all data and reset to a completely clean state?'
                    )
                  ) {
                    actions.clearAllData();
                  }
                }}
                className="text-slate-400 hover:text-rose-400 transition-colors underline"
              >
                Reset Clean Slate
              </button>
            )}
            <span className="text-slate-600">|</span>
            <span className="font-mono text-[11px] text-emerald-400">
              Formula: (Balance × Rate%) / 365
            </span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Balance Log Sheet Modal */}
      <BalanceLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        facilities={activeFacilities}
        rateSchedules={rateSchedules}
        initialFacilityId={selectedFacilityForLog}
        onSave={async (snapshotData) => {
          const res = await actions.saveSnapshot(snapshotData);
          if (res.error) {
            toast.error(`Database error: ${res.error}`);
            return { success: false, error: res.error };
          }
          toast.success('Balance snapshot saved to Supabase');
          return { success: true };
        }}
      />

      {/* 2. Facility Create / Edit Modal */}
      <FacilityFormModal
        isOpen={isFacilityModalOpen}
        onClose={() => setIsFacilityModalOpen(false)}
        facilityToEdit={facilityToEdit}
        onSave={async (facilityData, initialApr) => {
          if (facilityToEdit) {
            const res = await actions.updateFacility(facilityToEdit.id, facilityData);
            if (res.error) {
              toast.error(`Database error: ${res.error}`);
              return { success: false, error: res.error };
            }
            toast.success('Facility updated in Supabase');
            return { success: true };
          } else {
            const res = await actions.saveFacility(facilityData, initialApr);
            if (res.error) {
              toast.error(`Database error: ${res.error}`);
              return { success: false, error: res.error };
            }
            toast.success('New facility created in Supabase');
            return { success: true };
          }
        }}
      />

      {/* 3. Rate Schedule Modal */}
      <RateScheduleModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        facility={facilityForRates}
        rateSchedules={rateSchedules}
        onAddRate={async (rateData) => {
          const res = await actions.saveRateSchedule(rateData);
          if (res.error) {
            toast.error(`Failed to add rate: ${res.error}`);
            return { success: false, error: res.error };
          }
          toast.success('Rate revision added to Supabase');
          return { success: true };
        }}
        onDeleteRate={async (id) => {
          const res = await actions.deleteRateSchedule(id);
          if (res.error) {
            toast.error(`Failed to delete rate: ${res.error}`);
            return { success: false, error: res.error };
          }
          toast.success('Rate revision deleted');
          return { success: true };
        }}
      />

      {/* 4. Snapshot History Modal (Per-Facility drill-down) */}
      <SnapshotHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        facilityId={facilityForHistory}
        facilities={facilities}
        snapshots={snapshots}
        onDeleteSnapshot={async (id) => {
          const res = await actions.deleteSnapshot(id);
          if (res.error) {
            toast.error(`Failed to delete snapshot: ${res.error}`);
          } else {
            toast.success('Snapshot deleted from Supabase');
          }
        }}
      />
    </div>
  );
}
