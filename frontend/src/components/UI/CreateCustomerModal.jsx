import React, { useState } from 'react'
import { X, UserPlus, Mail, Phone, Scissors, Droplets } from 'lucide-react'
import { userService } from '../../services/userService'
import { useWashers, useBarbers } from '../../hooks/useUsers'
import CreateAppointmentModal from './CreateAppointmentModal'
import toast from 'react-hot-toast'

const CreateCustomerModal = ({ onCustomerCreated, onClose }) => {
  const { data: washersData = { data: [] } } = useWashers()
  const { data: barbersData = { data: [] } } = useBarbers()
  const washers = washersData.data || []
  const barbers = barbersData.data || []
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })
  const [washAfterCut, setWashAfterCut] = useState(false)
  const [washerId, setWasherId] = useState('')
  const [barberId, setBarberId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addServiceAfter, setAddServiceAfter] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [createdCustomerId, setCreatedCustomerId] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await userService.createUser({
        ...formData,
        role: 'customer',
        wash_after_cut: washAfterCut,
        ...(washerId && { washer_id: washerId }),
        ...(barberId && { barber_id: barberId })
      })
      
      const customerData = response.data
      
      if (customerData.temp_password) {
        toast.success(
          `Customer created! Temporary password: ${customerData.temp_password}`,
          { duration: 8000 }
        )
      } else {
        toast.success('Customer created successfully!')
      }
      
      if (onCustomerCreated) {
        onCustomerCreated(customerData)
      }

      // If "Add Service" option is checked, open appointment modal
      if (addServiceAfter && customerData._id) {
        setCreatedCustomerId(customerData._id)
        setShowAppointmentModal(true)
        // Don't close the modal yet - wait for appointment creation
      } else {
        onClose()
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: ''
        })
        setWashAfterCut(false)
        setWasherId('')
        setBarberId('')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create customer')
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
              <UserPlus className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Customer</h2>
              <p className="text-sm text-gray-600">Add a new customer to the system</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="input w-full"
                required
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="input w-full"
                required
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-1" />
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input w-full"
              required
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input w-full"
              placeholder="+1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Scissors className="h-4 w-4 inline mr-1" />
              Barber (who cuts this customer)
            </label>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="input w-full"
            >
              <option value="">Select barber...</option>
              {barbers.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.first_name} {b.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> A temporary password will be generated automatically. The customer can set their own password when they first log in.
            </p>
          </div>

          {/* Wash after cut preference */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={washAfterCut}
                onChange={(e) => setWashAfterCut(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Droplets className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-medium text-sky-900">
                    Wash him after the cut
                  </span>
                </div>
                <p className="text-xs text-sky-700 mt-1">
                  Customer prefers a wash after their haircut. Barbers will see this when serving them.
                </p>
                {washAfterCut && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-sky-900 mb-1">Washer name</label>
                    <select
                      value={washerId}
                      onChange={(e) => setWasherId(e.target.value)}
                      className="input w-full text-sm mt-1"
                    >
                      <option value="">Select washer...</option>
                      {washers.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.first_name} {w.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Add Service Option */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addServiceAfter}
                onChange={(e) => setAddServiceAfter(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Scissors className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Add service and send to billing
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  After creating the customer, you'll be able to immediately add a service/appointment and manage billing.
                </p>
              </div>
            </label>
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
              {isSubmitting ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>

        {/* Appointment Modal - shown after customer creation if option is checked */}
        {showAppointmentModal && createdCustomerId && (
          <CreateAppointmentModal
            defaultCustomerId={createdCustomerId}
            onAppointmentCreated={() => {
              toast.success('Service added and ready for billing!')
              setShowAppointmentModal(false)
              setCreatedCustomerId(null)
              setAddServiceAfter(false)
              onClose()
              // Reset form
              setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: ''
              })
              setWashAfterCut(false)
              setWasherId('')
              setBarberId('')
            }}
            onClose={() => {
              setShowAppointmentModal(false)
              setCreatedCustomerId(null)
              setAddServiceAfter(false)
              onClose()
              // Reset form
              setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone: ''
              })
              setWashAfterCut(false)
              setWasherId('')
              setBarberId('')
            }}
          />
        )}
      </div>
    </div>
  )
}

export default CreateCustomerModal
