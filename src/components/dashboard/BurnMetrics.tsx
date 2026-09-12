import React from 'react';
import { PortfolioSummary } from '@/types/debt';
import { formatINR } from '@/lib/calculations';
import { Flame, TrendingUp, CalendarDays, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BurnMetricsProps {
  summary: PortfolioSummary;
}

export const BurnMetrics: React.FC<BurnMetricsProps> = ({ summary }) => {
  const isHighUtilization = summary.utilizationPct > 80;

  return (
    <div className="space-y-4">
      {/* Top Banner: Total Portfolio Balance & Daily Burn */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl p-5 sm:p-6 text-white">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          {/* Total Debt Balance */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Outstanding Debt
              </span>
              <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {summary.activeFacilitiesCount} active {summary.activeFacilitiesCount === 1 ? 'line' : 'lines'}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-mono">
              {formatINR(summary.totalBalance)}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300 pt-1">
              <span>
                Sanctioned:{' '}
                <span className="font-semibold text-slate-200">
                  {formatINR(summary.totalLimit, false)}
                </span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                Utilization:
                <span
                  className={`font-semibold ${
                    isHighUtilization ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {summary.utilizationPct.toFixed(1)}%
                </span>
              </span>
              {summary.blendedAPR > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>
                    Blended APR:{' '}
                    <span className="font-semibold text-emerald-300">
                      {summary.blendedAPR.toFixed(2)}%
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Daily Interest Burn Highlight */}
          <div className="bg-slate-800/90 border border-rose-500/30 rounded-xl p-4 sm:p-5 shadow-lg md:min-w-[280px]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400">
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                Daily Interest Burn
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                /24 Hours
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
              {formatINR(summary.totalDailyBurn)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Bleed per hour:{' '}
              <span className="font-medium text-slate-300 font-mono">
                {formatINR(summary.totalDailyBurn / 24)}
              </span>
            </p>
          </div>
        </div>

        {/* Linear Utilization progress bar */}
        {summary.totalLimit > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1.5 text-slate-400">
              <span className="flex items-center gap-1.5">
                {isHighUtilization ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                Credit Line Headroom:{' '}
                <span className="text-slate-200 font-medium">
                  {formatINR(Math.max(0, summary.totalLimit - summary.totalBalance))}
                </span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {summary.utilizationPct.toFixed(1)}% Drawn
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isHighUtilization
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${Math.min(100, summary.utilizationPct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Horizontal Metric Cards: Weekly Burn, Monthly Burn, Annual Burn */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Weekly Burn */}
        <Card className="p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Weekly Burn
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CalendarDays className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {formatINR(summary.totalWeeklyBurn)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Formula</span>
            <span className="font-mono text-slate-600">Daily × 7</span>
          </div>
        </Card>

        {/* Monthly Burn (30 days) */}
        <Card className="p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Monthly Burn
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {formatINR(summary.totalMonthlyBurn)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Formula</span>
            <span className="font-mono text-slate-600">Daily × 30</span>
          </div>
        </Card>

        {/* Annualized Burn (365 days) */}
        <Card className="p-4 bg-white border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Annualized Interest
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-700 font-mono tracking-tight">
            {formatINR(summary.totalAnnualBurn)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Cumulative Cost</span>
            <span className="font-mono text-slate-600">Daily × 365</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
