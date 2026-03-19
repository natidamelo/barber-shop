import React, { useState, useEffect } from 'react'
import { X, Save, Loader, Plus, Trash2, Package } from 'lucide-react'
import { serviceService } from '../../services/serviceService'
import { useInventory } from '../../hooks/useInventory'
import toast from 'react-hot-toast'

const ServiceEditModal = ({ service, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: '',
    shop_cut: '',
    is_active: true
  })
  const [inventoryItems, setInventoryItems] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Fetch inventory items for selection
  const { data: inventoryData = { data: [] } } = useInventory({ limit: 100 })
  const availableInventory = inventoryData.data || []

  const isCreate = !service

  // Update form data when service prop or open state changes
  useEffect(() => {
    if (!isOpen) return
    if (service) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        price: service.price || '',
        duration: service.duration || '',
        category: service.category || '',
        shop_cut: service.shop_cut || '',
        is_active: service.is_active ?? true
      })
      if (service.requirements && service.requirements.inventory_items) {
        setInventoryItems(service.requirements.inventory_items.map(item => ({
          inventory_id: item.inventory_id || item.id || '',
          quantity: item.quantity || 1
        })))
      } else {
        setInventoryItems([])
      }
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        duration: '',
        category: '',
        shop_cut: '',
        is_active: true
      })
      setInventoryItems([])
    }
  }, [service, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleAddInventoryItem = () => {
    setInventoryItems([...inventoryItems, { inventory_id: '', quantity: 1 }])
  }

  const handleRemoveInventoryItem = (index) => {
    setInventoryItems(inventoryItems.filter((_, i) => i !== index))
  }

  const handleInventoryItemChange = (index, field, value) => {
    const updated = [...inventoryItems]
    updated[index] = { ...updated[index], [field]: field === 'quantity' ? parseFloat(value) || 1 : value }
    setInventoryItems(updated)
  }

  const buildPayload = () => {
    const data = { ...formData }
    if (data.shop_cut !== '' && data.shop_cut != null) {
      data.shop_cut = parseFloat(data.shop_cut)
      if (isNaN(data.shop_cut) || data.shop_cut < 0) return null
    } else {
      data.shop_cut = 0
    }
    if (inventoryItems.length > 0 && inventoryItems.some(item => item.inventory_id)) {
      data.requirements = {
        inventory_items: inventoryItems
          .filter(item => item.inventory_id)
          .map(item => ({
            inventory_id: item.inventory_id,
            quantity: item.quantity || 1
          }))
      }
    } else {
      data.requirements = {}
    }
    return data
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)
    try {
      const payload = buildPayload()
      if (!payload) {
        toast.error('Shop cut must be a valid positive number')
        setLoading(false)
        return
      }

      const { name, description, price, duration, category, shop_cut, is_active, requirements } = payload
      const send = {
        name: name.trim(),
        description: (description || '').trim(),
        price: parseFloat(price),
        duration: parseInt(duration, 10),
        category: (category || '').trim(),
        shop_cut,
        is_active,
        requirements
      }

      if (isCreate) {
        await serviceService.createService(send)
        toast.success('Service created successfully!')
      } else {
        await serviceService.updateService(service._id, send)
        toast.success('Service updated successfully! Commissions will be recalculated automatically.')
      }
      onUpdate()
      onClose()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || (isCreate ? 'Failed to create service' : 'Failed to update service')
      toast.error(errorMessage)
      console.error(isCreate ? 'Error creating service:' : 'Error updating service:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{isCreate ? 'Add New Service' : 'Edit Service'}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select Category</option>
                <option value="Haircuts">Haircuts</option>
                <option value="Beard Services">Beard Services</option>
                <option value="Shave Services">Shave Services</option>
                <option value="Premium Services">Premium Services</option>
                <option value="Styling">Styling</option>
                <option value="Special Offers">Special Offers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (ETB)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="input"
                min="1"
                max="480"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Cut (ETB)
                <span className="text-gray-500 text-xs ml-2">(Fixed amount shop takes)</span>
              </label>
              <input
                type="number"
                name="shop_cut"
                value={formData.shop_cut}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.01"
                placeholder="e.g., 400"
              />
              <p className="mt-1 text-xs text-gray-500">
                Fixed amount the shop takes from each service. Barber gets percentage of remaining amount.
              </p>
              {/* Calculation Preview */}
              {formData.price && formData.shop_cut && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Calculation Preview:</p>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>Service Price: <strong>{parseFloat(formData.price || 0).toFixed(2)} ETB</strong></p>
                    <p>Shop Cut: <strong>-{parseFloat(formData.shop_cut || 0).toFixed(2)} ETB</strong></p>
                    <p>Remaining: <strong>{(parseFloat(formData.price || 0) - parseFloat(formData.shop_cut || 0)).toFixed(2)} ETB</strong></p>
                    <p className="pt-1 border-t border-blue-200">
                      Barber gets: <strong>X%</strong> of remaining (set in barber's commission %)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="input"
              placeholder="Describe the service..."
            />
          </div>

          {/* Inventory Requirements Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-primary-600" />
                  Inventory Requirements
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Specify which inventory items are used when this service is performed. These will be automatically deducted when appointments are completed.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddInventoryItem}
                className="btn btn-sm btn-secondary flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No inventory items configured</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Item" to specify products used for this service</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventoryItems.map((item, index) => {
                  const selectedItem = availableInventory.find(inv => 
                    (inv._id || inv.id) === item.inventory_id
                  )
                  
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Inventory Item
                        </label>
                        <select
                          value={item.inventory_id}
                          onChange={(e) => handleInventoryItemChange(index, 'inventory_id', e.target.value)}
                          className="input text-sm"
                        >
                          <option value="">Select an item...</option>
                          {availableInventory
                            .filter(inv => inv.is_active !== false && (inv.current_stock || 0) > 0)
                            .map(inv => (
                              <option key={inv._id || inv.id} value={inv._id || inv.id}>
                                {inv.name} {inv.current_stock ? `(Stock: ${inv.current_stock} ${inv.unit || 'pcs'})` : ''}
                              </option>
                            ))}
                        </select>
                        {selectedItem && (
                          <p className="text-xs text-gray-500 mt-1">
                            Cost: {selectedItem.cost_price ? `${selectedItem.cost_price.toFixed(2)} ETB` : 'N/A'} per {selectedItem.unit || 'piece'}
                          </p>
                        )}
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleInventoryItemChange(index, 'quantity', e.target.value)}
                          className="input text-sm"
                          placeholder="1"
                        />
                      </div>
                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={() => handleRemoveInventoryItem(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {inventoryItems.length > 0 && inventoryItems.some(item => item.inventory_id) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-2">Cost Calculation Preview:</p>
                <div className="text-xs text-blue-800 space-y-1">
                  {inventoryItems
                    .filter(item => item.inventory_id)
                    .map((item, idx) => {
                      const invItem = availableInventory.find(inv => 
                        (inv._id || inv.id) === item.inventory_id
                      )
                      const itemCost = invItem?.cost_price || 0
                      const totalCost = itemCost * (item.quantity || 1)
                      return (
                        <p key={idx}>
                          {invItem?.name || 'Unknown'}: {item.quantity || 1} × {itemCost.toFixed(2)} ETB = <strong>{totalCost.toFixed(2)} ETB</strong>
                        </p>
                      )
                    })}
                  <p className="pt-2 border-t border-blue-200 font-semibold">
                    Total COGS per service: <strong>
                      {inventoryItems
                        .filter(item => item.inventory_id)
                        .reduce((sum, item) => {
                          const invItem = availableInventory.find(inv => 
                            (inv._id || inv.id) === item.inventory_id
                          )
                          return sum + ((invItem?.cost_price || 0) * (item.quantity || 1))
                        }, 0)
                        .toFixed(2)} ETB
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Service is active and available for booking
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>{isCreate ? 'Creating...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{isCreate ? 'Create Service' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ServiceEditModal