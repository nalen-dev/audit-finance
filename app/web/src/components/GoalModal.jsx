import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';
import { useDialog } from '../context/DialogContext';
import GoalIcon, { GOAL_ICON_OPTIONS } from './GoalIcon';

const GOAL_COLORS = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];

export default function GoalModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const { showToast } = useDialog();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState('target');
  const [color, setColor] = useState('#10B981');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setName(initialData.name || '');
        setTargetAmount(initialData.target_amount ? String(initialData.target_amount) : '');
        setCurrentAmount(initialData.current_amount !== undefined ? String(initialData.current_amount) : '0');
        setTargetDate(initialData.target_date ? initialData.target_date.split('T')[0] : '');
        setIcon(initialData.icon || 'target');
        setColor(initialData.color || '#10B981');
        setNote(initialData.note || '');
      } else {
        setName('');
        setTargetAmount('');
        setCurrentAmount('0');
        setTargetDate('');
        setIcon('target');
        setColor('#10B981');
        setNote('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;

    if (!name.trim()) {
      setError('Nama target wajib diisi');
      return;
    }
    if (!target || target <= 0) {
      setError('Nominal target harus lebih dari 0');
      return;
    }
    if (current < 0) {
      setError('Dana terkumpul tidak boleh negatif');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        target_amount: target,
        current_amount: current,
        target_date: targetDate || null,
        icon,
        color,
        note: note.trim() || null,
      };
      if (initialData?.id) {
        await api.updateGoal(initialData.id, payload);
        showToast('Target anggaran berhasil diperbarui!', 'success');
      } else {
        await api.createGoal(payload);
        showToast('Target anggaran baru berhasil ditambahkan!', 'success');
      }
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {initialData ? 'Edit Target Anggaran' : 'Tambah Target Anggaran Baru'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nama Target</label>
            <input
              type="text"
              placeholder="Contoh: Liburan ke Bali, Beli HP Baru, Dana Nikah..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nominal Target (Rp)</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 10000000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {initialData ? 'Dana Terkumpul (Rp)' : 'Dana Terkumpul Awal (Rp)'}
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tenggat Target (Opsional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Ikon Target</label>
            <div className="grid grid-cols-4 gap-2">
              {GOAL_ICON_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIcon(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-[11px] font-medium transition-all ${
                    icon === item.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GoalIcon name={item.id} className="w-4 h-4" />
                  <span className="truncate max-w-full">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Warna Aksen</label>
            <div className="flex gap-3">
              {GOAL_COLORS.map((c) => (
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

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Catatan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Nabung bertahap tiap gajian..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
            Target ini dilacak secara mandiri dan tidak memotong saldo dompet maupun Tabungan Aman Anda.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : initialData ? 'Simpan Perubahan' : 'Buat Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
