import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Coins,
  Pencil,
} from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah, getPercentColor } from '../utils/formatters';
import { useDialog } from '../context/DialogContext';
import GoalCard from '../components/GoalCard';
import GoalModal from '../components/GoalModal';
import GoalProgressModal from '../components/GoalProgressModal';
import DailyBudgetModal from '../components/DailyBudgetModal';

export default function Budgets() {
  const { confirm, showToast } = useDialog();
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [daysTotalInCycle, setDaysTotalInCycle] = useState(30);
  const [loading, setLoading] = useState(true);

  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [dailyModalCategories, setDailyModalCategories] = useState([]);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [progressGoal, setProgressGoal] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [bList, gList, catList, summary] = await Promise.all([
        api.getBudgets(),
        api.getGoals(),
        api.getCategories('expense'),
        api.getSummary(),
      ]);
      setBudgets(bList || []);
      setGoals(gList || []);
      setCategories(catList || []);
      setDaysTotalInCycle(summary?.days_total_in_cycle || 30);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDeleteBudget = async (budget) => {
    const isTotal = !budget.category_id;
    const ok = await confirm({
      title: isTotal ? 'Reset Batas Harian' : 'Hapus Batas Kategori',
      message: isTotal
        ? 'Menghapus batas belanja harian akan menonaktifkan perhitungan Money to Spend & kuota siklus otomatis. Lanjutkan?'
        : `Yakin ingin menghapus batas harian kategori "${budget.category_name}"?`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteBudget(budget.id);
      showToast('Batas anggaran berhasil dihapus', 'success');
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteGoal = async (goal) => {
    const ok = await confirm({
      title: 'Hapus Target Anggaran',
      message: `Yakin ingin menghapus target "${goal.name}"?`,
      confirmText: 'Ya, Hapus Target',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteGoal(goal.id);
      showToast('Target anggaran berhasil dihapus', 'success');
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const totalDailyBudget = budgets.find((b) => !b.category_id && b.period === 'daily') || null;
  const categoryBudgets = budgets.filter((b) => Boolean(b.category_id));

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Target Anggaran &amp; Impian
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Atur batas belanja harian serta target tujuan pribadi Anda (liburan, beli HP baru, dll.)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setIsGoalModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          Tambah Target Lain
        </button>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* 1. Primary Daily Budget Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">Batas Belanja Harian</h2>
                    {totalDailyBudget && (
                      <span className={`px-2 py-0.5 rounded font-bold text-xs border ${getPercentColor(totalDailyBudget.percentage)}`}>
                        {totalDailyBudget.percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Dipakai untuk menghitung Money to Spend harian, Sisa Kuota Siklus, &amp; Tabungan Aman di Dashboard
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingBudget(totalDailyBudget);
                    setDailyModalCategories([]);
                    setIsDailyModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {totalDailyBudget ? 'Ubah Target Harian' : 'Atur Target Harian'}
                </button>
                {totalDailyBudget && (
                  <button
                    onClick={() => handleDeleteBudget(totalDailyBudget)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
                    title="Reset Batas Harian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {totalDailyBudget ? (
              <div className="space-y-3 pt-1">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      totalDailyBudget.is_overspent
                        ? 'bg-rose-500'
                        : totalDailyBudget.is_warning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(totalDailyBudget.percentage, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Terpakai Hari Ini</span>
                    <span className="font-bold text-slate-900">{formatRupiah(totalDailyBudget.spent_amount)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Sisa Bisa Dipakai</span>
                    <span className={`font-bold ${totalDailyBudget.remaining_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {totalDailyBudget.remaining_amount < 0
                        ? `Overspent (${formatRupiah(Math.abs(totalDailyBudget.remaining_amount))})`
                        : formatRupiah(totalDailyBudget.remaining_amount)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Batas Kuota Harian</span>
                    <span className="font-bold text-slate-900">{formatRupiah(totalDailyBudget.target_amount)}</span>
                  </div>
                </div>

                {totalDailyBudget.is_overspent && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    Pengeluaran hari ini melampaui batas harian sebesar {formatRupiah(totalDailyBudget.spent_amount - totalDailyBudget.target_amount)}.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
                Belum ada batas harian yang diatur. Klik <b>Atur Target Harian</b> untuk mulai menghitung kuota siklus Anda.
              </div>
            )}
          </div>

          {/* 2. Custom Savings Goals (Liburan, Beli HP Baru, dll.) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Target Anggaran Lain</h2>
                <p className="text-xs text-slate-500">
                  Pelacakan mandiri untuk tujuan khusus seperti Liburan, Beli HP Baru, Dana Darurat — tidak memotong saldo dompet maupun Tabungan Aman.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setIsGoalModalOpen(true);
                }}
                className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat Target Baru
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white border border-slate-200 text-slate-400 text-sm space-y-3 shadow-xs">
                <Target className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                  <p className="font-semibold text-slate-600">Belum ada target anggaran lain</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Buat target impian seperti &ldquo;Liburan&rdquo; atau &ldquo;Beli HP Baru&rdquo; lalu catat progresnya bertahap.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingGoal(null);
                    setIsGoalModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Target Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onUpdateProgress={(g) => setProgressGoal(g)}
                    onEdit={(g) => {
                      setEditingGoal(g);
                      setIsGoalModalOpen(true);
                    }}
                    onDelete={handleDeleteGoal}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 3. Optional Per-Category Daily Limits */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Batas Harian Per Kategori (Opsional)</h2>
                <p className="text-xs text-slate-500">
                  Batasi pengeluaran harian untuk kategori tertentu (misal: Jajan/Kopi maksimal Rp 30.000/hari)
                </p>
              </div>
              {categories.length > 0 && (
                <button
                  onClick={() => {
                    setEditingBudget(null);
                    setDailyModalCategories(categories);
                    setIsDailyModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Batas Kategori
                </button>
              )}
            </div>

            {categoryBudgets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryBudgets.map((b) => (
                  <div
                    key={b.id}
                    className={`p-5 rounded-2xl bg-white border space-y-3 shadow-xs ${
                      b.is_overspent
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : b.is_warning
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Harian Kategori
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1.5">{b.category_name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(b)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Batas Kategori"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          b.is_overspent ? 'bg-rose-500' : b.is_warning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        Terpakai: <b className="text-slate-800">{formatRupiah(b.spent_amount)}</b>
                      </span>
                      <span className="text-slate-500">
                        Batas: <b className="text-slate-800">{formatRupiah(b.target_amount)}</b>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Daily Budget Modal */}
      <DailyBudgetModal
        isOpen={isDailyModalOpen}
        onClose={() => {
          setIsDailyModalOpen(false);
          setEditingBudget(null);
        }}
        onSuccess={fetchAll}
        currentBudget={editingBudget}
        categoryId={dailyModalCategories.length > 0 ? dailyModalCategories[0]?.id : null}
        categories={dailyModalCategories}
        daysTotalInCycle={daysTotalInCycle}
      />

      {/* Goal Create / Edit Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        initialData={editingGoal}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSuccess={fetchAll}
      />

      {/* Goal Progress Quick Update Modal */}
      <GoalProgressModal
        isOpen={Boolean(progressGoal)}
        goal={progressGoal}
        onClose={() => setProgressGoal(null)}
        onSuccess={fetchAll}
      />
    </div>
  );
}
