import React, { useState } from 'react';
import { X, Check, CheckCircle2, ShieldCheck, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

export default function ModeSelectionModal({ isOpen, onClose, canDismiss = true }) {
  const { user, updateAppMode } = useAuth();
  const { showToast } = useDialog();
  const [selectedMode, setSelectedMode] = useState(user?.app_mode || 'audit');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateAppMode(selectedMode);
      showToast(
        selectedMode === 'audit'
          ? 'Mode Audit aktif! Seluruh fitur target anggaran & Money to Spend dapat digunakan.'
          : 'Mode Basic aktif! Tampilan disederhanakan untuk pencatatan cepat.',
        'success'
      );
      if (onClose) onClose();
    } catch (err) {
      showToast(err.message || 'Gagal mengubah mode aplikasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pilih Mode Pengalaman Keuangan
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sesuaikan fitur aplikasi dengan kebutuhan Anda. Anda dapat beralih mode kapan saja.
            </p>
          </div>
          {canDismiss && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Cards */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mode Basic Card */}
            <div
              onClick={() => setSelectedMode('basic')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                selectedMode === 'basic'
                  ? 'border-emerald-600 bg-emerald-50/30 shadow-md ring-2 ring-emerald-600/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  {selectedMode === 'basic' ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 font-semibold">
                      Sederhana
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">Mode Basic</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pencatatan kas masuk & keluar sederhana tanpa target anggaran rumit.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-2 text-xs">
                  <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Fitur yang Tersedia:
                  </p>
                  <ul className="space-y-1.5 text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Catat pengeluaran & pemasukan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Kelola rekening/dompet & pindah saldo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Personalisasi kategori</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-slate-300">-</span>
                      <span>Tanpa target harian/mingguan/bulanan</span>
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-slate-300">-</span>
                      <span>Tanpa Money to Spend & tabungan pos</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-3 text-[11px] text-slate-400 font-medium">
                Cocok untuk pengguna yang butuh pencatat buku kas harian cepat.
              </div>
            </div>

            {/* Mode Audit Card */}
            <div
              onClick={() => setSelectedMode('audit')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                selectedMode === 'audit'
                  ? 'border-emerald-600 bg-emerald-50/30 shadow-md ring-2 ring-emerald-600/10'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  {selectedMode === 'audit' ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                      Rekomendasi
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    Mode Audit
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                      Lengkap
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Audit keuangan disiplin dengan jatah belanja harian & proteksi tabungan.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-2 text-xs">
                  <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Semua Fitur Basic, Ditambah:
                  </p>
                  <ul className="space-y-1.5 text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Pelacak <strong>Money to Spend</strong> harian</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Target anggaran Harian, Mingguan, Bulanan</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tabungan Berjalan (akumulasi sisa hemat)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tabungan Aman / Vault (proteksi barang mahal)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Deteksi overspending & pos darurat</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-3 text-[11px] text-slate-400 font-medium">
                Cocok untuk mengaudit pengeluaran dan membangun tabungan nyata.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Mode aktif: <strong className="text-slate-800 uppercase">{selectedMode}</strong>
          </p>
          <div className="flex gap-2">
            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white transition-colors"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? 'Menerapkan...' : 'Terapkan Mode'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
