import React, { useState, useEffect } from 'react';
import { Facility, FacilityType } from '@/types/debt';
import { formatIndianNumberString, formatINR } from '@/lib/calculations';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, AlertCircle, Save } from 'lucide-react';

interface FacilityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityToEdit?: Facility | null;
  onSave: (
    facilityData: {
      bank_name: string;
      facility_name: string;
      facility_type: FacilityType;
      sanction_limit: number;
      status: 'ACTIVE' | 'CLOSED';
    },
    initialApr?: number
  ) => void;
}

export const FacilityFormModal: React.FC<FacilityFormModalProps> = ({
  isOpen,
  onClose,
  facilityToEdit,
  onSave,
}) => {
  const [bankName, setBankName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('OVERDRAFT');
  const [rawLimit, setRawLimit] = useState('');
  const [formattedLimit, setFormattedLimit] = useState('');
  const [initialApr, setInitialApr] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(facilityToEdit);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (facilityToEdit) {
        setBankName(facilityToEdit.bank_name);
        setFacilityName(facilityToEdit.facility_name);
        setFacilityType(facilityToEdit.facility_type);
        setRawLimit(facilityToEdit.sanction_limit.toString());
        setFormattedLimit(formatIndianNumberString(facilityToEdit.sanction_limit));
        setStatus(facilityToEdit.status);
        setInitialApr('');
      } else {
        setBankName('');
        setFacilityName('');
        setFacilityType('OVERDRAFT');
        setRawLimit('');
        setFormattedLimit('');
        setInitialApr('9.50');
        setStatus('ACTIVE');
      }
    }
  }, [isOpen, facilityToEdit]);

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '');
    if (val.includes('-')) {
      setError('Negative limits are not allowed.');
      return;
    }
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setError(null);
      setRawLimit(val);
      setFormattedLimit(formatIndianNumberString(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankName.trim()) {
      setError('Please provide a bank name (e.g. HDFC Bank, SBI, ICICI).');
      return;
    }

    if (!facilityName.trim()) {
      setError('Please provide a facility designation (e.g. Working Capital Overdraft).');
      return;
    }

    const limit = parseFloat(rawLimit);
    if (isNaN(limit) || limit <= 0) {
      setError('Please enter a valid positive sanction limit in ₹ INR.');
      return;
    }

    let aprNum: number | undefined;
    if (!isEditing) {
      aprNum = parseFloat(initialApr);
      if (isNaN(aprNum) || aprNum <= 0 || aprNum > 100) {
        setError('Please enter a valid annual interest rate percentage (e.g. 9.5%).');
        return;
      }
    }

    onSave(
      {
        bank_name: bankName.trim(),
        facility_name: facilityName.trim(),
        facility_type: facilityType,
        sanction_limit: limit,
        status,
      },
      aprNum
    );

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            {isEditing ? 'Modify Facility' : 'New Credit Line'}
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? 'Edit Credit Facility' : 'Register Commercial Credit Facility'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure banking partner, facility type, sanction limit, and credit status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Bank Name */}
            <div className="space-y-1.5">
              <Label htmlFor="bank-name" className="text-xs font-semibold text-slate-700">
                Lending Bank <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="bank-name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank"
                required
                className="h-11 rounded-lg border-slate-300 text-sm touch-target-48"
              />
            </div>

            {/* Facility Type */}
            <div className="space-y-1.5">
              <Label htmlFor="facility-type" className="text-xs font-semibold text-slate-700">
                Facility Type <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={facilityType}
                onValueChange={(val: FacilityType) => setFacilityType(val)}
              >
                <SelectTrigger id="facility-type" className="h-11 rounded-lg border-slate-300 text-sm touch-target-48">
                  <SelectValue placeholder="Facility Type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="OVERDRAFT" className="text-xs py-2">
                    Overdraft (OD / CC)
                  </SelectItem>
                  <SelectItem value="CHANNEL_FINANCE" className="text-xs py-2">
                    Channel Financing (Vendor / Dealer)
                  </SelectItem>
                  <SelectItem value="TERM_LOAN" className="text-xs py-2">
                    Term Loan (Commercial / Capex)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Facility Name */}
          <div className="space-y-1.5">
            <Label htmlFor="facility-name" className="text-xs font-semibold text-slate-700">
              Facility Description / Line Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="facility-name"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              placeholder="e.g. Working Capital Overdraft Account #4812"
              required
              className="h-11 rounded-lg border-slate-300 text-sm touch-target-48"
            />
          </div>

          {/* Sanction Limit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="limit-input" className="text-xs font-semibold text-slate-700">
                Sanctioned Credit Limit (₹) <span className="text-rose-500">*</span>
              </Label>
              {rawLimit && (
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  {formatINR(parseFloat(rawLimit) || 0, false)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                ₹
              </span>
              <Input
                id="limit-input"
                type="text"
                inputMode="decimal"
                value={formattedLimit}
                onChange={handleLimitChange}
                placeholder="e.g. 50,00,000 (50 Lakhs)"
                required
                className="pl-8 h-12 rounded-lg border-slate-300 text-base font-mono font-bold text-slate-900 touch-target-48"
              />
            </div>
          </div>

          {/* Initial APR (only for new facility) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="apr-input" className="text-xs font-semibold text-slate-700">
                Initial Annual Interest Rate (% APR) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="apr-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={initialApr}
                  onChange={(e) => setInitialApr(e.target.value)}
                  placeholder="e.g. 9.75"
                  required
                  className="h-11 rounded-lg border-slate-300 text-sm font-mono font-bold text-slate-900 pr-8 touch-target-48"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                You can add subsequent rate revisions anytime in the Rate Schedule manager.
              </p>
            </div>
          )}

          {/* Status (ACTIVE / CLOSED) */}
          <div className="space-y-1.5">
            <Label htmlFor="facility-status" className="text-xs font-semibold text-slate-700">
              Operational Status
            </Label>
            <Select
              value={status}
              onValueChange={(val: 'ACTIVE' | 'CLOSED') => setStatus(val)}
            >
              <SelectTrigger id="facility-status" className="h-11 rounded-lg border-slate-300 text-sm touch-target-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ACTIVE" className="text-xs py-2 text-emerald-800 font-semibold">
                  ACTIVE (Included in burn & daily intelligence)
                </SelectItem>
                <SelectItem value="CLOSED" className="text-xs py-2 text-slate-600">
                  CLOSED (Archived facility, excluded from active burn)
                </SelectItem>
              </SelectContent>
            </Select>
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
              className="h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs touch-target-48 shadow-md"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isEditing ? 'Save Changes' : 'Create Facility'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
