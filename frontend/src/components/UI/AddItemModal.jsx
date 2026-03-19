import React, { useState } from 'react'
import { X, Package } from 'lucide-react'
import { inventoryService } from '../../services/inventoryService'
import toast from 'react-hot-toast'

const AddItemModal = ({ onItemCreated, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    brand: '',
    cost_price: '',
    selling_price: '',
    current_stock: '',
    minimum_stock: '',
    maximum_stock: '',
    unit: 'piece',
    expiry_date: '',
    supplier: '',
    supplier_contact: '',
    image_url: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Prepare data for API
      const itemData = {
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        category: formData.category || undefined,
        brand: formData.brand || undefined,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : undefined,
        current_stock: formData.current_stock ? parseInt(formData.current_stock) : 0,
        minimum_stock: formData.minimum_stock ? parseInt(formData.minimum_stock) : 0,
        maximum_stock: formData.maximum_stock ? parseInt(formData.maximum_stock) : 1000,
        unit: formData.unit || 'piece',
        expiry_date: formData.expiry_date || undefined,
        supplier: formData.supplier || undefined,
        supplier_contact: formData.supplier_contact || undefined,
        image_url: formData.image_url || undefined,
        notes: formData.notes || undefined
      }

      const response = await inventoryService.createInventoryItem(itemData)
      
      toast.success('Inventory item created successfully!')
      
      if (onItemCreated) {
        onItemCreated(response.data)
      }

      onClose()
      // Reset form
      setFormData({
        name: '',
        description: '',
        sku: '',
        category: '',
        brand: '',
        cost_price: '',
        selling_price: '',
        current_stock: '',
        minimum_stock: '',
        maximum_stock: '',
        unit: 'piece',
        expiry_date: '',
        supplier: '',
        supplier_contact: '',
        image_url: '',
        notes: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create inventory item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Package className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Inventory Item</h2>
              <p className="text-sm text-gray-600">Create a new inventory item</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input w-full"
                required
                placeholder="e.g., Hair Clippers"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="input w-full"
                placeholder="e.g., CLIP001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="input w-full"
                placeholder="e.g., Wahl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input w-full"
                placeholder="e.g., Tools, Hair Care"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="input w-full"
              >
                <option value="piece">Piece</option>
                <option value="bottle">Bottle</option>
                <option value="tube">Tube</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="liter">Liter</option>
                <option value="kg">Kilogram</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Price (ETB)
              </label>
              <input
                type="number"
                step="0.01"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
                className="input w-full"
                placeholder="0.00"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (ETB)
              </label>
              <input
                type="number"
                step="0.01"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                className="input w-full"
                placeholder="0.00"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Stock
              </label>
              <input
                type="number"
                name="current_stock"
                value={formData.current_stock}
                onChange={handleChange}
                className="input w-full"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Stock
              </label>
              <input
                type="number"
                name="minimum_stock"
                value={formData.minimum_stock}
                onChange={handleChange}
                className="input w-full"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Stock
              </label>
              <input
                type="number"
                name="maximum_stock"
                value={formData.maximum_stock}
                onChange={handleChange}
                className="input w-full"
                placeholder="1000"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="input w-full"
                placeholder="Supplier name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Contact
              </label>
              <input
                type="text"
                name="supplier_contact"
                value={formData.supplier_contact}
                onChange={handleChange}
                className="input w-full"
                placeholder="Phone or email"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input w-full"
                rows="3"
                placeholder="Item description..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="input w-full"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input w-full"
                rows="2"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddItemModal
