import React from 'react';
import { FacilityInterestSummary } from '@/types/debt';
import { formatINR, formatINRCompact } from '@/lib/calculations';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DebtBreakdownChartProps {
  summaries: FacilityInterestSummary[];
  totalBalance: number;
}

const PALETTE = [
  '#059669', // Emerald
  '#0284C7', // Sky
  '#D97706', // Amber
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#8B5CF6', // Purple
];

export const DebtBreakdownChart: React.FC<DebtBreakdownChartProps> = ({
  summaries,
  totalBalance,
}) => {
  const chartData = summaries
    .filter((s) => s.currentBalance > 0)
    .map((s, index) => {
      const pct = totalBalance > 0 ? (s.currentBalance / totalBalance) * 100 : 0;
      return {
        name: `${s.facility.bank_name} - ${s.facility.facility_name}`,
        bank: s.facility.bank_name,
        facility: s.facility.facility_name,
        type: s.facility.facility_type.replace('_', ' '),
        value: s.currentBalance,
        pct: pct,
        apr: s.currentAPR,
        dailyBurn: s.dailyBurn,
        color: PALETTE[index % PALETTE.length],
      };
    });

  if (chartData.length === 0) {
    return (
      <Card className="p-6 bg-white border border-slate-200/80 rounded-xl flex flex-col items-center justify-center text-center min-h-[280px]">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <PieChartIcon className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No Outstanding Debt Drawn</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          When credit lines have balances recorded, a live proportion breakdown and exposure chart will appear here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-600" />
            Debt Breakdown by Facility
          </h3>
          <p className="text-xs text-slate-500">Proportional balance distribution across active credit facilities</p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {chartData.length} {chartData.length === 1 ? 'line' : 'lines'} active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Donut Chart Container */}
        <div className="lg:col-span-5 h-[220px] w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs rounded-lg p-2.5 shadow-xl border border-slate-700 font-sans z-50">
                        <p className="font-bold text-slate-100">{data.bank}</p>
                        <p className="text-slate-400 text-[11px]">{data.facility}</p>
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800 space-y-1">
                          <p className="font-mono text-emerald-400 font-semibold">
                            {formatINR(data.value)} ({data.pct.toFixed(1)}%)
                          </p>
                          <p className="text-slate-300 text-[11px]">
                            APR: <span className="text-white font-mono">{data.apr}%</span> • Daily:{' '}
                            <span className="text-rose-400 font-mono">{formatINR(data.dailyBurn)}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text in donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total Debt
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
              {formatINRCompact(totalBalance)}
            </span>
          </div>
        </div>

        {/* Legend / Proportion List */}
        <div className="lg:col-span-7 space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {item.bank} <span className="font-normal text-slate-500">• {item.facility}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {item.type} • {item.apr}% APR
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-3">
                <p className="text-xs font-bold font-mono text-slate-900">
                  {formatINR(item.value)}
                </p>
                <p className="text-[10px] font-semibold text-emerald-700 font-mono">
                  {item.pct.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
