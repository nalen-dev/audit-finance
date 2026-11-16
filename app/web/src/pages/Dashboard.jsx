import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Send,
  Globe,
  Coins,
  CalendarDays,
  ShieldCheck,
  ArrowLeftRight,
  Target,
  Star,
  Pencil,
} from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah, formatDate, formatTime, getPercentColor, emitFinanceUpdated } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import TransactionModal from '../components/TransactionModal';
import GoalCard from '../components/GoalCard';
import GoalModal from '../components/GoalModal';
import GoalProgressModal from '../components/GoalProgressModal';
import DailyBudgetModal from '../components/DailyBudgetModal';

export default function Dashboard({ setActiveTab, onOpenCycleModal = () => {} }) {
  const { isAuditMode } = useAuth();
  const { confirm, showToast } = useDialog();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');

  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [progressGoal, setProgressGoal] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getSummary();
      setSummary(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const openAddModal = (type) => {
    setModalType(type);
    setIsModalOpen(true);
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
      fetchSummary();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const hasDailyTarget = Boolean(summary?.daily_budget && summary.daily_target > 0);
  const goals = summary?.goals || [];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto w-full">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Overview Keuangan</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isAuditMode
              ? 'Audit harian, kuota belanja riil, dan target tujuan pribadi'
              : 'Pencatatan kas masuk, kas keluar, dan saldo dompet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => openAddModal('transfer')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-indigo-700 text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            Pindah Saldo
          </button>
          <button
            onClick={() => openAddModal('income')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            Pemasukan
          </button>
          <button
            onClick={() => openAddModal('expense')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* Active Financial Cycle Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 border border-indigo-100/90 text-slate-700 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Siklus Keuangan: {summary?.cycle_start_date ? formatDate(summary.cycle_start_date) : '-'} &ndash; {summary?.cycle_end_date ? formatDate(summary.cycle_end_date) : '-'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                Cutoff Tgl {summary?.budget_cycle_start_day || 1}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary?.days_remaining_in_cycle ?? 0} hari tersisa menuju tanggal cutoff / gajian berikutnya
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-center">
          {isAuditMode && (summary?.daily_pacing_remaining || 0) > 0 && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Rekomendasi Pacing</span>
              <span className="text-xs font-bold text-indigo-600">{formatRupiah(summary.daily_pacing_remaining)} / hari</span>
            </div>
          )}
          <button
            onClick={onOpenCycleModal}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all shadow-2xs whitespace-nowrap"
          >
            Ubah Tanggal Cutoff
          </button>
        </div>
      </div>

      {/* Overspending Alerts Banner (Audit Mode Only) */}
      {isAuditMode && summary?.overspending_alerts && summary.overspending_alerts.length > 0 && (
        <div className="space-y-3">
          {summary.overspending_alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 ${
                alert.percentage >= 100
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.percentage >= 100 ? 'text-rose-600' : 'text-amber-600'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold">{alert.title}</p>
                <p className="text-[11px] sm:text-xs opacity-90 mt-0.5">{alert.message}</p>
              </div>
              <span className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-white border ${alert.percentage >= 100 ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}`}>
                {alert.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Metric Cards: Branch by Mode */}
      {!isAuditMode ? (
        /* Mode Basic: Cash Flow Metrics */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Total Saldo Riil */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Total Saldo Riil
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {summary?.wallets?.length || 0} Dompet
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {formatRupiah(summary?.total_balance)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Akumulasi seluruh rekening aktif</p>
            </div>
          </div>

          {/* 2. Pengeluaran Periode Ini */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                Pengeluaran (Periode Ini)
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-rose-600">
                {formatRupiah(summary?.monthly_expense)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Total arus kas keluar siklus berjalan</p>
            </div>
          </div>

          {/* 3. Pemasukan Periode Ini */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                Pemasukan (Periode Ini)
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-emerald-700">
                {formatRupiah(summary?.monthly_income)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Total arus kas masuk siklus berjalan</p>
            </div>
          </div>

          {/* 4. Arus Kas Bersih */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Arus Kas Bersih
              </span>
            </div>
            <div>
              <p className={`text-2xl font-bold tracking-tight ${
                (summary?.monthly_income || 0) - (summary?.monthly_expense || 0) >= 0 ? 'text-indigo-700' : 'text-rose-600'
              }`}>
                {formatRupiah((summary?.monthly_income || 0) - (summary?.monthly_expense || 0))}
              </p>
              <p className="text-xs text-slate-400 mt-1">Selisih arus kas dalam siklus aktif</p>
            </div>
          </div>
        </div>
      ) : (
        /* Mode Audit: Highlighted Money to Spend & Real Balances */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Money to Spend Hari Ini (Primary Highlight) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-emerald-500/80 space-y-2.5 sm:space-y-3 shadow-md shadow-emerald-600/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
              {hasDailyTarget ? 'Target Harian' : 'Rekomendasi Pacing'}
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                Money to Spend
              </span>
            </div>
            <div>
              <p className={`text-2xl font-bold tracking-tight ${
                summary?.money_to_spend_today < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}>
                {hasDailyTarget
                  ? formatRupiah(summary?.money_to_spend_today)
                  : (summary?.daily_pacing_remaining > 0 ? formatRupiah(summary.daily_pacing_remaining) : 'Belum diatur')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {hasDailyTarget ? (
                  <>Jatah: {formatRupiah(summary.daily_target)} &bull; Pakai: {formatRupiah(summary.today_expense)}</>
                ) : summary?.daily_pacing_remaining > 0 ? (
                  <>Pacing sisa {summary?.days_remaining_in_cycle || 0} hari menuju cutoff</>
                ) : (
                  <button onClick={() => setIsDailyModalOpen(true)} className="text-emerald-700 underline font-medium">
                    Atur target harian &rarr;
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* 2. Sisa Kuota Siklus Ini */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-sky-600" />
                Sisa Kuota Siklus Ini
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                {summary?.days_remaining_in_cycle || 0} Hari Sisa
              </span>
            </div>
            <div>
              <p className={`text-2xl font-bold tracking-tight ${
                hasDailyTarget && summary.money_to_spend_month < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}>
                {hasDailyTarget ? formatRupiah(summary.money_to_spend_month) : 'Belum diatur'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {hasDailyTarget
                  ? `${formatRupiah(summary.daily_target)}/hari × ${summary?.days_remaining_in_cycle || 0} hari`
                  : 'Atur target harian terlebih dahulu'}
              </p>
            </div>
          </div>

          {/* 3. Tabungan Berjalan (Siklus Ini) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-emerald-600" />
                Tabungan Berjalan (Siklus Ini)
              </span>
            </div>
            <div>
              <p className={`text-2xl font-bold tracking-tight ${
                (summary?.monthly_savings_pool || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}>
                {formatRupiah(summary?.monthly_savings_pool)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {(summary?.monthly_savings_pool || 0) < 0
                  ? 'Defisit tabungan (tertutup bertahap dari sisa daily)'
                  : 'Akumulasi sisa hemat harian siklus ini'}
              </p>
            </div>
          </div>

          {/* 4. Tabungan Aman (Vault) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Tabungan Aman (Vault)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Bebas Pakai
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700 tracking-tight">
                {formatRupiah(summary?.safe_vault_amount)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Sisa saldo riil di luar alokasi hidup s/d gajian
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Targets & Daily Limit Section (Audit Mode Only) */}
      {isAuditMode && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Target Anggaran &amp; Impian</h2>
              <p className="text-xs text-slate-500">
                Kelola target harian serta target tambahan Anda (liburan, beli HP baru, dll.)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setIsGoalModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Target
              </button>
              <button
                onClick={() => setActiveTab('budgets')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Kelola Semua &rarr;
              </button>
            </div>
          </div>

          {/* Compact Daily Target Status Strip */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    Batas Belanja Harian: {hasDailyTarget ? formatRupiah(summary.daily_target) : 'Belum diatur'}
                  </span>
                  {summary?.daily_budget && (
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${getPercentColor(summary.daily_budget.percentage)}`}>
                      {summary.daily_budget.percentage.toFixed(0)}% terpakai
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {hasDailyTarget
                    ? 'Menjadi dasar perhitungan Money to Spend, Sisa Kuota Siklus, dan Tabungan Aman.'
                    : 'Atur batas harian untuk mengaktifkan kalkulasi otomatis kuota siklus & Tabungan Aman.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDailyModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-all shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              {hasDailyTarget ? 'Ubah Batas Harian' : 'Atur Batas Harian'}
            </button>
          </div>

          {/* Custom Goals Grid */}
          {goals.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-center space-y-2">
              <Target className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Belum ada target anggaran tambahan</p>
              <p className="text-[11px] text-slate-400">
                Tambahkan target pribadi Anda sendiri seperti Liburan, Beli HP Baru, Dana Darurat, dll.
              </p>
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setIsGoalModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Buat target pertama sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}

      {/* Bottom Split: Wallets & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallets Widget */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Daftar Dompet</h2>
            <button
              onClick={() => setActiveTab('wallets')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Kelola &rarr;
            </button>
          </div>
          <div className="space-y-2.5">
            {summary?.wallets && summary.wallets.length > 0 ? (
              summary.wallets.slice(0, 3).map((wallet) => (
                <div
                  key={wallet.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    wallet.is_default
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                      style={{ backgroundColor: `${wallet.color}20`, color: wallet.color }}
                    >
                      {wallet.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{wallet.name}</p>
                        {wallet.is_default && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-0.5 shrink-0">
                            <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 capitalize">{wallet.type}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0 ml-2 tabular-nums">
                    {formatRupiah(wallet.current_balance)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada dompet</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Transaksi Terbaru</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold border border-slate-200/60">
                4 Terakhir
              </span>
            </div>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Lihat Semua &rarr;
            </button>
          </div>

          <div className="space-y-2">
            {summary?.recent_transactions && summary.recent_transactions.length > 0 ? (
              summary.recent_transactions.slice(0, 4).map((tx) => {
                const timeLabel = formatTime(tx.transaction_time);
                return (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : tx.type === 'transfer'
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : tx.type === 'transfer' ? (
                        <ArrowLeftRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900 truncate">{tx.category_name}</p>
                        {tx.type === 'transfer' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            Pindah Saldo
                          </span>
                        )}
                        {tx.use_vault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            Tabungan Aman (Vault)
                          </span>
                        )}
                        {tx.use_savings && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                            Pos Darurat
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-medium flex items-center gap-1">
                          {tx.source === 'telegram' ? <Send className="w-2.5 h-2.5 text-sky-600" /> : <Globe className="w-2.5 h-2.5" />}
                          {tx.source}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{tx.wallet_name}</span>
                        <span className="text-slate-300">•</span>
                        <span>
                          {formatDate(tx.transaction_date)}
                          {timeLabel ? `, ${timeLabel}` : ''}
                        </span>
                        {tx.note && tx.note !== tx.category_name && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 font-medium">{tx.note}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        tx.type === 'income'
                          ? 'text-emerald-700'
                          : tx.type === 'transfer'
                          ? 'text-indigo-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'income'
                        ? `+${formatRupiah(tx.amount)}`
                        : tx.type === 'transfer'
                        ? formatRupiah(tx.amount)
                        : `-${formatRupiah(tx.amount)}`}
                    </p>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <p className="text-sm">Belum ada transaksi</p>
                <button
                  onClick={() => openAddModal('expense')}
                  className="text-xs text-emerald-600 underline font-medium"
                >
                  Catat transaksi pertama Anda sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        defaultType={modalType}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          emitFinanceUpdated();
          fetchSummary();
        }}
      />

      {/* Daily Budget Modal */}
      <DailyBudgetModal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        onSuccess={fetchSummary}
        currentBudget={summary?.daily_budget || null}
        daysTotalInCycle={summary?.days_total_in_cycle || 30}
      />

      {/* Goal Create / Edit Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        initialData={editingGoal}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSuccess={fetchSummary}
      />

      {/* Goal Progress Quick Update Modal */}
      <GoalProgressModal
        isOpen={Boolean(progressGoal)}
        goal={progressGoal}
        onClose={() => setProgressGoal(null)}
        onSuccess={fetchSummary}
      />
    </div>
  );
}
