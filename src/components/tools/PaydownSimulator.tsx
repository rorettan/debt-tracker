import React, { useState } from 'react';
import { FacilityInterestSummary } from '@/types/debt';
import { calculateDailyInterest, formatIndianNumberString, formatINR } from '@/lib/calculations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Sparkles, TrendingDown, CheckCircle2 } from 'lucide-react';

interface PaydownSimulatorProps {
  summaries: FacilityInterestSummary[];
}

export const PaydownSimulator: React.FC<PaydownSimulatorProps> = ({ summaries }) => {
  const activeWithDebt = summaries.filter((s) => s.facility.status === 'ACTIVE' && s.currentBalance > 0);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    activeWithDebt.length > 0 ? activeWithDebt[0].facility.id : ''
  );
  const [lumpSumStr, setLumpSumStr] = useState<string>('500000'); // ₹5 Lakhs default
  const [formattedLumpSum, setFormattedLumpSum] = useState<string>('5,00,000');

  const selectedSummary = activeWithDebt.find((s) => s.facility.id === selectedFacilityId);

  const handleLumpSumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, '');
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setLumpSumStr(val);
      setFormattedLumpSum(formatIndianNumberString(val));
    }
  };

  const lumpSumAmount = parseFloat(lumpSumStr) || 0;

  if (activeWithDebt.length === 0) {
    return null;
  }

  const effectivePaydown = selectedSummary
    ? Math.min(lumpSumAmount, selectedSummary.currentBalance)
    : 0;

  const apr = selectedSummary ? selectedSummary.currentAPR : 0;
  const dailySavings = calculateDailyInterest(effectivePaydown, apr);
  const monthlySavings = dailySavings * 30;
  const annualSavings = dailySavings * 365;

  return (
    <Card className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-lg relative overflow-hidden">
      <div className="absolute right-0 top-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              Paydown Intelligence Simulator
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              Simulate Debt Reduction & Immediate Burn Relief
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            What-If Scenario
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Select Facility to Paydown
              </label>
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full h-11 bg-slate-800 border border-slate-700 rounded-lg px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {activeWithDebt.map((s) => (
                  <option key={s.facility.id} value={s.facility.id}>
                    {s.facility.bank_name} - {s.facility.facility_name} ({s.currentAPR}% APR •{' '}
                    {formatINR(s.currentBalance, false)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Lump-Sum Payment Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  ₹
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formattedLumpSum}
                  onChange={handleLumpSumChange}
                  placeholder="e.g. 5,00,000"
                  className="pl-8 h-11 bg-slate-800 border-slate-700 text-white font-mono font-bold text-sm rounded-lg"
                />
              </div>
            </div>

            {/* Quick Pill Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Quick:</span>
              {[100000, 250000, 500000, 1000000, 2500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setLumpSumStr(amt.toString());
                    setFormattedLumpSum(formatIndianNumberString(amt));
                  }}
                  className="px-2 py-1 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded border border-slate-700 transition-colors"
                >
                  ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)}L
                </button>
              ))}
            </div>
          </div>

          {/* Results Card */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold uppercase tracking-wider">
              <span>Interest Bleed Eliminated</span>
              <span className="font-mono text-white bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-500/30">
                {apr}% APR Line
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Daily Relief</span>
                <p className="text-base font-extrabold font-mono text-emerald-400 mt-0.5">
                  {formatINR(dailySavings)}
                </p>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Saved</span>
                <p className="text-base font-extrabold font-mono text-emerald-300 mt-0.5">
                  {formatINR(monthlySavings, false)}
                </p>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Annual Profit Saved</span>
                <p className="text-base font-black font-mono text-emerald-300 mt-0.5">
                  {formatINR(annualSavings, false)}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Applying {formatINR(effectivePaydown, false)} directly returns{' '}
              <strong className="text-white font-mono">{apr}% risk-free annual return</strong> by avoiding
              interest compounding.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
