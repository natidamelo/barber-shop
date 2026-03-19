import api from './api';

export const inventoryService = {
  // Get all inventory items
  getInventory: async (params = {}) => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  // Get single inventory item
  getInventoryItem: async (id) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  // Create new inventory item
  createInventoryItem: async (itemData) => {
    const response = await api.post('/inventory', itemData);
    return response.data;
  },

  // Update inventory item
  updateInventoryItem: async (id, itemData) => {
    const response = await api.put(`/inventory/${id}`, itemData);
    return response.data;
  },

  // Adjust stock
  adjustStock: async (id, adjustmentData) => {
    const response = await api.post(`/inventory/${id}/adjust`, adjustmentData);
    return response.data;
  },

  // Get low stock items
  getLowStockItems: async () => {
    const response = await api.get('/inventory/low-stock');
    return response.data;
  },

  // Get inventory categories
  getCategories: async () => {
    const response = await api.get('/inventory/categories');
    return response.data;
  },

  // Delete inventory item
  deleteInventoryItem: async (id) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  }
};