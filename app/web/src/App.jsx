import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Wallets from './pages/Wallets';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import { RefreshCw } from 'lucide-react';

import MobileBottomNav from './components/MobileBottomNav';
import ModeSelectionModal from './components/ModeSelectionModal';
import BudgetCycleModal from './components/BudgetCycleModal';

function MainApp() {
  const { user, loading, isAuditMode, updateBudgetCycleDay } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);

  // If user is in basic mode, redirect away from budgets
  React.useEffect(() => {
    if (!isAuditMode && activeTab === 'budgets') {
      setActiveTab('dashboard');
    }
  }, [isAuditMode, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const showInitialModeModal = Boolean(user) && !user.app_mode;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenModeModal={() => setIsModeModalOpen(true)}
          onOpenCycleModal={() => setIsCycleModalOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} onOpenCycleModal={() => setIsCycleModalOpen(true)} />}
          {activeTab === 'transactions' && <Transactions />}
          {activeTab === 'wallets' && <Wallets />}
          {activeTab === 'budgets' && isAuditMode && <Budgets />}
          {activeTab === 'categories' && <Categories />}
          {activeTab === 'telegram' && <Settings />}
        </main>
        
        {/* Mobile Fixed Bottom Nav */}
        <MobileBottomNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenMore={() => setIsMobileMenuOpen(true)} 
        />
      </div>

      {/* Mode Selection / Switcher Modal */}
      <ModeSelectionModal
        isOpen={isModeModalOpen || showInitialModeModal}
        canDismiss={!showInitialModeModal}
        onClose={() => setIsModeModalOpen(false)}
      />

      {/* Dynamic Budget Cycle Modal */}
      <BudgetCycleModal
        isOpen={isCycleModalOpen}
        currentDay={user?.budget_cycle_start_day || 1}
        onClose={() => setIsCycleModalOpen(false)}
        onSaved={async (day) => {
          await updateBudgetCycleDay(day);
          window.location.reload();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <MainApp />
      </DialogProvider>
    </AuthProvider>
  );
}
