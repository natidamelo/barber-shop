import React, { useState } from 'react'
import { X, DollarSign, CreditCard, Wallet, Globe, MoreHorizontal } from 'lucide-react'
import { formatDateInAddisAbaba } from '../../utils/dateUtils'

const BillManagementModal = ({ appointment, onUpdate, onClose }) => {
  const [paymentStatus, setPaymentStatus] = useState(appointment.payment_status || 'pending')
  const [paymentMethod, setPaymentMethod] = useState(appointment.payment_method || '')
  // Support multiple services - use total_price if available, otherwise single service price (read-only)
  const initialPrice = appointment.total_price || appointment.price || appointment.service_id?.price || 0
  const price = initialPrice // Original price is not editable
  const [amountPaid, setAmountPaid] = useState(appointment.amount_paid || 0)
  // When partially paid, user enters only the amount to pay now (remaining), not full total
  const [amountToPayNow, setAmountToPayNow] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Check if this is a multi-service appointment
  const allServices = appointment.all_services || []
  const hasMultipleServices = allServices.length > 1

  // When already fully paid, bill is read-only and cannot be edited
  const isFullyPaid = appointment.payment_status === 'paid'
  // Partially paid: show already paid + remaining; input is "amount to pay now" only
  const isPartiallyPaid = appointment.payment_status === 'partially_paid'
  const existingAmountPaid = parseFloat(appointment.amount_paid) || 0
  const remaining = Math.max(0, (parseFloat(price) || 0) - existingAmountPaid)

  // Calculate payment status based on amount_paid vs price
  const calculatePaymentStatus = (paid, total) => {
    const paidAmount = parseFloat(paid) || 0
    const totalAmount = parseFloat(total) || 0
    
    if (paidAmount === 0) {
      return 'pending'
    } else if (paidAmount >= totalAmount) {
      return 'paid'
    } else {
      return 'partially_paid'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isFullyPaid) return
    setIsSubmitting(true)
    try {
      const totalPrice = parseFloat(price) || 0
      // Partially paid: new total = existing paid + amount paid now (capped at price)
      const finalAmountPaid = isPartiallyPaid
        ? Math.min(totalPrice, existingAmountPaid + (parseFloat(amountToPayNow) || 0))
        : (parseFloat(amountPaid) || 0)
      const finalPaymentStatus = calculatePaymentStatus(finalAmountPaid, totalPrice)

      await onUpdate({
        payment_status: finalPaymentStatus,
        payment_method: paymentMethod || undefined,
        price: totalPrice,
        amount_paid: finalAmountPaid
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Wallet },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'online', label: 'Online', icon: Globe },
    { value: 'other', label: 'Other', icon: MoreHorizontal }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Bill</h2>
              <p className="text-sm text-gray-600">
                {isFullyPaid ? 'View payment details (fully paid – not editable)' : 'Update payment status and method'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isFullyPaid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-green-800">✓ Already fully paid – view only (not editable)</p>
            </div>
          )}
          {/* Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <span className="text-gray-600">Customer: </span>
              <span className="font-medium text-gray-900">
                {appointment.customer_id?.first_name} {appointment.customer_id?.last_name}
              </span>
            </div>
            
            {/* Services - Single or Multiple */}
            {hasMultipleServices ? (
              <div className="text-sm">
                <span className="text-gray-600">Services ({allServices.length}): </span>
                <div className="mt-2 space-y-1">
                  {allServices.map((service, index) => (
                    <div key={service._id || index} className="flex items-center justify-between pl-4">
                      <span className="font-medium text-gray-900">{service.name}</span>
                      <span className="text-gray-600">{service.price?.toFixed(2) || '0.00'} ETB</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <span className="text-gray-600">Service: </span>
                <span className="font-medium text-gray-900">
                  {appointment.service_id?.name || allServices[0]?.name}
                </span>
              </div>
            )}
            
            <div className="text-sm">
              <span className="text-gray-600">Date: </span>
              <span className="font-medium text-gray-900">
                {formatDateInAddisAbaba(appointment.appointment_date, { includeWeekday: true })}
              </span>
            </div>
          </div>

          {/* Price (read-only - original price cannot be changed) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {hasMultipleServices ? 'Total Price' : 'Price'} (ETB)
              {hasMultipleServices && (
                <span className="text-xs text-gray-500 ml-2">
                  ({allServices.length} service{allServices.length > 1 ? 's' : ''})
                </span>
              )}
            </label>
            <div className="input w-full bg-gray-100 cursor-not-allowed flex items-center justify-between" title="Original price cannot be changed">
              <span className="font-medium text-gray-900">{Number(price).toFixed(2)} ETB</span>
              <span className="text-xs text-gray-500">Read-only</span>
            </div>
            {hasMultipleServices && (
              <p className="text-xs text-gray-500 mt-1">
                Breakdown: {allServices.map(s => `${s.name} (${s.price?.toFixed(2) || '0.00'} ETB)`).join(' + ')}
              </p>
            )}
          </div>

          {/* Amount Paid / Amount to pay now */}
          <div>
            {isFullyPaid ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid (ETB)</label>
                <div className="input w-full bg-gray-100 cursor-not-allowed flex items-center justify-between" title="Fully paid – cannot be edited">
                  <span className="font-medium text-gray-900">{Number(amountPaid).toFixed(2)} ETB</span>
                  <span className="text-xs text-gray-500">✓ Fully paid</span>
                </div>
              </>
            ) : isPartiallyPaid ? (
              <>
                <div className="space-y-2 mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Already paid</span>
                    <span className="font-medium text-gray-900">{existingAmountPaid.toFixed(2)} ETB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining</span>
                    <span className="font-medium text-orange-600">{remaining.toFixed(2)} ETB</span>
                  </div>
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to pay now (ETB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remaining}
                  value={amountToPayNow}
                  onChange={(e) => {
                    const val = e.target.value
                    setAmountToPayNow(val)
                    const newTotalPaid = existingAmountPaid + (parseFloat(val) || 0)
                    setPaymentStatus(calculatePaymentStatus(newTotalPaid, price))
                  }}
                  className="input w-full"
                  placeholder={`0 - ${remaining.toFixed(2)}`}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const payNow = parseFloat(amountToPayNow) || 0
                    const newTotalPaid = existingAmountPaid + payNow
                    const status = calculatePaymentStatus(newTotalPaid, price)
                    if (status === 'paid') return '✓ Will be fully paid'
                    return `Remaining after this: ${(remaining - payNow).toFixed(2)} ETB`
                  })()}
                </p>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Paid (ETB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={price}
                  value={amountPaid}
                  onChange={(e) => {
                    const newAmountPaid = e.target.value
                    setAmountPaid(newAmountPaid)
                    setPaymentStatus(calculatePaymentStatus(newAmountPaid, price))
                  }}
                  className="input w-full"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const paid = parseFloat(amountPaid) || 0
                    const total = parseFloat(price) || 0
                    const rem = Math.max(0, total - paid)
                    const status = calculatePaymentStatus(paid, total)
                    if (status === 'paid') return '✓ Fully paid'
                    if (status === 'partially_paid') return `Remaining: ${rem.toFixed(2)} ETB`
                    return `Total: ${total.toFixed(2)} ETB`
                  })()}
                </p>
              </>
            )}
          </div>

          {/* Payment Status Display (Auto-determined) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Status <span className="text-gray-500 text-xs">(Auto-determined)</span>
            </label>
            <div className="input w-full bg-gray-50 cursor-not-allowed flex items-center">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                paymentStatus === 'partially_paid' ? 'bg-orange-100 text-orange-800' :
                paymentStatus === 'refunded' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {paymentStatus?.replace('_', ' ') || 'pending'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Status is automatically set based on amount paid
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            {isFullyPaid ? (
              <div className="input w-full bg-gray-100 cursor-not-allowed flex items-center" title="Fully paid – cannot be edited">
                <span className="font-medium text-gray-900 capitalize">{paymentMethod || appointment.payment_method || '—'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                        paymentMethod === method.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Current Status Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Current Status</p>
                <p className="text-xs text-blue-700 mt-1">
                  {appointment.payment_status?.replace('_', ' ') || 'Pending'} • {appointment.payment_method || 'Not specified'}
                  {appointment.payment_status === 'partially_paid' && appointment.amount_paid > 0 && (
                    <span> • Paid: {appointment.amount_paid.toFixed(2)} ETB</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-900">
                  {(appointment.total_price || appointment.price || 0).toFixed(2)} ETB
                </p>
                {hasMultipleServices && (
                  <p className="text-xs text-blue-700 mt-1">
                    {allServices.length} service{allServices.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {appointment.payment_status !== 'paid' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true)
                  try {
                    const totalPrice = parseFloat(price) || 0
                    setAmountPaid(totalPrice)
                    await onUpdate({
                      payment_status: 'paid',
                      payment_method: paymentMethod || 'cash',
                      price: totalPrice,
                      amount_paid: totalPrice
                    })
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                className="w-full btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : '✓ Mark as Paid'}
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            {isFullyPaid ? (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
              >
                Close
              </button>
            ) : (
              <>
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
                  {isSubmitting ? 'Updating...' : 'Update Payment'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default BillManagementModal
