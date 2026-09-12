import React from 'react';
import { FacilityInterestSummary } from '@/types/debt';
import { formatINR } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Flame,
  PlusCircle,
  Clock,
  History,
  TrendingDown,
  Building,
} from 'lucide-react';

interface ActiveFacilitiesGridProps {
  summaries: FacilityInterestSummary[];
  onQuickLog: (facilityId: string) => void;
  onManageRates: (facilityId: string) => void;
  onViewHistory: (facilityId: string) => void;
}

const FACILITY_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  OVERDRAFT: {
    label: 'Overdraft',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  CHANNEL_FINANCE: {
    label: 'Channel Finance',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  TERM_LOAN: {
    label: 'Term Loan',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export const ActiveFacilitiesGrid: React.FC<ActiveFacilitiesGridProps> = ({
  summaries,
  onQuickLog,
  onManageRates,
  onViewHistory,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Active Credit Facilities ({summaries.length})
          </h3>
          <p className="text-xs text-slate-500">Live balances, current APRs, and real-time interest burn</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((item) => {
          const {
            facility,
            currentBalance,
            currentAPR,
            dailyBurn,
            utilizationPct,
            costPerLakhPerDay,
            lastSnapshotDate,
          } = item;

          const typeMeta = FACILITY_TYPE_LABELS[facility.facility_type] || {
            label: facility.facility_type,
            color: 'bg-slate-100 text-slate-700 border-slate-200',
          };

          const isOverLimit = currentBalance > facility.sanction_limit && facility.sanction_limit > 0;

          return (
            <Card
              key={facility.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Bank & Type */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" />
                      {facility.bank_name}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                      {facility.facility_name}
                    </h4>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 shrink-0 ${typeMeta.color}`}
                  >
                    {typeMeta.label}
                  </Badge>
                </div>

                {/* Balance & Sanction Limit */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Current Balance</span>
                    <span className="text-[11px] font-mono">
                      Limit: {formatINR(facility.sanction_limit, false)}
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                    {formatINR(currentBalance)}
                  </div>

                  {/* Utilization bar */}
                  <div className="pt-1.5">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Utilization</span>
                      <span
                        className={`font-mono font-semibold ${
                          isOverLimit
                            ? 'text-rose-600'
                            : utilizationPct > 80
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {utilizationPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverLimit
                            ? 'bg-rose-600'
                            : utilizationPct > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, utilizationPct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Rate & Daily Burn Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                    <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                      Current APR
                    </div>
                    <div className="text-lg font-black font-mono text-emerald-900 mt-0.5">
                      {currentAPR > 0 ? `${currentAPR}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      ₹{costPerLakhPerDay.toFixed(2)}/day / L
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-rose-800 tracking-wider">
                      <span>Daily Burn</span>
                      <Flame className="w-3 h-3 text-rose-500" />
                    </div>
                    <div className="text-lg font-black font-mono text-rose-700 mt-0.5">
                      {formatINR(dailyBurn)}
                    </div>
                    <div className="text-[10px] text-rose-600 mt-0.5">
                      {formatINR(dailyBurn * 30, false)}/mo
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Quick Log & Tools */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lastSnapshotDate ? `Valued: ${lastSnapshotDate}` : 'No snapshot recorded'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewHistory(facility.id)}
                    className="text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <History className="w-3 h-3" />
                    Logs
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManageRates(facility.id)}
                    className="w-full text-xs font-medium h-10 touch-target-48 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                  >
                    Rates ({currentAPR}%)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onQuickLog(facility.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 touch-target-48 rounded-lg shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                    Quick Log
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
