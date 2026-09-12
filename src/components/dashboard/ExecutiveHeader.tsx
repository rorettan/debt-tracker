import React from 'react';
import { DebtLogo } from '@/components/brand/DebtLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, RefreshCw, Sparkles, Building2 } from 'lucide-react';

interface ExecutiveHeaderProps {
  asOfDate: string;
  onDateChange: (date: string) => void;
  onOpenQuickLog: () => void;
  onOpenAddFacility: () => void;
  hasFacilities: boolean;
  onLoadSampleData: () => void;
  onClearData: () => void;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({
  asOfDate,
  onDateChange,
  onOpenQuickLog,
  onOpenAddFacility,
  hasFacilities,
  onLoadSampleData,
  onClearData,
}) => {
  const formattedDisplayDate = new Date(asOfDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = asOfDate === todayStr;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Logo & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DebtLogo size={36} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-white">DebtTracker</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-400 bg-emerald-950/40 font-mono text-[10px] px-1.5 py-0.5 tracking-wider uppercase"
                  >
                    ₹ INR Core
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Commercial Debt & Daily Interest Intelligence
                </p>
              </div>
            </div>

            {/* Mobile Actions: Add button */}
            <div className="flex sm:hidden items-center gap-1.5">
              {hasFacilities && (
                <Button
                  size="sm"
                  onClick={onOpenQuickLog}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3 py-1.5 h-10 touch-target-48 rounded-lg shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Log
                </Button>
              )}
            </div>
          </div>

          {/* Date Selector & Global Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs flex-wrap">
            {/* Value Date Indicator / Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-medium">As of:</span>
                <input
                  type="date"
                  value={asOfDate}
                  max={todayStr}
                  onChange={(e) => {
                    if (e.target.value) onDateChange(e.target.value);
                  }}
                  className="bg-transparent text-emerald-300 font-semibold focus:outline-none cursor-pointer text-xs"
                />
              </div>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => onDateChange(todayStr)}
                  title="Reset to today"
                  className="ml-1 text-slate-400 hover:text-emerald-300 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {!hasFacilities ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onLoadSampleData}
                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs h-9"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Load Demo Portfolio
                  </Button>
                  <Button
                    size="sm"
                    onClick={onOpenAddFacility}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    New Facility
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenAddFacility}
                    className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-9"
                  >
                    <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    + Facility
                  </Button>
                  <Button
                    size="sm"
                    onClick={onOpenQuickLog}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 px-3.5 rounded-lg shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Log Balance
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
