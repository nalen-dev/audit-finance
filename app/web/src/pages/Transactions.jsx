import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight, 
  Plus, 
  Pencil,
  Trash2, 
  Filter, 
  RefreshCw, 
  Send, 
  Globe, 
  Calendar, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah, formatDate } from '../utils/formatters';
import { useDialog } from '../context/DialogContext';
import TransactionModal from '../components/TransactionModal';

export default function Transactions() {
  const { confirm, showToast } = useDialog();
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [typeFilter, setTypeFilter] = useState('');
  const [walletFilter, setWalletFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [editingTx, setEditingTx] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      let queryParams = `?limit=${limit}&offset=${offset}`;
      if (typeFilter) queryParams += `&type=${typeFilter}`;
      if (walletFilter) queryParams += `&wallet_id=${walletFilter}`;
      if (startDate) queryParams += `&start_date=${startDate}`;
      if (endDate) queryParams += `&end_date=${endDate}`;

      const [txRes, walletList, catList] = await Promise.all([
        api.getTransactions(queryParams),
        api.getWallets(),
        api.getCategories(),
      ]);

      const list = Array.isArray(txRes) ? txRes : (txRes.transactions || []);
      const totalCount = Array.isArray(txRes) ? txRes.length : (txRes.total ?? list.length);

      setTransactions(list);
      setTotal(totalCount);
      setWallets(walletList);
      setCategories(catList);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, typeFilter, walletFilter, startDate, endDate]);

  const handleFilterChange = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setTypeFilter('');
    setWalletFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(typeFilter || walletFilter || startDate || endDate);
  const totalPages = Math.ceil(total / limit) || 1;

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Hapus Transaksi',
      message: 'Yakin ingin menghapus transaksi ini? Saldo dompet akan disesuaikan kembali secara otomatis.',
      confirmText: 'Ya, Hapus Transaksi',
      type: 'danger',
    });
    if (!ok) return;

    try {
      await api.deleteTransaction(id);
      showToast('Transaksi berhasil dihapus', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEdit = (tx) => {
    setEditingTx(tx);
    setModalType(tx.type);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Riwayat Transaksi</h1>
          <p className="text-xs sm:text-sm text-slate-500">Semua catatan pemasukan, pengeluaran, dan perpindahan saldo</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingTx(null);
              setModalType('transfer');
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            Pindah Saldo
          </button>
          <button
            onClick={() => {
              setEditingTx(null);
              setModalType('expense');
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter:
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => handleFilterChange(setTypeFilter)(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Tipe</option>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
            <option value="transfer">Pindah Saldo</option>
          </select>

          {/* Wallet Filter */}
          <select
            value={walletFilter}
            onChange={(e) => handleFilterChange(setWalletFilter)(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleFilterChange(setStartDate)(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              title="Tanggal Mulai"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleFilterChange(setEndDate)(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              title="Tanggal Selesai"
            />
          </div>

          {/* Reset Filter Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Limit Selector */}
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
          <span>Tampilkan:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none font-medium"
          >
            <option value={10}>10 baris</option>
            <option value={20}>20 baris</option>
            <option value={50}>50 baris</option>
          </select>
        </div>
      </div>

      {/* Transactions Container: Desktop Table + Mobile Cards */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center flex justify-center">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Tidak ada transaksi yang cocok dengan filter.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Kategori & Catatan</th>
                    <th className="px-6 py-4">Dompet</th>
                    <th className="px-6 py-4">Sumber</th>
                    <th className="px-6 py-4 text-right">Nominal</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                              tx.type === 'income'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : tx.type === 'transfer'
                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}
                          >
                            {tx.type === 'income' ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : tx.type === 'transfer' ? (
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-900">{tx.category_name}</p>
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
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                                  Pos Darurat
                                </span>
                              )}
                            </div>
                            {tx.note && tx.note !== tx.category_name && <p className="text-xs text-slate-400">{tx.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap">
                        {tx.wallet_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 inline-flex items-center gap-1.5 font-medium">
                          {tx.source === 'telegram' ? <Send className="w-3 h-3 text-sky-600" /> : <Globe className="w-3 h-3 text-slate-500" />}
                          {tx.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap font-bold">
                        <span className={tx.type === 'income' ? 'text-emerald-700' : tx.type === 'transfer' ? 'text-indigo-700' : 'text-slate-900'}>
                          {tx.type === 'income' ? `+${formatRupiah(tx.amount)}` : tx.type === 'transfer' ? formatRupiah(tx.amount) : `-${formatRupiah(tx.amount)}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors mr-1"
                          title="Edit transaksi"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Standar Tampilan HP) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 text-sm truncate">{tx.category_name}</p>
                          {tx.type === 'transfer' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                              Transfer
                            </span>
                          )}
                          {tx.use_vault && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                              Vault
                            </span>
                          )}
                          {tx.use_savings && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                              Pos Darurat
                            </span>
                          )}
                        </div>
                        {tx.note && tx.note !== tx.category_name && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{tx.note}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
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
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{tx.wallet_name}</span>
                      <span className="text-slate-300">•</span>
                      <span>{formatDate(tx.transaction_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 inline-flex items-center gap-1 font-medium">
                        {tx.source === 'telegram' ? <Send className="w-2.5 h-2.5 text-sky-600" /> : <Globe className="w-2.5 h-2.5" />}
                        {tx.source}
                      </span>
                      <button
                        onClick={() => handleEdit(tx)}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors ml-1"
                        title="Edit transaksi"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Table Footer with Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="text-center sm:text-left">
              Menampilkan <span className="font-semibold text-slate-900">{total === 0 ? 0 : (page - 1) * limit + 1}</span> - <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> dari <span className="font-semibold text-slate-900">{total}</span> transaksi
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-slate-800 shadow-xs">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-xs"
              >
                Berikutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        onSuccess={fetchData}
        defaultType={modalType}
        initialData={editingTx}
      />
    </div>
  );
}
