import React, { useState } from 'react';
import { BalanceSnapshot, Facility } from '@/types/debt';
import { formatINR } from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Calendar, Trash2, FileText, ArrowUpDown } from 'lucide-react';

interface SnapshotHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilityId?: string | null;
  facilities: Facility[];
  snapshots: BalanceSnapshot[];
  onDeleteSnapshot: (id: string) => void;
}

export const SnapshotHistoryModal: React.FC<SnapshotHistoryModalProps> = ({
  isOpen,
  onClose,
  facilityId,
  facilities,
  snapshots,
  onDeleteSnapshot,
}) => {
  const [filterFacilityId, setFilterFacilityId] = useState<string>(facilityId || 'ALL');

  // Sync if facilityId prop changes
  React.useEffect(() => {
    if (facilityId) {
      setFilterFacilityId(facilityId);
    } else {
      setFilterFacilityId('ALL');
    }
  }, [facilityId, isOpen]);

  const targetFacility = facilityId ? facilities.find((f) => f.id === facilityId) : null;

  const filteredSnapshots = snapshots
    .filter((s) => {
      if (filterFacilityId !== 'ALL') {
        return s.facility_id === filterFacilityId;
      }
      return true;
    })
    .sort((a, b) => {
      const cmp = b.value_date.localeCompare(a.value_date);
      if (cmp !== 0) return cmp;
      return b.entry_timestamp.localeCompare(a.entry_timestamp);
    });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs uppercase tracking-wider">
            <History className="w-4 h-4" />
            Audit Ledger
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {targetFacility
              ? `${targetFacility.bank_name} — Balance Snapshots`
              : 'Balance Snapshots History'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Historical debt balance snapshots logged over time. Rates interpolate automatically per value date.
          </DialogDescription>
        </DialogHeader>

        {/* Filter dropdown if looking at all */}
        {!facilityId && facilities.length > 1 && (
          <div className="flex items-center gap-2 py-1">
            <span className="text-xs font-semibold text-slate-600">Filter Facility:</span>
            <select
              value={filterFacilityId}
              onChange={(e) => setFilterFacilityId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="ALL">All Facilities ({snapshots.length})</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.bank_name} - {f.facility_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {filteredSnapshots.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl my-3">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No balance snapshots recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              Use "Log Balance" or "Quick Log" on any facility to record your first snapshot.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden my-2">
            {filteredSnapshots.map((item) => {
              const fac = facilities.find((f) => f.id === item.facility_id);
              const formattedTime = new Date(item.entry_timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-900">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        Value Date: {item.value_date}
                      </span>
                      {fac && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                        >
                          {fac.bank_name}
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">Logged at {formattedTime}</span>
                    </div>

                    {fac && <p className="text-xs text-slate-600 truncate">{fac.facility_name}</p>}

                    {item.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400">Balance</span>
                      <p className="text-base font-bold font-mono text-slate-900">
                        {formatINR(item.balance_amount)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Delete this historical balance snapshot?')) {
                          onDeleteSnapshot(item.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                      title="Delete snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10 text-xs px-5 rounded-lg border-slate-200 touch-target-48"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
