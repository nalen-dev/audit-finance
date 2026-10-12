import React, { useState, useMemo } from 'react';
import { Calendar, Check, AlertCircle, X, HelpCircle, ArrowRight } from 'lucide-react';

export default function BudgetCycleModal({ isOpen, onClose, currentDay = 1, onSaved }) {
  const [selectedDay, setSelectedDay] = useState(currentDay || 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync state if currentDay changes
  React.useEffect(() => {
    setSelectedDay(currentDay || 1);
  }, [currentDay, isOpen]);

  // Client-side cycle range simulation for instant preview
  const cyclePreview = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth(); // 0-indexed
    const year = today.getFullYear();
    const targetDay = parseInt(selectedDay, 10) || 1;

    let startDate, endDate;

    if (targetDay === 1) {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0); // last day of current month
    } else {
      if (day >= targetDay) {
        startDate = new Date(year, month, targetDay);
        // End date is 1 day before targetDay next month
        const nextCutoff = new Date(year, month + 1, targetDay);
        endDate = new Date(nextCutoff.getTime() - 86400000);
      } else {
        startDate = new Date(year, month - 1, targetDay);
        const currentCutoff = new Date(year, month, targetDay);
        endDate = new Date(currentCutoff.getTime() - 86400000);
      }
    }

    const diffTime = endDate.getTime() - today.setHours(0, 0, 0, 0);
    const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const fmt = (d) =>
      d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      startStr: fmt(startDate),
      endStr: fmt(endDate),
      daysRemaining,
    };
  }, [selectedDay]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const day = parseInt(selectedDay, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      setError('Pilih tanggal antara 1 sampai 31');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSaved(day);
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pengaturan siklus anggaran');
    } finally {
      setSubmitting(false);
    }
  };

  const presets = [
    { label: 'Tgl 25 (Gajian)', day: 25 },
    { label: 'Tgl 26 (Gajian)', day: 26 },
    { label: 'Tgl 1 (Kalender)', day: 1 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Siklus Anggaran Dinamis</h3>
              <p className="text-xs text-slate-500">Sesuaikan periode bulanan dengan tanggal gajian</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Pilihan Cepat
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => {
                const isSelected = selectedDay === p.day;
                return (
                  <button
                    type="button"
                    key={p.day}
                    onClick={() => setSelectedDay(p.day)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Input Slider/Number */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tanggal Cutoff / Awal Siklus (1 - 31)
              </label>
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Tanggal {selectedDay}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="31"
              value={selectedDay}
              onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Tgl 1</span>
              <span>Tgl 15</span>
              <span>Tgl 25</span>
              <span>Tgl 31</span>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                Simulasi Periode Berjalan
              </span>
              <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 shadow-2xs">
                Sisa {cyclePreview.daysRemaining} Hari
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span>{cyclePreview.startStr}</span>
              <ArrowRight className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{cyclePreview.endStr}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Semua ringkasan pemasukan, pengeluaran, Money to Spend, dan target bulanan akan otomatis terhitung dalam periode di atas.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
            >
              {submitting ? 'Menyimpan...' : 'Terapkan Siklus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
