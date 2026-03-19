import React, { useState } from 'react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { inventoryService } from '../../services/inventoryService'
import toast from 'react-hot-toast'

const StockAdjustModal = ({ item, type, onStockAdjusted, onClose }) => {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const quantityInt = parseInt(quantity)
    if (!quantity || quantityInt <= 0 || isNaN(quantityInt)) {
      toast.error('Please enter a valid positive integer quantity')
      return
    }

    setIsSubmitting(true)

    try {
      const adjustmentData = {
        quantity: quantityInt, // Backend expects integer, and handles sign based on transaction_type
        transaction_type: type === 'add' ? 'purchase' : 'usage', // Valid types: 'purchase', 'usage', 'adjustment', 'waste', 'return'
        notes: reason || undefined // Backend expects 'notes' not 'reason'
      }

      // Remove undefined values to avoid sending them
      Object.keys(adjustmentData).forEach(key => {
        if (adjustmentData[key] === undefined) {
          delete adjustmentData[key]
        }
      })

      await inventoryService.adjustStock(item._id || item.id, adjustmentData)
      
      toast.success(`Stock ${type === 'add' ? 'added' : 'removed'} successfully!`)
      
      if (onStockAdjusted) {
        onStockAdjusted()
      }

      onClose()
      setQuantity('')
      setReason('')
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || `Failed to ${type === 'add' ? 'add' : 'remove'} stock`
      console.error('Stock adjustment error:', error)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${type === 'add' ? 'bg-green-100' : 'bg-red-100'}`}>
              {type === 'add' ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {type === 'add' ? 'Add Stock' : 'Remove Stock'}
              </h2>
              <p className="text-sm text-gray-600">{item.name}</p>
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
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Current Stock</div>
            <div className="text-2xl font-bold text-gray-900">
              {item.current_stock} {item.unit}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity {type === 'add' ? 'to Add' : 'to Remove'} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input w-full"
              required
              placeholder="0"
              min="1"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full"
              rows="3"
              placeholder="e.g., Restocked from supplier, Used for service..."
            />
          </div>

          {type === 'add' && quantity && !isNaN(parseInt(quantity)) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-900">
                <strong>New Stock:</strong> {parseInt(item.current_stock || 0) + parseInt(quantity)} {item.unit}
              </div>
            </div>
          )}

          {type === 'remove' && quantity && !isNaN(parseInt(quantity)) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-900">
                <strong>New Stock:</strong> {Math.max(0, parseInt(item.current_stock || 0) - parseInt(quantity))} {item.unit}
              </div>
            </div>
          )}

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
              className={`btn btn-primary ${type === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : type === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StockAdjustModal
