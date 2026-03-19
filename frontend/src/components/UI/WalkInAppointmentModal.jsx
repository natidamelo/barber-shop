import React, { useState, useEffect, useRef } from 'react'
import { X, User, Scissors, Clock, CheckCircle, AlertCircle, Loader2, UserPlus, Mail, Phone, Droplets, Search } from 'lucide-react'
import { appointmentService } from '../../services/appointmentService'
import { useCustomers, useBarbers, useWashers } from '../../hooks/useUsers'
import { useActiveServices } from '../../hooks/useServices'
import { userService } from '../../services/userService'
import BillManagementModal from './BillManagementModal'
import toast from 'react-hot-toast'

const WalkInAppointmentModal = ({ onAppointmentCreated, onClose, defaultCustomerId = null }) => {
  const [formData, setFormData] = useState({
    customer_id: defaultCustomerId || '',
    service_ids: [], // Changed to array for multiple services
    barber_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availability, setAvailability] = useState(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState(null)
  const [createdAppointment, setCreatedAppointment] = useState(null)
  const [showBillModal, setShowBillModal] = useState(false)
  const [showCreateCustomer, setShowCreateCustomer] = useState(false)
  const [customerFormData, setCustomerFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    wash_after_cut: false,
    washer_id: '',
    barber_id: ''
  })
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [serviceSearchQuery, setServiceSearchQuery] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false)
  const customerDropdownRef = useRef(null)
  const servicesDropdownRef = useRef(null)

  // Fetch data
  const { data: customersData = { data: [] }, refetch: refetchCustomers } = useCustomers({ limit: 100 })
  const { data: servicesData = { data: [] } } = useActiveServices()
  const { data: barbersData = { data: [] } } = useBarbers()
  const barbers = barbersData.data || []
  const { data: washersData = { data: [] } } = useWashers()
  const washers = washersData.data || []

  const customers = customersData.data || []
  const services = servicesData.data || []

  const filteredCustomers = customerSearchQuery.trim()
    ? customers.filter(c => {
        const q = customerSearchQuery.toLowerCase()
        const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
        const email = (c.email || '').toLowerCase()
        const phone = (c.phone || '').replace(/\s/g, '')
        return name.includes(q) || email.includes(q) || phone.includes(q)
      })
    : customers

  const filteredServices = serviceSearchQuery.trim()
    ? services.filter(s => (s.name || '').toLowerCase().includes(serviceSearchQuery.toLowerCase()))
    : services

  // Update customer_id when defaultCustomerId changes
  useEffect(() => {
    if (defaultCustomerId) {
      setFormData(prev => ({
        ...prev,
        customer_id: defaultCustomerId
      }))
    }
  }, [defaultCustomerId])

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

  // Close services dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(e.target)) {
        setServicesDropdownOpen(false)
      }
    }
    if (servicesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [servicesDropdownOpen])

  // Fetch availability when services change (use longest service duration)
  useEffect(() => {
    if (formData.service_ids.length > 0) {
      fetchAvailability()
    } else {
      setAvailability(null)
      setAvailabilityError(null)
    }
  }, [formData.service_ids])

  const fetchAvailability = async () => {
    if (formData.service_ids.length === 0) {
      setAvailability(null)
      setAvailabilityError(null)
      return
    }
    
    // For multiple services, use the longest duration service for availability check
    // This gives us a conservative estimate of availability
    const selectedServicesForCheck = services.filter(s => formData.service_ids.includes(s._id))
    const longestService = selectedServicesForCheck.reduce((longest, current) => {
      return (current.duration || 0) > (longest.duration || 0) ? current : longest
    }, selectedServicesForCheck[0])
    
    const primaryServiceId = longestService?._id || formData.service_ids[0]
    
    setLoadingAvailability(true)
    setAvailabilityError(null)
    try {
      console.log('Fetching availability for service:', primaryServiceId, 'Total duration:', selectedServicesForCheck.reduce((sum, s) => sum + (s.duration || 0), 0))
      const response = await appointmentService.getWalkInAvailability(primaryServiceId)
      console.log('Availability response:', response)
      if (response.success && response.data) {
        setAvailability(response.data)
        setAvailabilityError(null)
      } else {
        throw new Error(response.error || 'Failed to fetch availability')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch barber availability'
      setAvailabilityError(errorMessage)
      setAvailability(null)
      console.error('Walk-in availability error:', error)
      console.error('Error response:', error.response)
      toast.error(errorMessage)
    } finally {
      setLoadingAvailability(false)
    }
  }

  const handleChange = (e) => {
    if (e.target.name === 'service_ids') {
      // Handle multiple service selection
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
      setFormData({
        ...formData,
        service_ids: selectedOptions
      })
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      })
    }
  }

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => {
      const currentIds = prev.service_ids || []
      if (currentIds.includes(serviceId)) {
        // Remove service
        return {
          ...prev,
          service_ids: currentIds.filter(id => id !== serviceId)
        }
      } else {
        // Add service
        return {
          ...prev,
          service_ids: [...currentIds, serviceId]
        }
      }
    })
  }

  const handleCustomerFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setCustomerFormData({
      ...customerFormData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    setIsCreatingCustomer(true)

    try {
      const { wash_after_cut, washer_id, barber_id, ...rest } = customerFormData
      const response = await userService.createUser({
        ...rest,
        role: 'customer',
        wash_after_cut: !!wash_after_cut,
        ...(washer_id && { washer_id }),
        ...(barber_id && { barber_id })
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

      // Set the newly created customer as selected
      setFormData(prev => ({
        ...prev,
        customer_id: customerData._id
      }))
      
      // Refresh customers list
      await refetchCustomers()
      
      // Hide create customer form
      setShowCreateCustomer(false)
      
      // Reset customer form
      setCustomerFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        wash_after_cut: false,
        washer_id: '',
        barber_id: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create customer')
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.customer_id || formData.service_ids.length === 0 || !formData.barber_id) {
      toast.error('Please fill in all required fields')
      return
    }

    // Verify barber exists in availability list
    const selectedBarber = availability?.barbers?.find(b => b.barber._id === formData.barber_id)
    if (!selectedBarber) {
      toast.error('Selected barber not found. Please select a barber from the list.')
      return
    }
    
    // Refresh availability right before creating to get the most current status
    let freshAvailability = availability
    try {
      const selectedServicesForCheck = services.filter(s => formData.service_ids.includes(s._id))
      const longestService = selectedServicesForCheck.reduce((longest, current) => {
        return (current.duration || 0) > (longest.duration || 0) ? current : longest
      }, selectedServicesForCheck[0])
      
      const primaryServiceId = longestService?._id || formData.service_ids[0]
      const availResponse = await appointmentService.getWalkInAvailability(primaryServiceId)
      
      if (availResponse.success && availResponse.data) {
        freshAvailability = availResponse.data
        setAvailability(freshAvailability)
        
        // Check if barber is still available
        const freshBarberInfo = freshAvailability.barbers?.find(b => b.barber._id === formData.barber_id)
        if (!freshBarberInfo) {
          toast.error('Barber is no longer available. Please select a different barber.')
          return
        }
        
        if (!freshBarberInfo.available_now) {
          const waitTime = freshBarberInfo.estimated_wait_time || 0
          if (waitTime > 60) {
            const nextAvailable = freshBarberInfo.next_available_slot 
              ? new Date(freshBarberInfo.next_available_slot).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })
              : 'later'
            toast.error(`Barber is not available now. Next available: ${nextAvailable} (in ${waitTime} minutes). Please select a different barber.`)
            return
          }
        }
      }
    } catch (availError) {
      console.error('Error refreshing availability:', availError)
      // Continue with existing availability data
    }
    
    // Warn if barber is not immediately available, but allow selection
    // The backend will do the final conflict check
    const finalBarberInfo = freshAvailability?.barbers?.find(b => b.barber._id === formData.barber_id) || selectedBarber
    if (!finalBarberInfo.available_now) {
      const waitTime = finalBarberInfo.estimated_wait_time || 0
      if (waitTime > 0 && waitTime <= 30) {
        // Show warning but allow proceeding for reasonable wait times
        toast(`Barber may have a ${waitTime} minute wait time`, { icon: '⏱️', duration: 3000 })
      }
    }

    setIsSubmitting(true)

    try {
      // Get selected services
      const selectedServices = services.filter(s => formData.service_ids.includes(s._id))
      
      // Calculate total price and duration
      const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0), 0)
      const totalDuration = selectedServices.reduce((sum, service) => sum + (service.duration || 0), 0)
      
      // Helper function to ensure time is not in the past
      const ensureCurrentTime = (time) => {
        const now = new Date()
        return time < now ? now : time
      }

      // Determine start time - use next available slot if barber is not available now
      const now = new Date()
      let currentStartTime = now
      
      if (!finalBarberInfo.available_now && finalBarberInfo.next_available_slot) {
        // Use the next available slot from the availability check
        currentStartTime = new Date(finalBarberInfo.next_available_slot)
        // Ensure it's not in the past (shouldn't happen, but safety check)
        currentStartTime = ensureCurrentTime(currentStartTime)
      }
      
      // For walk-ins with multiple services, create them sequentially
      // Each service starts after the previous one ends to avoid conflicts
      const createdAppointments = []
      
      // Create appointments one by one to ensure proper timing and avoid conflicts
      for (let i = 0; i < selectedServices.length; i++) {
        const service = selectedServices[i]
        let retryCount = 0
        const maxRetries = 2
        let appointmentCreated = false
        
        while (!appointmentCreated && retryCount <= maxRetries) {
          try {
            // Ensure currentStartTime is not in the past before each attempt
            currentStartTime = ensureCurrentTime(currentStartTime)
            
            const appointmentData = {
              customer_id: formData.customer_id,
              service_id: service._id,
              barber_id: formData.barber_id,
              appointment_date: currentStartTime.toISOString(),
              is_walk_in: true
            }
            
            console.log(`Creating appointment for service ${service.name}:`, {
              service_id: service._id,
              barber_id: formData.barber_id,
              appointment_date: appointmentData.appointment_date,
              retry_count: retryCount
            })
            
            const response = await appointmentService.createAppointment(appointmentData)
          
            if (response.success && response.data) {
              createdAppointments.push(response.data)
              appointmentCreated = true
              
              // Calculate next start time based on the created appointment's end time
              if (response.data.end_time) {
                currentStartTime = new Date(response.data.end_time)
              } else {
                // Fallback: calculate based on service duration
                currentStartTime = new Date(currentStartTime.getTime() + service.duration * 60000)
              }
              
              // Add a small buffer (2 minutes) between services for walk-ins to avoid conflicts
              if (i < selectedServices.length - 1) {
                currentStartTime = new Date(currentStartTime.getTime() + 120000) // 2 minute buffer
                
                // Small delay to ensure database has updated before creating next appointment
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            } else {
              throw new Error(response.error || 'Failed to create appointment')
            }
          } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create appointment'
            
            // Check if it's a conflict/availability error and we can retry
            const isConflictError = errorMessage.includes('not available') || 
                                   errorMessage.includes('conflict') || 
                                   errorMessage.includes('Barber') || 
                                   errorMessage.includes('available') ||
                                   error.response?.status === 400
            
            if (isConflictError && retryCount < maxRetries) {
              retryCount++
              console.log(`Retry attempt ${retryCount} for service ${service.name} due to conflict`)
              
              // Fetch fresh availability to get updated next available slot
              try {
                const selectedServicesForCheck = services.filter(s => formData.service_ids.includes(s._id))
                const longestService = selectedServicesForCheck.reduce((longest, current) => {
                  return (current.duration || 0) > (longest.duration || 0) ? current : longest
                }, selectedServicesForCheck[0])
                
                const primaryServiceId = longestService?._id || formData.service_ids[0]
                const availResponse = await appointmentService.getWalkInAvailability(primaryServiceId)
                
                if (availResponse.success && availResponse.data) {
                  const selectedBarber = availResponse.data.barbers?.find(b => b.barber._id === formData.barber_id)
                  
                  if (selectedBarber) {
                    // Update currentStartTime based on fresh availability
                    if (selectedBarber.available_now) {
                      currentStartTime = new Date()
                    } else if (selectedBarber.next_available_slot) {
                      currentStartTime = new Date(selectedBarber.next_available_slot)
                    } else {
                      // If no next available slot, wait a bit and try again
                      currentStartTime = new Date(Date.now() + 60000) // 1 minute from now
                    }
                    currentStartTime = ensureCurrentTime(currentStartTime)
                    
                    // Update availability state
                    setAvailability(availResponse.data)
                    
                    // Wait a moment before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    continue // Retry the appointment creation
                  }
                }
              } catch (availError) {
                console.error('Error fetching fresh availability for retry:', availError)
              }
              
              // If we couldn't get fresh availability, increment time and retry
              currentStartTime = new Date(Date.now() + (retryCount * 60000)) // Add retryCount minutes
              currentStartTime = ensureCurrentTime(currentStartTime)
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue // Retry the appointment creation
            }
            
            // If retries exhausted or not a conflict error, throw the error
            // If one appointment fails, clean up created ones and show error
            console.error(`Failed to create appointment for service ${service.name} after ${retryCount} retries:`, error)
            
            // Try to delete any appointments we already created
            for (const createdApt of createdAppointments) {
              try {
                await appointmentService.deleteAppointment(createdApt._id || createdApt.id)
              } catch (deleteError) {
                console.error('Failed to cleanup appointment:', deleteError)
              }
            }
            
            // Provide more helpful error messages with available time
            if (isConflictError) {
              // Fetch fresh availability to get the most current information
              let availableTimeInfo = ''
              try {
                // Get selected services for availability check
                const selectedServicesForCheck = services.filter(s => formData.service_ids.includes(s._id))
                const longestService = selectedServicesForCheck.reduce((longest, current) => {
                  return (current.duration || 0) > (longest.duration || 0) ? current : longest
                }, selectedServicesForCheck[0])
                
                const primaryServiceId = longestService?._id || formData.service_ids[0]
                
                // Fetch fresh availability
                const availResponse = await appointmentService.getWalkInAvailability(primaryServiceId)
                
                if (availResponse.success && availResponse.data) {
                  const selectedBarber = availResponse.data.barbers?.find(b => b.barber._id === formData.barber_id)
                  
                  if (selectedBarber) {
                    if (!selectedBarber.available_now && selectedBarber.next_available_slot) {
                      const nextAvailable = new Date(selectedBarber.next_available_slot)
                      const waitTime = selectedBarber.estimated_wait_time || 0
                      const timeStr = nextAvailable.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })
                      availableTimeInfo = ` Next available time: ${timeStr} (in ${waitTime} minutes).`
                    } else if (selectedBarber.estimated_wait_time) {
                      const waitTime = selectedBarber.estimated_wait_time
                      availableTimeInfo = ` Estimated wait time: ${waitTime} minutes.`
                    }
                  }
                  
                  // Update availability state for UI
                  setAvailability(availResponse.data)
                }
              } catch (availError) {
                console.error('Error fetching availability info:', availError)
              }
              
              throw new Error(
                `Barber is not available for ${service.name}. The barber's schedule may have changed.${availableTimeInfo} Please select a different barber or try again.`
              )
            }
            
            throw new Error(`Failed to create appointment for ${service.name}: ${errorMessage}`)
          }
        }
      }
      
      if (createdAppointments.length === 0) {
        throw new Error('Failed to create appointments')
      }
      
      toast.success(`Walk-in appointment created successfully with ${createdAppointments.length} service(s)!`)
      
      // Use the first appointment for billing, but include all services info
      const firstAppointment = createdAppointments[0]
      const appointmentWithAllServices = {
        ...firstAppointment,
        // Store all services info for billing display
        all_services: selectedServices,
        all_appointments: createdAppointments,
        total_price: totalPrice,
        total_duration: totalDuration
      }
      
      setCreatedAppointment(appointmentWithAllServices)
      setShowBillModal(true)
    } catch (error) {
      const errorMessage = error.message || error.response?.data?.error || 'Failed to create walk-in appointment'
      console.error('Walk-in appointment creation error:', error)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedServices = services.filter(s => formData.service_ids.includes(s._id))
  const totalPrice = selectedServices.reduce((sum, service) => sum + (service.price || 0), 0)
  const totalDuration = selectedServices.reduce((sum, service) => sum + (service.duration || 0), 0)
  
  // Get all barbers (both available and unavailable) for selection
  const allBarbers = availability?.barbers || []
  // Only show as "Available Now" if they're truly available (available_now === true)
  const availableBarbers = allBarbers.filter(b => b.available_now === true) || []
  // All others are unavailable (even if available_now is undefined/null, treat as unavailable)
  const unavailableBarbers = allBarbers.filter(b => b.available_now !== true) || []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Walk-In Appointment</h2>
              <p className="text-sm text-gray-600">Book an immediate appointment for a customer</p>
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
          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                <User className="h-4 w-4 inline mr-1" />
                Customer <span className="text-red-500">*</span>
              </label>
              {!showCreateCustomer && !defaultCustomerId && (
                <button
                  type="button"
                  onClick={() => setShowCreateCustomer(true)}
                  className="text-sm text-primary-600 hover:text-primary-800 flex items-center space-x-1"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add New Customer</span>
                </button>
              )}
            </div>

            {showCreateCustomer ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-blue-900">Create New Customer</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCustomer(false)
                      setCustomerFormData({
                        first_name: '',
                        last_name: '',
                        email: '',
                        phone: '',
                        wash_after_cut: false,
                        washer_id: '',
                        barber_id: ''
                      })
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={customerFormData.first_name}
                        onChange={handleCustomerFormChange}
                        className="input w-full text-sm"
                        required
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={customerFormData.last_name}
                        onChange={handleCustomerFormChange}
                        className="input w-full text-sm"
                        required
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      <Mail className="h-3 w-3 inline mr-1" />
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={customerFormData.email}
                      onChange={handleCustomerFormChange}
                      className="input w-full text-sm"
                      required
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      <Phone className="h-3 w-3 inline mr-1" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerFormData.phone}
                      onChange={handleCustomerFormChange}
                      className="input w-full text-sm"
                      placeholder="+1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Barber (who cuts this customer)</label>
                    <select
                      name="barber_id"
                      value={customerFormData.barber_id || ''}
                      onChange={handleCustomerFormChange}
                      className="input w-full text-sm"
                    >
                      <option value="">Select barber...</option>
                      {barbers.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.first_name} {b.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="wash_after_cut"
                        checked={customerFormData.wash_after_cut || false}
                        onChange={handleCustomerFormChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <Droplets className="h-4 w-4 text-sky-600" />
                      <span className="text-sm font-medium text-sky-900">Wash him after the cut</span>
                    </label>
                    {customerFormData.wash_after_cut && (
                      <div>
                        <label className="block text-xs font-medium text-sky-900 mb-1">Washer name</label>
                        <select
                          name="washer_id"
                          value={customerFormData.washer_id || ''}
                          onChange={handleCustomerFormChange}
                          className="input w-full text-sm"
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

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                    onClick={() => {
                        setShowCreateCustomer(false)
                        setCustomerFormData({
                          first_name: '',
                          last_name: '',
                          email: '',
                          phone: '',
                          wash_after_cut: false,
                          washer_id: '',
                          barber_id: ''
                        })
                      }}
                    className="btn btn-sm btn-secondary"
                      disabled={isCreatingCustomer}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      className="btn btn-sm btn-primary"
                      disabled={isCreatingCustomer}
                    >
                      {isCreatingCustomer ? 'Creating...' : 'Create Customer'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="relative" ref={customerDropdownRef}>
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
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Search by name, email, or phone..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="input w-full text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1 min-h-0 p-1">
                        {customers.length === 0 ? (
                          <p className="text-sm text-gray-500 py-3 text-center">No customers. Click "Add New Customer" to create one.</p>
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
                {customers.length === 0 && !defaultCustomerId && !showCreateCustomer && (
                  <p className="text-sm text-gray-500 mt-1">No customers found. Click "Add New Customer" to create one.</p>
                )}
              </>
            )}
          </div>

          {/* Service Selection - Dropdown (search + list inside) */}
          <div ref={servicesDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Scissors className="h-4 w-4 inline mr-1" />
              Services <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(Select one or more)</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                className="input w-full text-left flex items-center justify-between pr-3"
              >
                <span className="flex items-center min-w-0">
                  <Search className="h-4 w-4 text-gray-400 flex-shrink-0 mr-2" />
                  {formData.service_ids.length > 0 ? (
                    <span className="text-gray-900 truncate">
                      {formData.service_ids.length} service{formData.service_ids.length !== 1 ? 's' : ''} selected
                      {selectedServices.length > 0 && selectedServices.length <= 2 && (
                        <span className="text-gray-500 font-normal">
                          {' '}({selectedServices.map(s => s.name).join(', ')})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-500">Search or select services...</span>
                  )}
                </span>
                <span className="text-gray-400 flex-shrink-0 ml-2">{servicesDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {servicesDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col max-h-72">
                  <div className="relative p-2 border-b border-gray-200 flex-shrink-0">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search services by name..."
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="input w-full text-sm pl-9"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1">
                    {services.length === 0 ? (
                      <p className="text-sm text-gray-500 py-3 text-center">No services available</p>
                    ) : filteredServices.length === 0 ? (
                      <p className="text-sm text-amber-600 py-3 text-center">No services match your search.</p>
                    ) : (
                      filteredServices.map((service) => {
                        const isSelected = formData.service_ids.includes(service._id)
                        return (
                          <label
                            key={service._id}
                            className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                              isSelected ? 'bg-primary-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleServiceToggle(service._id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                              <p className="text-xs text-gray-500">
                                {service.duration} min • {service.price.toFixed(2)} ETB
                              </p>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedServices.length > 0 && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Selected Services ({selectedServices.length}):
                </p>
                <div className="space-y-1 mb-3">
                  {selectedServices.map((service) => (
                    <div key={service._id} className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">{service.name}</span>
                      <span className="text-blue-900 font-medium">
                        {service.price.toFixed(2)} ETB • {service.duration} min
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-blue-900">Total:</span>
                    <span className="text-blue-900">
                      {totalPrice.toFixed(2)} ETB • {totalDuration} minutes
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Barber Availability */}
          {formData.service_ids.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barber <span className="text-red-500">*</span>
                {loadingAvailability && (
                  <Loader2 className="h-4 w-4 inline ml-2 animate-spin" />
                )}
              </label>
              
              {loadingAvailability ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
                  <p className="text-sm text-gray-600 mt-2">Checking availability...</p>
                </div>
              ) : availabilityError ? (
                <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-900 mb-1">Error loading availability</p>
                  <p className="text-xs text-red-700">{availabilityError}</p>
                  <button
                    onClick={fetchAvailability}
                    className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : availability ? (
                <div className="space-y-4">
                  {/* Available Barbers */}
                  {availableBarbers.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="text-sm font-medium text-gray-900">Available Now</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {availableBarbers.map((barberInfo) => (
                          <label
                            key={barberInfo.barber._id}
                            className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              formData.barber_id === barberInfo.barber._id
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="barber_id"
                              value={barberInfo.barber._id}
                              checked={formData.barber_id === barberInfo.barber._id}
                              onChange={handleChange}
                              className="h-4 w-4 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">
                                  {barberInfo.barber.first_name} {barberInfo.barber.last_name}
                                </p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Available Now
                                </span>
                              </div>
                              {barberInfo.current_appointments > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {barberInfo.current_appointments} appointment(s) in progress
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unavailable Barbers */}
                  {unavailableBarbers.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <h3 className="text-sm font-medium text-gray-900">
                          Not Available
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {unavailableBarbers.map((barberInfo) => {
                          const waitTime = barberInfo.estimated_wait_time || 999
                          const canSelect = waitTime <= 30 // Allow selection if wait is 30 min or less
                          const nextAvailableTime = barberInfo.next_available_slot 
                            ? new Date(barberInfo.next_available_slot).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })
                            : null
                          
                          return canSelect ? (
                            <label
                              key={barberInfo.barber._id}
                              className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                formData.barber_id === barberInfo.barber._id
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-orange-200 hover:border-orange-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="barber_id"
                                value={barberInfo.barber._id}
                                checked={formData.barber_id === barberInfo.barber._id}
                                onChange={handleChange}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    {barberInfo.barber.first_name} {barberInfo.barber.last_name}
                                  </p>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    ~{waitTime} min wait
                                  </span>
                                </div>
                                {nextAvailableTime && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Will be available at: {nextAvailableTime}
                                  </p>
                                )}
                              </div>
                            </label>
                          ) : (
                            <div
                              key={barberInfo.barber._id}
                              className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg bg-gray-50 opacity-60"
                            >
                              <input
                                type="radio"
                                disabled
                                className="h-4 w-4 text-gray-400"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-500">
                                    {barberInfo.barber.first_name} {barberInfo.barber.last_name}
                                  </p>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Not Available
                                  </span>
                                </div>
                                {nextAvailableTime && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Will be available at: {nextAvailableTime}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {allBarbers.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No barbers available at this time</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Select a service to see barber availability</p>
                </div>
              )}
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
              className="btn btn-primary"
              disabled={isSubmitting || !formData.customer_id || formData.service_ids.length === 0 || !formData.barber_id || allBarbers.length === 0}
            >
              {isSubmitting ? 'Creating...' : `Create Walk-In Appointment${selectedServices.length > 1 ? ` (${selectedServices.length} services)` : ''}`}
            </button>
          </div>
        </form>
      </div>

      {/* Billing Modal */}
      {showBillModal && createdAppointment && (
        <BillManagementModal
          appointment={createdAppointment}
          onUpdate={async (paymentData) => {
            try {
              // If multiple appointments, update all of them
              if (createdAppointment.all_appointments && createdAppointment.all_appointments.length > 1) {
                const updatePromises = createdAppointment.all_appointments.map(apt => 
                  appointmentService.updateAppointment(apt._id || apt.id, paymentData)
                )
                await Promise.all(updatePromises)
                toast.success(`Payment updated successfully for ${createdAppointment.all_appointments.length} appointments!`)
              } else {
                // Single appointment update
                const appointmentId = createdAppointment._id || createdAppointment.id
                await appointmentService.updateAppointment(appointmentId, paymentData)
                toast.success('Payment updated successfully!')
              }
              
              setShowBillModal(false)
              if (onAppointmentCreated) {
                onAppointmentCreated()
              }
              onClose()
              // Reset form
              setFormData({
                customer_id: defaultCustomerId || '',
                service_ids: [],
                barber_id: ''
              })
              setCreatedAppointment(null)
            } catch (error) {
              toast.error(error.response?.data?.error || 'Failed to update payment')
            }
          }}
          onClose={() => {
            setShowBillModal(false)
            if (onAppointmentCreated) {
              onAppointmentCreated()
            }
            onClose()
            // Reset form
            setFormData({
              customer_id: defaultCustomerId || '',
              service_ids: [],
              barber_id: ''
            })
            setCreatedAppointment(null)
          }}
        />
      )}
    </div>
  )
}

export default WalkInAppointmentModal
