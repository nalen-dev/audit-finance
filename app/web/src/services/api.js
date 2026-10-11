const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server');
  }
  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateTelegram: (telegramChatId) => request('/auth/telegram', { method: 'PUT', body: JSON.stringify({ telegram_chat_id: telegramChatId }) }),
  updateAppMode: (appMode) => request('/auth/mode', { method: 'PUT', body: JSON.stringify({ app_mode: appMode }) }),

  // Wallets
  getWallets: () => request('/wallets'),
  createWallet: (body) => request('/wallets', { method: 'POST', body: JSON.stringify(body) }),
  updateWallet: (id, body) => request(`/wallets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWallet: (id) => request(`/wallets/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: (type = '') => request(`/categories${type ? `?type=${type}` : ''}`),
  createCategory: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params = '') => request(`/transactions${params}`),
  createTransaction: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: () => request('/budgets'),
  setBudget: (body) => request('/budgets', { method: 'POST', body: JSON.stringify(body) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),

  // Analytics
  getSummary: () => request('/analytics/summary'),
};
