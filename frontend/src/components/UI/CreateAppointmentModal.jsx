import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, User, Scissors, Clock, Search, CheckCircle } from 'lucide-react'
import { appointmentService } from '../../services/appointmentService'
import { useCustomers } from '../../hooks/useUsers'
import { useActiveServices } from '../../hooks/useServices'
import { useBarbers } from '../../hooks/useUsers'
import toast from 'react-hot-toast'

// Normalize time to HH:mm for API comparison (e.g. "1:45" -> "01:45")
const timeTo24 = (str) => {
  if (!str || !str.includes(':')) return str
  const [h, m] = str.split(':').map((n) => parseInt(n, 10) || 0)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Convert 24h "13:45" to 12h "1:45 PM" for display
const time24To12 = (time24) => {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  let h = parseInt(hStr, 10) || 0
  const m = parseInt(mStr, 10) || 0
  const period = h < 12 ? 'AM' : 'PM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${String(m).padStart(2, '0')} ${period}`
}

const getInitialFormData = (defaultCustomerId, editAppointment) => {
  if (editAppointment) {
    const d = new Date(editAppointment.appointment_date)
    const dateStr = d.toISOString().split('T')[0]
    const timeStr = timeTo24(d.toTimeString().slice(0, 5))
    return {
      customer_id: editAppointment.customer_id?._id || editAppointment.customer_id || '',
      service_id: editAppointment.service_id?._id || editAppointment.service_id || '',
      barber_id: editAppointment.barber_id?._id || editAppointment.barber_id || '',
      appointment_date: dateStr,
      appointment_time: timeStr,
      customer_notes: editAppointment.customer_notes || ''
    }
  }
  return {
    customer_id: defaultCustomerId || '',
    service_id: '',
    barber_id: '',
    appointment_date: '',
    appointment_time: '',
    customer_notes: ''
  }
}

const CreateAppointmentModal = ({ onAppointmentCreated, onClose, defaultCustomerId = null, appointment: editAppointment = null, onAppointmentUpdated = null }) => {
  const isEdit = !!editAppointment
  const [formData, setFormData] = useState(() => getInitialFormData(defaultCustomerId, editAppointment))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const customerDropdownRef = useRef(null)

  const initialEditTime = editAppointment ? timeTo24(new Date(editAppointment.appointment_date).toTimeString().slice(0, 5)) : null

  // Fetch data
  const { data: customersData = { data: [] } } = useCustomers({ limit: 100 })
  const { data: servicesData = { data: [] } } = useActiveServices()
  const { data: barbersData = { data: [] } } = useBarbers()

  const customers = customersData.data || []
  const services = servicesData.data || []
  const barbers = barbersData.data || []

  const filteredCustomers = customerSearchQuery.trim()
    ? customers.filter(c => {
        const q = customerSearchQuery.toLowerCase()
        const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
        const email = (c.email || '').toLowerCase()
        const phone = (c.phone || '').replace(/\s/g, '')
        return name.includes(q) || email.includes(q) || phone.includes(q)
      })
    : customers

  // Sync form when opening in edit mode with an appointment
  useEffect(() => {
    if (editAppointment) {
      setFormData(getInitialFormData(defaultCustomerId, editAppointment))
    }
  }, [editAppointment?._id ?? editAppointment?.id])

  // Update customer_id when defaultCustomerId changes (create mode only)
  useEffect(() => {
    if (!isEdit && defaultCustomerId) {
      setFormData(prev => ({ ...prev, customer_id: defaultCustomerId }))
    }
  }, [defaultCustomerId, isEdit])

  // When editing, do not overwrite barber with customer's preferred barber (keep existing)
  const shouldAutoFillBarber = !isEdit
  // Auto-fill barber when customer is selected (use customer's preferred barber) - create mode only
  useEffect(() => {
    if (!shouldAutoFillBarber || !formData.customer_id || customers.length === 0) return
    const customer = customers.find(c => (c._id || c.id) === formData.customer_id)
    setFormData(prev => ({
      ...prev,
      barber_id: customer?.barber_id || ''
    }))
  }, [formData.customer_id, customers, shouldAutoFillBarber])

  // Fetch available time slots when date, barber, and service are set
  useEffect(() => {
    const date = formData.appointment_date
    const barberId = formData.barber_id
    const serviceId = formData.service_id
    if (!date || !barberId || !serviceId) {
      setAvailableSlots([])
      return
    }
    setLoadingSlots(true)
    appointmentService
      .getAvailableSlots(barberId, date, serviceId)
      .then((res) => {
        const slots = (res?.data?.available_slots || []).map((s) => s.time)
        setAvailableSlots(slots)
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [formData.appointment_date, formData.barber_id, formData.service_id])

  // When editing: include current appointment time in available list so user can keep it
  const displaySlots = [...availableSlots]
  if (isEdit && initialEditTime && !displaySlots.includes(initialEditTime)) {
    displaySlots.push(initialEditTime)
    displaySlots.sort()
  }

  // When available slots change, ensure selected time is in the list (or set to first available)
  useEffect(() => {
    if (displaySlots.length === 0) return
    const current = timeTo24(formData.appointment_time)
    if (current && displaySlots.includes(current)) return
    setFormData((prev) => ({ ...prev, appointment_time: displaySlots[0] || '' }))
  }, [formData.appointment_date, formData.barber_id, formData.service_id, availableSlots.length])

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false)
      }
    }
    if (customerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [customerDropdownOpen])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.customer_id || !formData.service_id || !formData.barber_id || !formData.appointment_date || !formData.appointment_time) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const dateTime = new Date(`${formData.appointment_date}T${formData.appointment_time}`)
      const appointmentData = {
        customer_id: formData.customer_id,
        service_id: formData.service_id,
        barber_id: formData.barber_id,
        appointment_date: dateTime.toISOString(),
        customer_notes: formData.customer_notes
      }

      if (isEdit) {
        const id = editAppointment._id || editAppointment.id
        await appointmentService.updateAppointment(id, appointmentData)
        toast.success('Appointment updated successfully!')
        if (onAppointmentUpdated) onAppointmentUpdated()
      } else {
        await appointmentService.createAppointment(appointmentData)
        toast.success('Appointment created successfully!')
        if (onAppointmentCreated) onAppointmentCreated()
      }
      onClose()
      if (!isEdit) {
        setFormData({
          customer_id: '',
          service_id: '',
          barber_id: '',
          appointment_date: '',
          appointment_time: '',
          customer_notes: ''
        })
      }
    } catch (error) {
      toast.error(error.response?.data?.error || (isEdit ? 'Failed to update appointment' : 'Failed to create appointment'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Appointment' : 'Create Appointment'}</h2>
              <p className="text-sm text-gray-600">{isEdit ? 'Update date, time, barber, or notes' : 'Book a service for a customer'}</p>
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
          <div ref={customerDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Customer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => !defaultCustomerId && setCustomerDropdownOpen(!customerDropdownOpen)}
                disabled={!!defaultCustomerId}
                className="input w-full text-left flex items-center justify-between pr-3"
              >
                <span className="flex items-center min-w-0">
                  <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                  {formData.customer_id ? (
                    (() => {
                      const c = customers.find(x => (x._id || x.id) === formData.customer_id)
                      return c ? `${c.first_name} ${c.last_name} (${c.email})` : 'Select a customer...'
                    })()
                  ) : (
                    <span className="text-gray-500">Search or select customer...</span>
                  )}
                </span>
                <span className="text-gray-400 flex-shrink-0 ml-2">{customerDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {customerDropdownOpen && !defaultCustomerId && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 flex flex-col">
                  <div className="relative p-2 border-b border-gray-200">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="input w-full text-sm pl-9"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 p-1">
                    {customers.length === 0 ? (
                      <p className="text-sm text-gray-500 py-3 text-center">No customers. Create a customer first.</p>
                    ) : filteredCustomers.length === 0 ? (
                      <p className="text-sm text-amber-600 py-3 text-center">No match. Try different keywords.</p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer._id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, customer_id: customer._id }))
                            setCustomerDropdownOpen(false)
                            setCustomerSearchQuery('')
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 ${formData.customer_id === customer._id ? 'bg-primary-50 text-primary-800' : 'text-gray-900'}`}
                        >
                          {customer.first_name} {customer.last_name} ({customer.email})
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {defaultCustomerId && (
              <p className="text-sm text-blue-600 mt-1">
                ✓ Customer pre-selected from previous step
              </p>
            )}
            {customers.length === 0 && !defaultCustomerId && (
              <p className="text-sm text-gray-500 mt-1">No customers found. Create a customer first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Scissors className="h-4 w-4 inline mr-1" />
                Service <span className="text-red-500">*</span>
              </label>
              <select
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
                className="input w-full"
                required
              >
                <option value="">Select a service...</option>
                {services.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name} - {service.price.toFixed(2)} ETB ({service.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Barber <span className="text-red-500">*</span>
              </label>
              <select
                name="barber_id"
                value={formData.barber_id}
                onChange={handleChange}
                className="input w-full"
                required
              >
                <option value="">Select a barber...</option>
                {barbers.map((barber) => (
                  <option key={barber._id} value={barber._id}>
                    {barber.first_name} {barber.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="appointment_date"
                value={formData.appointment_date}
                onChange={handleChange}
                className="input w-full"
                required
                min={isEdit ? undefined : today}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Time <span className="text-red-500">*</span>
              </label>
              {!formData.appointment_date || !formData.barber_id || !formData.service_id ? (
                <p className="text-sm text-gray-500 py-2">Select date, barber, and service to see available times.</p>
              ) : loadingSlots ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="inline-block w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-600">Loading available times...</span>
                </div>
              ) : displaySlots.length === 0 ? (
                <p className="text-sm text-amber-700 py-2">No available times on this date. Try another date.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border border-gray-200 rounded-md bg-gray-50">
                  {displaySlots.map((time24) => {
                    const time12 = time24To12(time24)
                    const isSelected = timeTo24(formData.appointment_time) === time24
                    return (
                      <button
                        key={time24}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, appointment_time: time24 }))}
                        className={`p-2 text-sm rounded border transition-colors flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-900'
                        }`}
                      >
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{time12}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {formData.service_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Service:</strong> {services.find(s => s._id === formData.service_id)?.name}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Price:</strong> {services.find(s => s._id === formData.service_id)?.price.toFixed(2)} ETB
                {' • '}
                <strong>Duration:</strong> {services.find(s => s._id === formData.service_id)?.duration} minutes
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              name="customer_notes"
              value={formData.customer_notes}
              onChange={handleChange}
              className="input w-full"
              rows={3}
              placeholder="Any special requests or notes..."
            />
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
              disabled={isSubmitting || !formData.customer_id || !formData.service_id || !formData.barber_id}
            >
              {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Appointment' : 'Create Appointment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateAppointmentModal
