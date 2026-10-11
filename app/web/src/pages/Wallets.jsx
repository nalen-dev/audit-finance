import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, X, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { api } from '../services/api';
import { formatRupiah } from '../utils/formatters';
import { useDialog } from '../context/DialogContext';
import TransactionModal from '../components/TransactionModal';

export default function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#10B981');
  const [error, setError] = useState('');

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const data = await api.getWallets();
      setWallets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.createWallet({
        name,
        type,
        currency: 'IDR',
        initial_balance: parseFloat(initialBalance) || 0,
        color,
        icon: 'wallet',
        is_default: wallets.length === 0,
      });
      setIsModalOpen(false);
      setName('');
      setInitialBalance('');
      fetchWallets();
    } catch (err) {
      setError(err.message);
    }
  };

  const { confirm, showToast } = useDialog();

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Hapus Dompet',
      message: 'Yakin ingin menghapus dompet ini? Dompet yang memiliki riwayat transaksi tidak dapat dihapus.',
      confirmText: 'Ya, Hapus Dompet',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteWallet(id);
      showToast('Dompet berhasil dihapus', 'success');
      fetchWallets();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const colors = ['#10B981', '#3B82F6', '#6366F1', '#EC4899', '#F59E0B', '#8B5CF6'];

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Dompet / Rekening</h1>
          <p className="text-xs sm:text-sm text-slate-500">Atur semua rekening bank, e-wallet, dan dompet fisik Anda</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-indigo-700 text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            Pindah Saldo
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Tambah Dompet
          </button>
        </div>
      </div>

      {/* Grid of Wallets */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4 hover:border-slate-300 transition-colors relative overflow-hidden shadow-xs"
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: w.color }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs"
                    style={{ backgroundColor: `${w.color}15`, color: w.color }}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      {w.name}
                      {w.is_default && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                          Utama
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 capitalize">{w.type}</p>
                  </div>
                </div>

                {!w.is_default && (
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus Dompet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Saldo Saat Ini</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  {formatRupiah(w.current_balance)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saldo Awal: {formatRupiah(w.initial_balance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Wallet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Tambah Dompet Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWallet} className="p-6 space-y-4">
              {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nama Dompet / Rekening</label>
                <input
                  type="text"
                  placeholder="Contoh: BCA, Gopay, Dompet Tunai"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipe</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="bank">Rekening Bank</option>
                  <option value="ewallet">E-Wallet (Gopay/OVO/Dana)</option>
                  <option value="cash">Uang Tunai (Cash)</option>
                  <option value="credit_card">Kartu Kredit</option>
                  <option value="investment">Investasi</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Warna Aksen</label>
                <div className="flex gap-3">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        color === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all"
                >
                  Simpan Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transfer Saldo */}
      <TransactionModal
        isOpen={isTransferOpen}
        defaultType="transfer"
        onClose={() => setIsTransferOpen(false)}
        onSuccess={fetchWallets}
      />
    </div>
  );
}
