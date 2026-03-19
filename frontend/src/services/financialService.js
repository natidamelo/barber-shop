import api from './api';

export const financialService = {
  // Get financial summary
  getFinancialSummary: async (params = {}) => {
    const response = await api.get('/financial/summary', { params });
    return response.data;
  },

  // Get all operating expenses
  getOperatingExpenses: async (params = {}) => {
    const response = await api.get('/financial/expenses', { params });
    return response.data;
  },

  // Create new operating expense
  createOperatingExpense: async (expenseData) => {
    const response = await api.post('/financial/expenses', expenseData);
    return response.data;
  },

  // Update operating expense
  updateOperatingExpense: async (id, expenseData) => {
    const response = await api.put(`/financial/expenses/${id}`, expenseData);
    return response.data;
  },

  // Delete operating expense
  deleteOperatingExpense: async (id) => {
    const response = await api.delete(`/financial/expenses/${id}`);
    return response.data;
  }
};
