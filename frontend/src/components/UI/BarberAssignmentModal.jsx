import React, { useState } from 'react'
import { X, Users, Clock, Scissors } from 'lucide-react'

const BarberAssignmentModal = ({ appointment, barbers, onAssign, onClose }) => {
  const [selectedBarberId, setSelectedBarberId] = useState(appointment.barber_id?._id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedBarberId) {
      return
    }

    setIsSubmitting(true)
    try {
      await onAssign(selectedBarberId)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assign Barber</h2>
              <p className="text-sm text-gray-600">Select a barber for this appointment</p>
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
          {/* Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'Africa/Addis_Ababa'
                })}
              </span>
              <span className="text-gray-400">•</span>
              <span>
                {new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Africa/Addis_Ababa'
                })}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Scissors className="h-4 w-4" />
              <span>{appointment.service_id?.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Customer: </span>
              <span className="font-medium text-gray-900">
                {appointment.customer_id?.first_name} {appointment.customer_id?.last_name}
              </span>
            </div>
          </div>

          {/* Barber Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Barber <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Choose a barber...</option>
              {barbers.map((barber) => (
                <option key={barber._id} value={barber._id}>
                  {barber.first_name} {barber.last_name}
                  {barber.email && ` - ${barber.email}`}
                </option>
              ))}
            </select>
            {barbers.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">No barbers available</p>
            )}
          </div>

          {/* Actions */}
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
              disabled={!selectedBarberId || isSubmitting}
            >
              {isSubmitting ? 'Assigning...' : 'Assign Barber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BarberAssignmentModal
