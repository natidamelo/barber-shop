import React, { useState, useEffect } from 'react'
import { X, Package } from 'lucide-react'
import { inventoryService } from '../../services/inventoryService'
import toast from 'react-hot-toast'

const EditItemModal = ({ item, onItemUpdated, onClose }) => {
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

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        sku: item.sku || '',
        category: item.category || '',
        brand: item.brand || '',
        cost_price: item.cost_price !== undefined && item.cost_price !== null ? String(item.cost_price) : '',
        selling_price: item.selling_price !== undefined && item.selling_price !== null ? String(item.selling_price) : '',
        current_stock: item.current_stock !== undefined && item.current_stock !== null ? String(item.current_stock) : '',
        minimum_stock: item.minimum_stock !== undefined && item.minimum_stock !== null ? String(item.minimum_stock) : '',
        maximum_stock: item.maximum_stock !== undefined && item.maximum_stock !== null ? String(item.maximum_stock) : '',
        unit: item.unit || 'piece',
        expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : '',
        supplier: item.supplier || '',
        supplier_contact: item.supplier_contact || '',
        image_url: item.image_url || '',
        notes: item.notes || ''
      })
    }
  }, [item])

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
      const itemData = {
        name: formData.name?.trim() || '',
        description: formData.description?.trim() || undefined,
        sku: formData.sku?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        brand: formData.brand?.trim() || undefined,
        cost_price: formData.cost_price && formData.cost_price.toString().trim() ? parseFloat(formData.cost_price) : undefined,
        selling_price: formData.selling_price && formData.selling_price.toString().trim() ? parseFloat(formData.selling_price) : undefined,
        current_stock: formData.current_stock && formData.current_stock.toString().trim() ? parseInt(formData.current_stock) : undefined,
        minimum_stock: formData.minimum_stock && formData.minimum_stock.toString().trim() ? parseInt(formData.minimum_stock) : undefined,
        maximum_stock: formData.maximum_stock && formData.maximum_stock.toString().trim() ? parseInt(formData.maximum_stock) : undefined,
        unit: formData.unit || 'piece',
        expiry_date: formData.expiry_date?.trim() || undefined,
        supplier: formData.supplier?.trim() || undefined,
        supplier_contact: formData.supplier_contact?.trim() || undefined,
        image_url: formData.image_url?.trim() || undefined,
        notes: formData.notes?.trim() || undefined
      }

      // Remove undefined and empty string values
      Object.keys(itemData).forEach(key => {
        if (itemData[key] === undefined || itemData[key] === '') {
          delete itemData[key]
        }
      })

      const response = await inventoryService.updateInventoryItem(item._id || item.id, itemData)
      
      toast.success('Inventory item updated successfully!')
      
      if (onItemUpdated) {
        onItemUpdated(response.data)
      }

      onClose()
    } catch (error) {
      console.error('Update inventory error:', error)
      toast.error(error.response?.data?.error || 'Failed to update inventory item')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Package className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Inventory Item</h2>
              <p className="text-sm text-gray-600">Update inventory item details</p>
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
              {isSubmitting ? 'Updating...' : 'Update Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditItemModal
