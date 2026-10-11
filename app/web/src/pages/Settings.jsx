import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, setUser } = useAuth();
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.telegram_chat_id) {
      setChatId(user.telegram_chat_id.toString());
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const parsedId = chatId ? parseInt(chatId, 10) : null;

    try {
      await api.updateTelegram(parsedId);
      const updatedUser = await api.me();
      setUser(updatedUser);
      setMessage('Telegram Chat ID berhasil disimpan!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Integrasi Telegram Bot</h1>
        <p className="text-xs sm:text-sm text-slate-500">Hubungkan bot Telegram Anda agar dapat mencatat pengeluaran secara kilat</p>
      </div>

      {/* Status Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Status Koneksi Telegram</h2>
            <div className="flex items-center gap-2 mt-1">
              {user?.telegram_chat_id ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terhubung (Chat ID: {user.telegram_chat_id})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Belum Terhubung
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-100">
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Telegram Chat ID Anda
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Contoh: 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Guide Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Cara Menghubungkan Telegram Anda:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 leading-relaxed">
          <li>
            Buka aplikasi Telegram dan cari bot Anda (atau ketik <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 font-semibold">@userinfobot</code> untuk mengetahui ID Telegram Anda).
          </li>
          <li>Kirim pesan <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 font-semibold">/start</code> ke bot tersebut.</li>
          <li>Salin nomor ID yang Anda dapatkan, lalu masukkan ke dalam kolom <b>Telegram Chat ID</b> di atas dan klik <b>Simpan</b>.</li>
          <li>
            Sekarang Anda bisa langsung mengirim pesan ke bot untuk mencatat transaksi secara otomatis, misalnya:
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-emerald-800 space-y-1">
              <p>&gt; 25000 Makan siang dompet=Dompet Utama</p>
              <p>&gt; 150000 Bensin pertamax</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
