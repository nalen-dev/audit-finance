import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Menu, Sparkles, ShieldCheck, BookOpen, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function Header({
  onOpenMobileMenu = () => {},
  onOpenModeModal = () => {},
  onOpenCycleModal = () => {},
}) {
  const { user, isAuditMode } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [walletCount, setWalletCount] = useState(0);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await api.getSummary();
      setTotalBalance(data.total_balance || 0);
      setWalletCount(data.wallets?.length || 0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    window.addEventListener('finance:updated', fetchBalance);
    return () => {
      clearInterval(interval);
      window.removeEventListener('finance:updated', fetchBalance);
    };
  }, [fetchBalance]);

  return (
    <header className="bg-white border-b border-slate-200/80 shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Main Bar */}
      <div className="h-14 md:h-16 px-3.5 sm:px-6 md:px-8 flex items-center justify-between gap-2">
        {/* Left: Mobile Menu Trigger + Brand or Desktop Status */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 -ml-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors shrink-0"
            title="Buka Menu"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 md:hidden min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-slate-900 tracking-tight truncate">
              OripioFin
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isAuditMode ? 'Audit Keuangan Real-Time' : 'Pencatatan Keuangan Basic'}
            </span>
          </div>
        </div>

        {/* Right: Quick Action Pills + Desktop Balance Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Siklus Cutoff Button */}
          <button
            onClick={onOpenCycleModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-[11px] sm:text-xs font-semibold border bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
            title="Atur tanggal cutoff siklus bulanan (gajian)"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">Siklus:</span>
            <span>Tgl {user?.budget_cycle_start_day || 1}</span>
          </button>

          {/* Mode Switcher Button */}
          <button
            onClick={onOpenModeModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
              isAuditMode
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
            }`}
            title="Klik untuk beralih mode aplikasi"
          >
            {isAuditMode ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            )}
            <span className="hidden sm:inline">Mode:</span>
            <span>{isAuditMode ? 'Audit' : 'Basic'}</span>
          </button>

          {/* Total Saldo Riil Pill (Desktop) */}
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                Total Saldo Riil
              </p>
              <p className="text-base font-bold text-slate-800 tracking-tight leading-snug mt-0.5 whitespace-nowrap tabular-nums">
                {formatRupiah(totalBalance)}
              </p>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 ml-1 whitespace-nowrap">
              {walletCount} Dompet
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Compact Balance Sub-Bar */}
      <div className="md:hidden px-3.5 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Total Saldo Riil
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shrink-0 whitespace-nowrap">
            {walletCount} Dompet
          </span>
        </div>
        <span className="text-xs font-bold text-slate-900 tracking-tight whitespace-nowrap shrink-0 tabular-nums">
          {formatRupiah(totalBalance)}
        </span>
      </div>
    </header>
  );
}
