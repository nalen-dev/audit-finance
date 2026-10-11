import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Wallet, Target, Tags, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ activeTab, setActiveTab, onOpenMore }) {
  const { isAuditMode } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: ArrowLeftRight },
    { id: 'wallets', label: 'Dompet', icon: Wallet },
    ...(isAuditMode
      ? [{ id: 'budgets', label: 'Target', icon: Target }]
      : [{ id: 'categories', label: 'Kategori', icon: Tags }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-1.5 flex items-center justify-around md:hidden shadow-lg safe-area-pb">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
              isActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-emerald-50 text-emerald-700' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
          </button>
        );
      })}

      {/* Menu / Lainnya Drawer Trigger */}
      <button
        onClick={onOpenMore}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-medium transition-all ${
          activeTab === 'categories' || activeTab === 'telegram'
            ? 'text-emerald-700 font-bold'
            : ''
        }`}
      >
        <div className={`p-1 rounded-lg transition-colors ${activeTab === 'categories' || activeTab === 'telegram' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Lainnya</span>
      </button>
    </nav>
  );
}
