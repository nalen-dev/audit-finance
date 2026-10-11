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

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'transactions' && <Transactions />}
          {activeTab === 'wallets' && <Wallets />}
          {activeTab === 'budgets' && <Budgets />}
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
