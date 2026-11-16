import React from 'react';
import { Plus, Pencil, Trash2, CheckCircle2, Calendar } from 'lucide-react';
import GoalIcon from './GoalIcon';
import { formatRupiah, formatDate } from '../utils/formatters';

export default function GoalCard({ goal, onUpdateProgress, onEdit, onDelete }) {
  const pct = Math.min(goal.percentage || 0, 100);
  const isCompleted = Boolean(goal.is_completed || (goal.target_amount > 0 && goal.current_amount >= goal.target_amount));
  const accentColor = goal.color || '#10B981';

  return (
    <div
      className={`p-5 rounded-2xl bg-white border space-y-3.5 relative overflow-hidden shadow-xs flex flex-col justify-between transition-colors ${
        isCompleted ? 'border-emerald-300 ring-1 ring-emerald-200/70' : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: accentColor }}
      />

      <div className="space-y-3">
        {/* Top Row: Icon + Name + Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              <GoalIcon name={goal.icon} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  {goal.name}
                </h3>
                {isCompleted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Tercapai
                  </span>
                )}
              </div>
              {goal.target_date ? (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  Tenggat: {formatDate(goal.target_date)}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">Target tabungan mandiri</p>
              )}
            </div>
          </div>

          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <button
                  onClick={() => onEdit(goal)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Edit target"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(goal)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Hapus target"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Optional Note */}
        {goal.note && (
          <p className="text-xs text-slate-500 line-clamp-2">{goal.note}</p>
        )}

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Progres</span>
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {(goal.percentage || 0).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: isCompleted ? '#10B981' : accentColor,
              }}
            />
          </div>
        </div>

        {/* Amounts Summary */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Terkumpul</span>
            <span className="font-bold text-slate-900 tabular-nums mt-0.5 block">
              {formatRupiah(goal.current_amount)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Target</span>
            <span className="font-bold text-slate-900 tabular-nums mt-0.5 block">
              {formatRupiah(goal.target_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Remaining & Quick Progress Action */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {isCompleted
            ? 'Target sudah terpenuhi!'
            : `Kurang: ${formatRupiah(goal.remaining_amount)}`}
        </span>
        {onUpdateProgress && (
          <button
            onClick={() => onUpdateProgress(goal)}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Progres
          </button>
        )}
      </div>
    </div>
  );
}
