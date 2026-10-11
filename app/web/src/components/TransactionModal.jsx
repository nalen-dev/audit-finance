import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, ShieldCheck, PiggyBank, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';

export default function TransactionModal({ isOpen, onClose, onSuccess, defaultType = 'expense', initialData = null }) {
  const { showToast } = useDialog();
  const { isAuditMode } = useAuth();
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [destinationWalletId, setDestinationWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseFund, setExpenseFund] = useState('budget'); // 'budget', 'savings', 'vault'
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setType(initialData.type || 'expense');
        setAmount(initialData.amount ? String(initialData.amount) : '');
        setWalletId(initialData.wallet_id || '');
        setDestinationWalletId(initialData.destination_wallet_id || '');
        setCategoryId(initialData.category_id || '');
        setExpenseFund(initialData.use_vault ? 'vault' : initialData.use_savings ? 'savings' : 'budget');
        setTransactionDate(initialData.transaction_date ? initialData.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setNote(initialData.note || '');
      } else {
        setType(defaultType);
        setAmount('');
        setNote('');
        setExpenseFund('budget');
        setTransactionDate(new Date().toISOString().split('T')[0]);
      }
      
      Promise.all([api.getWallets(), api.getCategories()])
        .then(([walletList, catList]) => {
          setWallets(walletList);
          if (!initialData && walletList.length > 0) {
            const defWallet = walletList.find((w) => w.is_default) || walletList[0];
            setWalletId(defWallet.id);
            const otherWallet = walletList.find((w) => w.id !== defWallet.id) || walletList[0];
            setDestinationWalletId(otherWallet.id);
          }
          setCategories(catList);
        })
        .catch((err) => setError(err.message));
    }
  }, [isOpen, defaultType, initialData]);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (filteredCategories.length > 0 && (!categoryId || !filteredCategories.some(c => c.id === categoryId))) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Nominal harus lebih dari 0');
      return;
    }
    if (!walletId) {
      setError('Pilih dompet/rekening');
      return;
    }

    if (type === 'transfer') {
      if (!destinationWalletId) {
        setError('Pilih dompet tujuan transfer');
        return;
      }
      if (walletId === destinationWalletId) {
        setError('Dompet asal dan tujuan tidak boleh sama');
        return;
      }
    } else {
      if (!categoryId) {
        setError('Pilih kategori');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (type === 'transfer') {
        const payload = {
          wallet_id: walletId,
          destination_wallet_id: destinationWalletId,
          amount: numAmount,
          type: 'transfer',
          source: initialData?.source || 'web',
          transaction_date: transactionDate,
          note: note ? note : 'Transfer saldo',
        };
        if (initialData?.id) {
          await api.updateTransaction(initialData.id, payload);
        } else {
          await api.createTransaction(payload);
        }
      } else {
        const payload = {
          wallet_id: walletId,
          category_id: categoryId,
          amount: numAmount,
          type: type,
          source: initialData?.source || 'web',
          use_savings: type === 'expense' && expenseFund === 'savings',
          use_vault: type === 'expense' && expenseFund === 'vault',
          transaction_date: transactionDate,
          note: note ? note : null,
        };
        if (initialData?.id) {
          await api.updateTransaction(initialData.id, payload);
        } else {
          await api.createTransaction(payload);
        }
      }
      showToast(
        initialData
          ? 'Perubahan transaksi berhasil disimpan!'
          : (type === 'transfer'
            ? 'Pemindahan saldo berhasil dicatat!'
            : 'Transaksi berhasil disimpan!'),
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
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {initialData
              ? 'Edit Transaksi'
              : (type === 'transfer' ? 'Pindah Saldo Antar Dompet' : 'Catat Transaksi')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Type Toggle: 3 Modes */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-700 border border-rose-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-700 border border-emerald-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'transfer'
                  ? 'bg-white text-indigo-700 border border-indigo-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
              Pindah Saldo
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nominal (Rp)</label>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            />
          </div>

          {/* Wallet Selectors */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Dari Dompet (Asal)</label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Rp {w.current_balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Ke Dompet (Tujuan)</label>
                <select
                  value={destinationWalletId}
                  onChange={(e) => setDestinationWalletId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Rp {w.current_balance.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Dompet / Rekening</label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Saldo: Rp {w.current_balance.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Selector (Only for expense and income) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Kategori</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Source of Funds Selection (Only for expense in Audit Mode) */}
          {type === 'expense' && isAuditMode && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700">Sumber Pos Dana:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Anggaran Harian */}
                <button
                  type="button"
                  onClick={() => setExpenseFund('budget')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    expenseFund === 'budget'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Jatah Harian
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Memotong Money to Spend harian biasa.
                  </p>
                </button>

                {/* 2. Tabungan Berjalan (Darurat) */}
                <button
                  type="button"
                  onClick={() => setExpenseFund('savings')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    expenseFund === 'savings'
                      ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <PiggyBank className="w-3.5 h-3.5 text-amber-600" />
                    Pos Darurat
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Keperluan tak terduga; tertutup sisa harian.
                  </p>
                </button>

                {/* 3. Tabungan Aman (Barang Mahal) */}
                <button
                  type="button"
                  onClick={() => setExpenseFund('vault')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    expenseFund === 'vault'
                      ? 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Tabungan Aman
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Barang mahal/aset; potong dana pokok aman.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Catatan (Opsional)</label>
            <input
              type="text"
              placeholder={type === 'transfer' ? 'Contoh: Tarik tunai dari ATM BCA' : 'Contoh: Makan siang geprek, bayar wifi...'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`w-1/2 py-2.5 px-4 rounded-xl text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 ${
                type === 'transfer'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {loading ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : type === 'transfer' ? 'Pindah Saldo' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
