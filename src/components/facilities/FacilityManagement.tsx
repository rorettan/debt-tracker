import React, { useState } from 'react';
import { Facility, FacilityInterestSummary, RateSchedule } from '@/types/debt';
import { formatINR } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Plus,
  Edit2,
  TrendingUp,
  Search,
  CheckCircle,
  Archive,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface FacilityManagementProps {
  facilities: Facility[];
  summaries: FacilityInterestSummary[];
  rateSchedules: RateSchedule[];
  onOpenCreateFacility: () => void;
  onEditFacility: (facility: Facility) => void;
  onOpenRateSchedule: (facility: Facility) => void;
  onToggleFacilityStatus: (id: string, currentStatus: 'ACTIVE' | 'CLOSED') => void;
  onDeleteFacility: (id: string) => void;
}

export const FacilityManagement: React.FC<FacilityManagementProps> = ({
  facilities,
  summaries,
  rateSchedules,
  onOpenCreateFacility,
  onEditFacility,
  onOpenRateSchedule,
  onToggleFacilityStatus,
  onDeleteFacility,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFacilities = facilities.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.bank_name.toLowerCase().includes(q) ||
        f.facility_name.toLowerCase().includes(q) ||
        f.facility_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = facilities.filter((f) => f.status === 'ACTIVE').length;
  const closedCount = facilities.filter((f) => f.status === 'CLOSED').length;

  return (
    <div className="space-y-4">
      {/* Top Controls: Title, Filter Pills, Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-700" />
            Credit Facilities & Rate Governance
          </h2>
          <p className="text-xs text-slate-500">
            Configure banking lines, sanction limits, operational status, and APR ladders.
          </p>
        </div>

        <Button
          onClick={onOpenCreateFacility}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 px-4 rounded-lg shadow-sm touch-target-48 sm:w-auto w-full"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Facility
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all touch-target-48 sm:h-8 flex items-center justify-center ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({facilities.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all touch-target-48 sm:h-8 flex items-center justify-center ${
              statusFilter === 'ACTIVE'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all touch-target-48 sm:h-8 flex items-center justify-center ${
              statusFilter === 'CLOSED'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Closed ({closedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bank or facility..."
            className="pl-9 h-9 text-xs border-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* Facilities List */}
      {filteredFacilities.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-slate-200 rounded-xl">
          <p className="text-sm font-semibold text-slate-700">No matching facilities found</p>
          <p className="text-xs text-slate-400 mt-1">
            {statusFilter !== 'ALL'
              ? `No ${statusFilter.toLowerCase()} facilities in your portfolio.`
              : 'Try searching with a different term or register a new credit line.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredFacilities.map((facility) => {
            const summary = summaries.find((s) => s.facility.id === facility.id);
            const balance = summary ? summary.currentBalance : 0;
            const apr = summary ? summary.currentAPR : 0;
            const dailyBurn = summary ? summary.dailyBurn : 0;

            const schedulesCount = rateSchedules.filter(
              (r) => r.facility_id === facility.id
            ).length;

            const isActive = facility.status === 'ACTIVE';

            return (
              <Card
                key={facility.id}
                className={`p-4 sm:p-5 bg-white border rounded-xl transition-all shadow-sm ${
                  isActive ? 'border-slate-200/90' : 'border-slate-200 bg-slate-50/70 opacity-80'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left Column: Bank, Name, Badges */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        {facility.bank_name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono uppercase bg-slate-100 border-slate-200 text-slate-700"
                      >
                        {facility.facility_type.replace('_', ' ')}
                      </Badge>
                      <Badge
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-200 border-slate-300'
                        }`}
                      >
                        {facility.status}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {facility.facility_name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                      <span>
                        Sanctioned Limit:{' '}
                        <strong className="text-slate-800">{formatINR(facility.sanction_limit, false)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Created:{' '}
                        {new Date(facility.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Current Metrics (Balance, APR, Daily Burn) */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs sm:min-w-[320px]">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium uppercase">
                        Current Debt
                      </span>
                      <p className="text-sm font-black font-mono text-slate-900 mt-0.5">
                        {formatINR(balance)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium uppercase">
                        Active Rate
                      </span>
                      <p className="text-sm font-black font-mono text-emerald-700 mt-0.5">
                        {apr}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium uppercase">
                        Daily Burn
                      </span>
                      <p className="text-sm font-black font-mono text-rose-700 mt-0.5">
                        {formatINR(dailyBurn)}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenRateSchedule(facility)}
                      className="h-9 text-xs font-semibold border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
                    >
                      <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Rates ({schedulesCount})
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditFacility(facility)}
                      className="h-9 text-xs font-semibold border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
                      title="Edit facility parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleFacilityStatus(facility.id, facility.status)}
                      className="h-9 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg"
                      title={isActive ? 'Deactivate / Close Facility' : 'Reopen Facility'}
                    >
                      {isActive ? (
                        <>
                          <Archive className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Close
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Reopen
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete facility "${facility.facility_name}" and its associated historical logs?`
                          )
                        ) {
                          onDeleteFacility(facility.id);
                        }
                      }}
                      className="h-9 w-9 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete facility"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
