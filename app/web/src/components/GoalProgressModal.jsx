import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah } from '../utils/formatters';
import { useDialog } from '../context/DialogContext';

const QUICK_AMOUNTS = [50000, 100000, 250000, 500000, 1000000];

export default function GoalProgressModal({ isOpen, goal, onClose, onSuccess }) {
  const { showToast } = useDialog();
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('add');
      setAmount('');
      setError('');
    }
  }, [isOpen, goal]);

  if (!isOpen || !goal) return null;

  const numAmount = parseFloat(amount) || 0;
  const currentAmt = goal.current_amount || 0;
  const projectedAmt = mode === 'add' ? currentAmt + numAmount : Math.max(0, currentAmt - numAmount);
  const projectedPct = goal.target_amount > 0 ? Math.min((projectedAmt / goal.target_amount) * 100, 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setError('Nominal harus lebih dari 0');
      return;
    }
    if (mode === 'subtract' && numAmount > currentAmt) {
      setError('Nominal pengurangan melebihi dana yang terkumpul saat ini');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.updateGoalProgress(goal.id, { mode, amount: numAmount });
      showToast(
        mode === 'add'
          ? `Progres "${goal.name}" ditambah ${formatRupiah(numAmount)}`
          : `Progres "${goal.name}" dikurangi ${formatRupiah(numAmount)}`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">Update Progres Target</h2>
            <p className="text-xs text-slate-500 truncate">{goal.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'add'
                  ? 'bg-white text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Progres
            </button>
            <button
              type="button"
              onClick={() => setMode('subtract')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'subtract'
                  ? 'bg-white text-rose-700 border border-rose-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Kurangi / Koreksi
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nominal (Rp)</label>
            <input
              type="number"
              min="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String((parseFloat(amount) || 0) + val))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 transition-colors"
                >
                  +{val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
                </button>
              ))}
            </div>
          </div>

          {/* Projection Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Terkumpul Saat Ini:</span>
              <span className="font-semibold text-slate-800">{formatRupiah(currentAmt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Setelah Diperbarui:</span>
              <span className="font-bold text-emerald-700">
                {formatRupiah(projectedAmt)} ({projectedPct.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${projectedPct}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Pembaruan ini hanya mencatat progres tabungan tujuan secara terpisah tanpa mengurangi saldo dompet maupun Tabungan Aman.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`w-1/2 py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 ${
                mode === 'subtract' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? 'Menyimpan...' : mode === 'add' ? 'Tambah Dana' : 'Kurangi Dana'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
