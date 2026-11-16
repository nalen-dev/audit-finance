import React, { useState, useEffect } from 'react';
import { X, Coins } from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah } from '../utils/formatters';
import { useDialog } from '../context/DialogContext';

export default function DailyBudgetModal({
  isOpen,
  onClose,
  onSuccess,
  currentBudget = null,
  categoryId = null,
  categories = [],
  daysTotalInCycle = 30,
}) {
  const { showToast } = useDialog();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSelectedCategoryId(categoryId || currentBudget?.category_id || '');
      setTargetAmount(currentBudget?.target_amount ? String(currentBudget.target_amount) : '');
      setAlertThreshold(currentBudget?.alert_threshold_percentage || 80);
    }
  }, [isOpen, currentBudget, categoryId]);

  if (!isOpen) return null;

  const parsedTarget = parseFloat(targetAmount) || 0;
  const isTotalDaily = !selectedCategoryId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedTarget || parsedTarget <= 0) {
      setError('Batas harian harus lebih dari 0');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.setBudget({
        category_id: selectedCategoryId || null,
        period: 'daily',
        target_amount: parsedTarget,
        alert_threshold_percentage: parseInt(alertThreshold, 10) || 80,
      });
      showToast(
        isTotalDaily ? 'Target belanja harian berhasil disimpan!' : 'Batas harian kategori berhasil disimpan!',
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {currentBudget ? 'Ubah Target Harian' : 'Atur Target Harian'}
            </h2>
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

          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Cakupan Target Harian</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Total Pengeluaran Harian (Money to Spend & Kuota Siklus)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kategori: {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Batas Pengeluaran Harian (Rp / hari)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Contoh: 100000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            />
            {isTotalDaily && parsedTarget > 0 && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-2 mt-2">
                Estimasi kebutuhan siklus {daysTotalInCycle || 30} hari:{' '}
                <b>{formatRupiah(parsedTarget * (daysTotalInCycle || 30))}</b> (sisanya otomatis masuk Tabungan Aman).
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Ambang Peringatan Overspending: {alertThreshold}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="flex gap-3 pt-2">
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
              className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
