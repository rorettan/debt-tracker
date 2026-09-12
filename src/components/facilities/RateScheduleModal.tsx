import React, { useState } from 'react';
import { Facility, RateSchedule } from '@/types/debt';
import {
  calculateCostPerLakhPerDay,
  formatINR,
  getApplicableRate,
} from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface RateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: Facility | null;
  rateSchedules: RateSchedule[];
  onAddRate: (schedule: { facility_id: string; annual_rate_pct: number; effective_date: string }) => void;
  onDeleteRate: (id: string) => void;
}

export const RateScheduleModal: React.FC<RateScheduleModalProps> = ({
  isOpen,
  onClose,
  facility,
  rateSchedules,
  onAddRate,
  onDeleteRate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [newRate, setNewRate] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(todayStr);
  const [error, setError] = useState<string | null>(null);

  if (!facility) return null;

  const facilityRates = rateSchedules
    .filter((r) => r.facility_id === facility.id)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));

  const { rate: currentRate, effectiveDate: currentEffectiveDate } = getApplicableRate(
    facility.id,
    todayStr,
    rateSchedules
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rateNum = parseFloat(newRate);
    if (isNaN(rateNum) || rateNum <= 0 || rateNum > 100) {
      setError('Please enter a valid interest rate between 0.01% and 100%.');
      return;
    }

    if (!effectiveDate) {
      setError('Please choose an effective date.');
      return;
    }

    onAddRate({
      facility_id: facility.id,
      annual_rate_pct: rateNum,
      effective_date: effectiveDate,
    });

    setNewRate('');
    setEffectiveDate(todayStr);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            Interest Rate Schedule
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {facility.bank_name} — {facility.facility_name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Historical and future interest rate ladder. Rates are automatically interpolated based on value date.
          </DialogDescription>
        </DialogHeader>

        {/* Current Active Rate Card */}
        <div className="bg-slate-900 rounded-xl p-4 text-white flex items-center justify-between border border-slate-800 my-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Current Applicable Rate
            </span>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
              {currentRate}% APR
            </div>
            <p className="text-xs text-slate-300">
              Effective since <span className="font-mono text-white">{currentEffectiveDate}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Cost per Lakh</span>
            <div className="text-base font-bold font-mono text-emerald-300">
              ₹{calculateCostPerLakhPerDay(currentRate).toFixed(2)}/day
            </div>
            <span className="text-[11px] text-slate-400">
              {formatINR(calculateCostPerLakhPerDay(currentRate) * 30, false)}/month
            </span>
          </div>
        </div>

        {/* Add New Rate Revision Form */}
        <form
          onSubmit={handleAddSubmit}
          className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            Add New Rate Revision
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rate-rev" className="text-xs text-slate-600">
                New Rate (% APR)
              </Label>
              <div className="relative">
                <Input
                  id="rate-rev"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="e.g. 9.25"
                  required
                  className="h-10 text-sm font-mono font-bold pr-7 border-slate-300 rounded-lg touch-target-48"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="eff-date" className="text-xs text-slate-600">
                Effective Date
              </Label>
              <Input
                id="eff-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="h-10 text-sm border-slate-300 rounded-lg touch-target-48"
              />
            </div>
          </div>

          {error && (
            <div className="text-rose-600 text-xs flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg touch-target-48 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Append Rate Schedule
          </Button>
        </form>

        {/* Schedule Ladder Table */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 uppercase tracking-wider px-1">
            <span>Rate History Ladder</span>
            <span>{facilityRates.length} Entries</span>
          </div>

          {facilityRates.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
              No rate schedules logged yet. The facility is currently calculating at 0% APR.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
              {facilityRates.map((item) => {
                const isCurrent =
                  item.annual_rate_pct === currentRate &&
                  item.effective_date === currentEffectiveDate;

                const isFuture = item.effective_date > todayStr;

                return (
                  <div
                    key={item.id}
                    className={`p-3 flex items-center justify-between transition-colors ${
                      isCurrent ? 'bg-emerald-50/60' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-base font-bold font-mono text-slate-900">
                        {item.annual_rate_pct}%
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Effective: {item.effective_date}</span>
                          {isCurrent && (
                            <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4">
                              ACTIVE NOW
                            </Badge>
                          )}
                          {isFuture && (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[9px] px-1.5 py-0 h-4">
                              FUTURE
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          ₹{calculateCostPerLakhPerDay(item.annual_rate_pct).toFixed(2)}/day per Lakh
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {facilityRates.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteRate(item.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                          title="Delete this revision"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10 text-xs px-5 rounded-lg border-slate-200"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
