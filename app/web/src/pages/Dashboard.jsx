import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
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
  ArrowLeftRight
} from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah, formatDate, getPercentColor } from '../utils/formatters';
import TransactionModal from '../components/TransactionModal';

export default function Dashboard({ setActiveTab }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');

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

  if (loading && !summary) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const hasDailyTarget = summary?.daily_budget && summary.daily_target > 0;
  const hasMonthlyTarget = summary?.monthly_budget && summary.monthly_target > 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Overview Keuangan</h1>
          <p className="text-xs sm:text-sm text-slate-500">Audit harian, kuota belanja riil, dan pelacakan anggaran</p>
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

      {/* Overspending Alerts Banner */}
      {summary?.overspending_alerts && summary.overspending_alerts.length > 0 && (
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

      {/* Main Metric Cards: Highlighted Money to Spend & Real Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Money to Spend Hari Ini (Primary Highlight) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-emerald-500/80 space-y-2.5 sm:space-y-3 shadow-md shadow-emerald-600/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
            Hari Ini
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-600" />
              Money to Spend
            </span>
          </div>
          <div>
            <p className={`text-2xl font-bold tracking-tight ${
              hasDailyTarget && summary.money_to_spend_today < 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}>
              {hasDailyTarget ? formatRupiah(summary.money_to_spend_today) : 'Belum diatur'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {hasDailyTarget ? (
                <>Jatah: {formatRupiah(summary.daily_target)} &bull; Pakai: {formatRupiah(summary.today_expense)}</>
              ) : (
                <button onClick={() => setActiveTab('budgets')} className="text-emerald-700 underline font-medium">
                  Atur target harian &rarr;
                </button>
              )}
            </p>
          </div>
        </div>

        {/* 2. Sisa Kuota Bulan Ini */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-sky-600" />
              Sisa Kuota Bulan Ini
            </span>
          </div>
          <div>
            <p className={`text-2xl font-bold tracking-tight ${
              hasMonthlyTarget && summary.money_to_spend_month < 0 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {hasMonthlyTarget ? formatRupiah(summary.money_to_spend_month) : 'Belum diatur'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {hasMonthlyTarget ? `Dari limit bulanan ${formatRupiah(summary.monthly_target)}` : 'Sinkron dari target'}
            </p>
          </div>
        </div>

        {/* 3. Tabungan Berjalan Bulan Ini */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              Tabungan Berjalan (Bulan Ini)
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
                : 'Akumulasi sisa hemat harian bulan ini'}
            </p>
          </div>
        </div>

        {/* 4. Tabungan Aman (Vault) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Tabungan Aman / Vault
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-700 tracking-tight">
              {formatRupiah(summary?.safe_vault_amount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Saldo cadangan aman & dana pokok</p>
          </div>
        </div>
      </div>

      {/* Target Tracker Section */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pelacakan Target Anggaran (Budget Tracker)</h2>
            <p className="text-xs text-slate-500">Pantau sisa kuota yang masih bisa digunakan setiap harinya</p>
          </div>
          <button
            onClick={() => setActiveTab('budgets')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Atur Target &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Target Harian</span>
              <span className={`px-2 py-0.5 rounded font-bold border ${summary?.daily_budget ? getPercentColor(summary.daily_budget.percentage) : 'text-slate-400 bg-white border-slate-200'}`}>
                {summary?.daily_budget ? `${summary.daily_budget.percentage.toFixed(0)}%` : 'Belum diatur'}
              </span>
            </div>
            {summary?.daily_budget ? (
              <>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      summary.daily_budget.percentage >= 100 ? 'bg-rose-500' : summary.daily_budget.percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(summary.daily_budget.percentage, 100)}%` }}
                  />
                </div>
                {/* Sisa yang masih bisa digunakan */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Sisa Bisa Dipakai:</span>
                  <span className={`font-bold ${summary.daily_budget.remaining_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {summary.daily_budget.remaining_amount < 0 
                      ? `Overspent (${formatRupiah(Math.abs(summary.daily_budget.remaining_amount))})` 
                      : formatRupiah(summary.daily_budget.remaining_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Terpakai: {formatRupiah(summary.daily_budget.spent_amount)}</span>
                  <span>Batas: {formatRupiah(summary.daily_budget.target_amount)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">Klik 'Atur Target' untuk menetapkan batas harian</p>
            )}
          </div>

          {/* Weekly Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Target Mingguan</span>
              <span className={`px-2 py-0.5 rounded font-bold border ${summary?.weekly_budget ? getPercentColor(summary.weekly_budget.percentage) : 'text-slate-400 bg-white border-slate-200'}`}>
                {summary?.weekly_budget ? `${summary.weekly_budget.percentage.toFixed(0)}%` : 'Belum diatur'}
              </span>
            </div>
            {summary?.weekly_budget ? (
              <>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      summary.weekly_budget.percentage >= 100 ? 'bg-rose-500' : summary.weekly_budget.percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(summary.weekly_budget.percentage, 100)}%` }}
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Sisa Bisa Dipakai:</span>
                  <span className={`font-bold ${summary.weekly_budget.remaining_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {summary.weekly_budget.remaining_amount < 0 
                      ? `Overspent (${formatRupiah(Math.abs(summary.weekly_budget.remaining_amount))})` 
                      : formatRupiah(summary.weekly_budget.remaining_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Terpakai: {formatRupiah(summary.weekly_budget.spent_amount)}</span>
                  <span>Batas: {formatRupiah(summary.weekly_budget.target_amount)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">Klik 'Atur Target' untuk menetapkan batas mingguan</p>
            )}
          </div>

          {/* Monthly Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Target Bulanan</span>
              <span className={`px-2 py-0.5 rounded font-bold border ${summary?.monthly_budget ? getPercentColor(summary.monthly_budget.percentage) : 'text-slate-400 bg-white border-slate-200'}`}>
                {summary?.monthly_budget ? `${summary.monthly_budget.percentage.toFixed(0)}%` : 'Belum diatur'}
              </span>
            </div>
            {summary?.monthly_budget ? (
              <>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      summary.monthly_budget.percentage >= 100 ? 'bg-rose-500' : summary.monthly_budget.percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(summary.monthly_budget.percentage, 100)}%` }}
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Sisa Bisa Dipakai:</span>
                  <span className={`font-bold ${summary.monthly_budget.remaining_amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {summary.monthly_budget.remaining_amount < 0 
                      ? `Overspent (${formatRupiah(Math.abs(summary.monthly_budget.remaining_amount))})` 
                      : formatRupiah(summary.monthly_budget.remaining_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Terpakai: {formatRupiah(summary.monthly_budget.spent_amount)}</span>
                  <span>Batas: {formatRupiah(summary.monthly_budget.target_amount)}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">Klik 'Atur Target' untuk menetapkan batas bulanan</p>
            )}
          </div>
        </div>
      </div>

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
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: `${wallet.color}20`, color: wallet.color }}
                    >
                      {wallet.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{wallet.name}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{wallet.type}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
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
              summary.recent_transactions.slice(0, 4).map((tx) => (
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
                        <span>{formatDate(tx.transaction_date)}</span>
                        {tx.note && tx.note !== tx.category_name && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600 font-medium">{tx.note}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-bold ${
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
              ))
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

      {/* Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        defaultType={modalType}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSummary}
      />
    </div>
  );
}
