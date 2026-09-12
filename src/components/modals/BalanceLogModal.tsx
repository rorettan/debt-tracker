import React, { useState, useEffect } from 'react';
import { Facility, RateSchedule } from '@/types/debt';
import {
  calculateDailyInterest,
  calculateMonthlyInterest,
  formatIndianNumberString,
  formatINR,
  getApplicableRate,
} from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flame, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';

interface BalanceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  rateSchedules: RateSchedule[];
  initialFacilityId?: string;
  onSave: (snapshot: {
    facility_id: string;
    value_date: string;
    balance_amount: number;
    notes?: string;
  }) => void;
}

export const BalanceLogModal: React.FC<BalanceLogModalProps> = ({
  isOpen,
  onClose,
  facilities,
  rateSchedules,
  initialFacilityId,
  onSave,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const activeFacilities = facilities.filter((f) => f.status === 'ACTIVE');

  const [facilityId, setFacilityId] = useState<string>('');
  const [valueDate, setValueDate] = useState<string>(todayStr);
  const [rawAmount, setRawAmount] = useState<string>('');
  const [formattedDisplay, setFormattedDisplay] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Set initial selected facility
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setValueDate(todayStr);
      setRawAmount('');
      setFormattedDisplay('');
      setNotes('');

      if (initialFacilityId && facilities.some((f) => f.id === initialFacilityId)) {
        setFacilityId(initialFacilityId);
      } else if (activeFacilities.length > 0) {
        setFacilityId(activeFacilities[0].id);
      }
    }
  }, [isOpen, initialFacilityId, facilities, todayStr]);

  const selectedFacility = facilities.find((f) => f.id === facilityId);

  // Applicable rate as of valueDate
  const { rate: applicableApr, effectiveDate } = facilityId
    ? getApplicableRate(facilityId, valueDate, rateSchedules)
    : { rate: 0, effectiveDate: valueDate };

  // Calculate live daily & monthly burn preview
  const numericBalance = parseFloat(rawAmount) || 0;
  const previewDailyBurn = calculateDailyInterest(numericBalance, applicableApr);
  const previewMonthlyBurn = calculateMonthlyInterest(previewDailyBurn);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '');

    // Reject negative numbers or invalid characters
    if (val.includes('-')) {
      setError('Negative balances are strictly not allowed.');
      return;
    }

    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setError(null);
      setRawAmount(val);
      setFormattedDisplay(formatIndianNumberString(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!facilityId) {
      setError('Please select a commercial credit facility.');
      return;
    }

    if (!valueDate) {
      setError('Please provide a value date.');
      return;
    }

    if (valueDate > todayStr) {
      setError('Future value dates are not permitted. Select today or an earlier date.');
      return;
    }

    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount < 0) {
      setError('Please enter a valid, non-negative balance in ₹ INR.');
      return;
    }

    onSave({
      facility_id: facilityId,
      value_date: valueDate,
      balance_amount: amount,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Snapshot Entry
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Log Credit Facility Balance
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Update your commercial debt ledger. Daily interest burn is computed instantly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Facility Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="facility-select" className="text-xs font-semibold text-slate-700">
              Credit Facility <span className="text-rose-500">*</span>
            </Label>
            {activeFacilities.length === 0 ? (
              <div className="p-3 text-xs text-rose-600 bg-rose-50 rounded-lg border border-rose-200">
                No active facilities available. Please create one in Facility Management first.
              </div>
            ) : (
              <Select value={facilityId} onValueChange={(val) => setFacilityId(val)}>
                <SelectTrigger id="facility-select" className="h-11 rounded-lg border-slate-300 text-sm touch-target-48">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {activeFacilities.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs py-2.5">
                      <span className="font-semibold text-slate-900">{f.bank_name}</span> -{' '}
                      <span className="text-slate-600">{f.facility_name}</span>{' '}
                      <span className="text-[10px] text-slate-400 font-mono">
                        (Limit: {formatINR(f.sanction_limit, false)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Value Date Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="value-date" className="text-xs font-semibold text-slate-700">
                Value Date <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] text-slate-400">Max: Today (No future dates)</span>
            </div>
            <Input
              id="value-date"
              type="date"
              value={valueDate}
              max={todayStr}
              onChange={(e) => setValueDate(e.target.value)}
              required
              className="h-11 rounded-lg border-slate-300 text-sm font-medium touch-target-48"
            />
          </div>

          {/* Balance Amount (INR with Indian numbering format) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="balance-input" className="text-xs font-semibold text-slate-700">
                Outstanding Balance Amount (₹) <span className="text-rose-500">*</span>
              </Label>
              {rawAmount && (
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  ₹ {formattedDisplay}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                ₹
              </span>
              <Input
                id="balance-input"
                type="text"
                inputMode="decimal"
                value={formattedDisplay}
                onChange={handleAmountChange}
                placeholder="e.g. 25,00,000"
                required
                className="pl-8 h-12 rounded-lg border-slate-300 text-base font-mono font-bold text-slate-900 touch-target-48"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Supports Indian comma formatting (Lakhs & Crores). Must be non-negative.
            </p>
          </div>

          {/* Instant Live Burn Preview Box */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 text-white shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-rose-500" />
                Live Interest Burn Preview
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {applicableApr}% APR
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <p className="text-[11px] text-slate-400">Daily Burn (24h)</p>
                <p className="text-lg font-black font-mono text-rose-400">
                  {formatINR(previewDailyBurn)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Monthly Run-rate</p>
                <p className="text-lg font-black font-mono text-slate-200">
                  {formatINR(previewMonthlyBurn)}
                </p>
              </div>
            </div>

            {applicableApr === 0 && (
              <p className="text-[11px] text-amber-400 mt-2">
                Note: No rate schedule found for this facility. Go to Facility Management to assign an APR.
              </p>
            )}
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="log-notes" className="text-xs font-semibold text-slate-700">
              Memo / Drawdown Note (Optional)
            </Label>
            <Textarea
              id="log-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly GST payment drawdown, or quarterly interest capitalization..."
              rows={2}
              className="resize-none rounded-lg border-slate-300 text-xs"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-lg text-xs font-medium touch-target-48 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={activeFacilities.length === 0}
              className="h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs touch-target-48 shadow-md"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Save Snapshot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
