import React, { useState, useEffect } from 'react';
import { Wallet, Menu, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function Header({ onOpenMobileMenu = () => {} }) {
  const { user } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [walletCount, setWalletCount] = useState(0);

  const fetchBalance = async () => {
    try {
      const data = await api.getSummary();
      setTotalBalance(data.total_balance || 0);
      setWalletCount(data.wallets?.length || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 sm:h-18 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Menu Trigger + Brand or Desktop Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Title */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-slate-900 tracking-tight">OripioFin</span>
        </div>

        {/* Desktop Real-time Status */}
        <div className="hidden md:flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Audit Keuangan Real-Time
          </span>
        </div>
      </div>

      {/* Right: Total Saldo Riil Pill */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Total Saldo Riil
            </p>
            <p className="text-xs sm:text-base font-bold text-slate-800 tracking-tight leading-snug mt-0.5 whitespace-nowrap">
              {formatRupiah(totalBalance)}
            </p>
          </div>
          <span className="hidden sm:inline text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 ml-1 whitespace-nowrap">
            {walletCount} Dompet
          </span>
        </div>
      </div>
    </header>
  );
}
