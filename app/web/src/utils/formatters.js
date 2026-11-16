export function formatRupiah(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  const isNegative = amount < 0;
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return isNegative ? `-${formatted}` : formatted;
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const normalized = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(timeString) {
  if (!timeString) return '';
  const match = String(timeString).match(/(\d{2}):(\d{2})/);
  if (!match) return '';
  return `${match[1]}:${match[2]}`;
}

export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTimeString(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function emitFinanceUpdated() {
  window.dispatchEvent(new CustomEvent('finance:updated'));
}

export function getPercentColor(percentage) {
  if (percentage >= 100) return 'text-rose-700 bg-rose-50 border-rose-200';
  if (percentage >= 80) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
}
