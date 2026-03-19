import React, { useState } from 'react'
import { 
  Search, 
  Plus, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  BarChart3,
  ShoppingCart,
  Minus
} from 'lucide-react'
import { useInventory, useLowStockItems } from '../../hooks/useInventory'
import { useQueryClient } from 'react-query'
import AddItemModal from '../../components/UI/AddItemModal'
import EditItemModal from '../../components/UI/EditItemModal'
import StockAdjustModal from '../../components/UI/StockAdjustModal'
import { inventoryService } from '../../services/inventoryService'
import toast from 'react-hot-toast'

const InventoryManagement = () => {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [showEditItem, setShowEditItem] = useState(false)
  const [showStockAdjust, setShowStockAdjust] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [stockAdjustType, setStockAdjustType] = useState('add')
  const queryClient = useQueryClient()

  // Fetch real inventory data
  const { data: inventoryData = { data: [] }, isLoading, error } = useInventory({
    page: 1,
    limit: 100
  })
  
  const { data: lowStockData = { data: [] } } = useLowStockItems()

  const inventory = inventoryData.data || []
  const lowStockItems = lowStockData.data || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading inventory...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Inventory</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    )
  }

  const getStockStatus = (item) => {
    if (item.current_stock <= 0) return { status: 'out_of_stock', label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    if (item.current_stock <= item.minimum_stock) return { status: 'low_stock', label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' }
    if (item.current_stock >= item.maximum_stock) return { status: 'overstock', label: 'Overstock', color: 'bg-purple-100 text-purple-800' }
    return { status: 'in_stock', label: 'In Stock', color: 'bg-green-100 text-green-800' }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'low_stock' && item.current_stock <= item.minimum_stock) ||
      (selectedFilter === 'in_stock' && item.current_stock > item.minimum_stock) ||
      (item.category && item.category.toLowerCase() === selectedFilter.toLowerCase())
    
    const matchesSearch = searchQuery === '' || 
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesFilter && matchesSearch
  })

  const statusFilters = [
    { key: 'all', label: 'All Items', count: inventory.length },
    { key: 'in_stock', label: 'In Stock', count: inventory.filter(i => i.current_stock > i.minimum_stock).length },
    { key: 'low_stock', label: 'Low Stock', count: inventory.filter(i => i.current_stock <= i.minimum_stock).length },
    { key: 'out_of_stock', label: 'Out of Stock', count: inventory.filter(i => i.current_stock <= 0).length }
  ]

  const handleItemCreated = () => {
    queryClient.invalidateQueries(['inventory'])
    queryClient.invalidateQueries(['lowStockItems'])
  }

  const handleItemUpdated = () => {
    queryClient.invalidateQueries(['inventory'])
    queryClient.invalidateQueries(['lowStockItems'])
    queryClient.invalidateQueries(['inventoryItem'])
  }

  const handleStockAdjusted = () => {
    queryClient.invalidateQueries(['inventory'])
    queryClient.invalidateQueries(['lowStockItems'])
    queryClient.invalidateQueries(['inventoryItem'])
  }

  const handleEditItem = (item) => {
    setSelectedItem(item)
    setShowEditItem(true)
  }

  const handleAddStock = (item) => {
    setSelectedItem(item)
    setStockAdjustType('add')
    setShowStockAdjust(true)
  }

  const handleRemoveStock = (item) => {
    setSelectedItem(item)
    setStockAdjustType('remove')
    setShowStockAdjust(true)
  }

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await inventoryService.deleteInventoryItem(item._id || item.id)
      toast.success('Inventory item deleted successfully!')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['lowStockItems'])
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete inventory item')
    }
  }

  const handleCloseModals = () => {
    setShowAddItem(false)
    setShowEditItem(false)
    setShowStockAdjust(false)
    setSelectedItem(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track products, stock levels, and reorder alerts</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Reports</span>
          </button>
          <button 
            onClick={() => setShowAddItem(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="p-6 text-center">
            <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            <p className="text-sm text-gray-600">Total Items</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {inventory.filter(i => i.current_stock <= i.minimum_stock).length}
            </p>
            <p className="text-sm text-gray-600">Low Stock Alerts</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {inventory.reduce((sum, i) => sum + (i.current_stock * i.cost_price), 0).toFixed(0)} ETB
            </p>
            <p className="text-sm text-gray-600">Inventory Value</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <ShoppingCart className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {inventory.filter(i => i.current_stock <= i.minimum_stock).length}
            </p>
            <p className="text-sm text-gray-600">Need Reorder</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedFilter === filter.key
                  ? 'bg-primary-100 text-primary-800 border border-primary-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{filter.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                selectedFilter === filter.key ? 'bg-primary-200' : 'bg-gray-200'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            className="input pl-10 w-full lg:w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => {
                  const stockStatus = getStockStatus(item)
                  return (
                    <tr key={item._id || item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{item.name || 'Unnamed Item'}</div>
                            <div className="text-sm text-gray-500">
                              {item.sku && `SKU: ${item.sku}`} {item.sku && item.brand && ' • '} {item.brand || ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {item.current_stock} {item.unit}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                              {stockStatus.status === 'low_stock' && <AlertTriangle className="w-3 h-3 mr-1" />}
                              {stockStatus.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Min: {item.minimum_stock} • Max: {item.maximum_stock}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{item.category || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {item.selling_price ? item.selling_price.toFixed(2) : '0.00'} ETB
                          </div>
                          <div className="text-xs text-gray-500">
                            Cost: {item.cost_price ? item.cost_price.toFixed(2) : '0.00'} ETB
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.supplier || 'N/A'}</div>
                        <div className="text-xs text-gray-500">
                          Last restocked: {item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleAddStock(item)}
                            className="text-blue-600 hover:text-blue-900" 
                            title="Add Stock"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleRemoveStock(item)}
                            className="text-red-600 hover:text-red-900" 
                            title="Remove Stock"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleEditItem(item)}
                            className="text-primary-600 hover:text-primary-900" 
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-600 hover:text-red-900" 
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Low Stock Alert</h4>
              <p className="text-sm text-red-700">
                {lowStockItems.length} items need restocking:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.map(item => (
                  <span key={item._id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn btn-sm btn-primary">
              Create Reorder List
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button 
          onClick={() => setShowAddItem(true)}
          className="card p-4 hover:shadow-md transition-shadow"
        >
          <div className="text-center">
            <Plus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Add New Item</p>
          </div>
        </button>
        <button className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Bulk Restock</p>
          </div>
        </button>
        <button className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Usage Reports</p>
          </div>
        </button>
        <button className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Set Alerts</p>
          </div>
        </button>
      </div>

      {/* Modals */}
      {showAddItem && (
        <AddItemModal
          onItemCreated={handleItemCreated}
          onClose={handleCloseModals}
        />
      )}

      {showEditItem && selectedItem && (
        <EditItemModal
          item={selectedItem}
          onItemUpdated={handleItemUpdated}
          onClose={handleCloseModals}
        />
      )}

      {showStockAdjust && selectedItem && (
        <StockAdjustModal
          item={selectedItem}
          type={stockAdjustType}
          onStockAdjusted={handleStockAdjusted}
          onClose={handleCloseModals}
        />
      )}
    </div>
  )
}

export default InventoryManagement