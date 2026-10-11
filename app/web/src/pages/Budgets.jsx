import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, X, RefreshCw, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah, getPercentColor } from '../utils/formatters';
import { useDialog } from '../context/DialogContext';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [period, setPeriod] = useState('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [error, setError] = useState('');

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const [bList, catList] = await Promise.all([
        api.getBudgets(),
        api.getCategories('expense'),
      ]);
      setBudgets(bList);
      setCategories(catList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSetBudget = async (e) => {
    e.preventDefault();
    const amount = parseFloat(targetAmount);
    if (!amount || amount <= 0) {
      setError('Batas anggaran harus lebih dari 0');
      return;
    }

    try {
      await api.setBudget({
        category_id: categoryId ? categoryId : null,
        period,
        target_amount: amount,
        alert_threshold_percentage: parseInt(alertThreshold, 10) || 80,
      });
      setIsModalOpen(false);
      setTargetAmount('');
      setCategoryId('');
      fetchBudgets();
    } catch (err) {
      setError(err.message);
    }
  };

  const { confirm, showToast } = useDialog();

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Hapus Target Anggaran',
      message: 'Apakah Anda yakin ingin menghapus target batas anggaran ini?',
      confirmText: 'Ya, Hapus Anggaran',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteBudget(id);
      showToast('Target anggaran berhasil dihapus', 'success');
      fetchBudgets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Target Pengeluaran & Anggaran</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Sistem otomatis mensinkronisasi kuota Harian &harr; Mingguan &harr; Bulanan
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Pasang / Update Target
        </button>
      </div>

      {/* Grid of Budgets */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      ) : budgets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-sm space-y-3 shadow-xs">
          <Target className="w-10 h-10 text-slate-300 mx-auto" />
          <p>Belum ada target pengeluaran yang diatur.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-emerald-600 underline font-semibold"
          >
            Pasang target bulanan atau harian pertama Anda sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => (
            <div
              key={b.id}
              className={`p-6 rounded-2xl bg-white border space-y-4 transition-colors shadow-xs ${
                b.is_overspent
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : b.is_warning
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Periode {b.period}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-2">
                    {b.category_name ? b.category_name : 'Total Seluruh Pengeluaran'}
                  </h3>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Penggunaan Kuota</span>
                  <span className={`px-2 py-0.5 rounded font-bold border ${getPercentColor(b.percentage)}`}>
                    {b.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      b.is_overspent ? 'bg-rose-500' : b.is_warning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Sisa yang masih bisa digunakan highlight */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Sisa Bisa Digunakan:</span>
                <span className={`font-bold text-sm ${b.remaining_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {b.remaining_amount < 0
                    ? `Overspent (${formatRupiah(Math.abs(b.remaining_amount))})`
                    : formatRupiah(b.remaining_amount)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                <div>
                  <p className="text-slate-400">Terpakai</p>
                  <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(b.spent_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Batas Kuota</p>
                  <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(b.target_amount)}</p>
                </div>
              </div>

              {b.is_overspent && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Overspending! Melebihi target sebesar {formatRupiah(b.spent_amount - b.target_amount)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Pasang / Update Target</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetBudget} className="p-6 space-y-4">
              {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}

              {/* Sync Info Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <b>Sinkron Otomatis:</b> Jika Anda mengatur batas bulanan (misal 3.000.000), jatah harian (100.000) dan mingguan (700.000) akan dihitung otomatis, dan sebaliknya.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Pilih Periode Dasar</label>
                <div className="grid grid-cols-3 gap-2">
                  {['daily', 'weekly', 'monthly'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                        period === p
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Cakupan Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Semua Kategori (Total Pengeluaran & Saling Sinkron)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Batas Pengeluaran {period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan'} (Rp)
                </label>
                <input
                  type="number"
                  placeholder={period === 'daily' ? 'Contoh: 100000' : 'Contoh: 3000000'}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
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

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all"
                >
                  Simpan & Sinkronkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
