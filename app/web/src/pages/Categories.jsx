import React, { useState, useEffect } from 'react';
import { Tags, Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useDialog } from '../context/DialogContext';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('expense');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#EF4444');
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      await api.createCategory({
        name,
        code: code.trim().toUpperCase() || null,
        type: activeTab,
        icon: 'tag',
        color,
      });
      setIsModalOpen(false);
      setName('');
      setCode('');
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const { confirm, showToast } = useDialog();

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Hapus Kategori',
      message: 'Apakah Anda yakin ingin menghapus kategori kustom ini?',
      confirmText: 'Ya, Hapus Kategori',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await api.deleteCategory(id);
      showToast('Kategori berhasil dihapus', 'success');
      fetchCategories();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Personalisasi Kategori</h1>
          <p className="text-xs sm:text-sm text-slate-500">Atur kategori bawaan dan tambahkan kategori khusus kebutuhan Anda</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Tambah Kategori ({activeTab === 'expense' ? 'Pengeluaran' : 'Pemasukan'})
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl w-fit shadow-xs">
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'expense'
              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Kategori Pengeluaran
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'income'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Kategori Pemasukan
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                  style={{ backgroundColor: `${c.color}15`, color: c.color }}
                >
                  <Tags className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                    {c.code && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {c.code}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {c.is_default ? 'Bawaan Sistem' : 'Kustom Personal'}
                  </p>
                </div>
              </div>

              {!c.is_default && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  title="Hapus Kategori"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                Tambah Kategori {activeTab === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{error}</div>}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nama Kategori</label>
                <input
                  type="text"
                  placeholder="Contoh: Kopi & Cafe, Langganan Netflix..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Kode Bot Telegram (Opsional, 2 Huruf)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Contoh: KP, NF"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Digunakan untuk shortcut Telegram, misal: <span className="font-mono text-slate-600 font-semibold">25k {code || 'KP'} -o latte</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Warna Aksen</label>
                <div className="flex gap-3">
                  {colors.map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setColor(clr)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        color === clr ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: clr }}
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
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
