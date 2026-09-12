import React from 'react';
import { PaydownRecommendation } from '@/types/debt';
import { formatINR } from '@/lib/calculations';
import { Zap, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaydownPriorityBannerProps {
  recommendation: PaydownRecommendation | null;
  onQuickLogForFacility?: (facilityId: string) => void;
}

export const PaydownPriorityBanner: React.FC<PaydownPriorityBannerProps> = ({
  recommendation,
  onQuickLogForFacility,
}) => {
  if (!recommendation) return null;

  const { facility, apr, currentBalance, costPerLakhPerDay, potentialDailySavingPerLakh } =
    recommendation;

  const hasDebt = currentBalance > 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 p-4 sm:p-5 text-white shadow-md">
      {/* Decorative pulse indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                Paydown Priority #1
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                {facility.bank_name} • {facility.facility_name}
              </span>
              <span className="inline-flex items-center text-xs font-mono font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                {apr}% APR (Highest)
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300">
              {hasDebt ? (
                <>
                  Outstanding{' '}
                  <strong className="text-white font-mono">{formatINR(currentBalance)}</strong> is
                  incurring{' '}
                  <span className="text-emerald-300 font-semibold">
                    ₹{costPerLakhPerDay.toFixed(2)}
                  </span>{' '}
                  in interest daily for every ₹1,00,000 borrowed.
                </>
              ) : (
                <>
                  Carries your highest borrowing rate at <strong>{apr}% APR</strong> (₹{costPerLakhPerDay.toFixed(2)}/day per Lakh). Keep balance at ₹0.
                </>
              )}
            </p>

            {potentialDailySavingPerLakh > 0 && (
              <p className="text-xs text-emerald-400/90 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Refinancing or clearing this first saves ₹{potentialDailySavingPerLakh.toFixed(2)}/day per Lakh compared to lowest-cost lines.
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        {hasDebt && onQuickLogForFacility && (
          <div className="sm:shrink-0">
            <Button
              size="sm"
              onClick={() => onQuickLogForFacility(facility.id)}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 px-4 rounded-lg shadow-md touch-target-48"
            >
              Paydown Log
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
