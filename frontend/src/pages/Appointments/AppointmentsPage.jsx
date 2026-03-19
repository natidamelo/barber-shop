import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  Filter, 
  Plus, 
  Search,
  Clock,
  User,
  Scissors,
  Star,
  MoreHorizontal,
  Edit,
  X,
  Check,
  Play,
  ChevronLeft,
  ChevronRight,
  Droplets,
  MessageSquare,
  Gift,
  Eye
} from 'lucide-react'
import { authService } from '../../services/authService'
import { useAppointments } from '../../hooks/useAppointments'
import { useCustomers, useWashers } from '../../hooks/useUsers'
import { appointmentService } from '../../services/appointmentService'
import { reviewService } from '../../services/reviewService'
import { useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import LeaveReviewModal from '../../components/UI/LeaveReviewModal'
import TipBarberModal from '../../components/UI/TipBarberModal'
import CreateAppointmentModal from '../../components/UI/CreateAppointmentModal'
import { useUserStats } from '../../hooks/useUsers'

const AppointmentsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [completingId, setCompletingId] = useState(null)
  const [startingId, setStartingId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [reviewModalAppointment, setReviewModalAppointment] = useState(null)
  const [tipModalAppointment, setTipModalAppointment] = useState(null)
  const [editModalAppointment, setEditModalAppointment] = useState(null)
  const [viewModalAppointment, setViewModalAppointment] = useState(null)
  const [openMoreId, setOpenMoreId] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const moreMenuRef = useRef(null)
  const user = authService.getStoredUser()

  const ITEMS_PER_PAGE = 15
  const queryClient = useQueryClient()

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setOpenMoreId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check URL params for view state
  const searchParams = new URLSearchParams(location.search)
  const viewToday = searchParams.get('view') === 'today'
  const dateParam = searchParams.get('date')
  
  // Initialize selected date - use today if view=today, or date param, or null for all
  const getInitialDate = () => {
    if (viewToday) {
      return new Date().toISOString().split('T')[0]
    }
    if (dateParam) {
      return dateParam
    }
    return null // null means show all appointments
  }

  const [selectedDate, setSelectedDate] = useState(() => {
    const searchParams = new URLSearchParams(location.search)
    const viewToday = searchParams.get('view') === 'today'
    const dateParam = searchParams.get('date')
    if (viewToday) {
      return new Date().toISOString().split('T')[0]
    }
    if (dateParam) {
      return dateParam
    }
    return null
  })

  // Update selected date when URL params change
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const viewToday = searchParams.get('view') === 'today'
    const dateParam = searchParams.get('date')
    
    if (viewToday) {
      const today = new Date().toISOString().split('T')[0]
      setSelectedDate(today)
    } else if (dateParam) {
      setSelectedDate(dateParam)
    } else {
      setSelectedDate(null)
    }
  }, [location.search])

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedFilter, searchQuery])

  // Build query params for API
  const queryParams = {
    page: 1,
    limit: 100
  }

  // If a date is selected, add it to query params
  if (selectedDate) {
    queryParams.date = selectedDate
  }

  // Fetch real appointments data
  const { data: appointmentsData = { data: [] }, isLoading, error, refetch } = useAppointments(queryParams)
  const { data: customersData = { data: [] } } = useCustomers({ page: 1, limit: 500 })
  const { data: washersData = { data: [] } } = useWashers()

  const rawAppointments = appointmentsData.data || []
  // Customers must see only their own appointments (backend also enforces; this is defense-in-depth)
  const customerId = user?.role === 'customer' ? (user?._id || user?.id) : null
  const appointments = customerId
    ? rawAppointments.filter((a) => {
        const aid = a.customer_id?._id || a.customer_id
        return aid && String(aid) === String(customerId)
      })
    : rawAppointments
  const customers = customersData.data || []
  const washers = washersData.data || []

  // For customers: fetch my reviews to know which completed appointments already have reviews
  const { data: myReviewsData } = useQuery(
    ['my-reviews', user?.id],
    () => reviewService.getMyReviews({ limit: 500 }),
    { enabled: user?.role === 'customer' && !!user?.id }
  )
  const myReviews = myReviewsData?.data || []
  const appointmentsWithReviews = new Set(
    myReviews
      .filter((r) => r.appointment_id)
      .map((r) => String(r.appointment_id))
  )

  const { data: userStatsData } = useUserStats(user?.role === 'customer' ? (user?._id || user?.id) : null)
  const availablePoints = userStatsData?.data?.loyalty_points ?? 0

  const getWasherName = (washerId) => {
    if (!washerId) return null
    const w = washers.find(x => (x._id || x.id) === washerId)
    return w ? `${w.first_name} ${w.last_name}` : null
  }

  const getCustomerForAppointment = (appointment) => {
    const customerId = appointment.customer_id?._id || appointment.customer_id
    if (!customerId) return null
    return customers.find(c => (c._id || c.id) === customerId)
  }

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date)
    if (date) {
      navigate(`/dashboard/appointments?date=${date}`)
    } else {
      navigate('/dashboard/appointments')
    }
  }

  // Navigate to previous day
  const goToPreviousDay = () => {
    if (selectedDate) {
      const date = new Date(selectedDate)
      date.setDate(date.getDate() - 1)
      handleDateChange(date.toISOString().split('T')[0])
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      handleDateChange(yesterday.toISOString().split('T')[0])
    }
  }

  // Navigate to next day
  const goToNextDay = () => {
    if (selectedDate) {
      const date = new Date(selectedDate)
      date.setDate(date.getDate() + 1)
      handleDateChange(date.toISOString().split('T')[0])
    } else {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      handleDateChange(tomorrow.toISOString().split('T')[0])
    }
  }

  // Go to today
  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0]
    handleDateChange(today)
  }

  // Clear date filter (show all)
  const clearDateFilter = () => {
    setSelectedDate(null)
    navigate('/dashboard/appointments')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading appointments...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Appointments</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    )
  }

  const statusFilters = [
    { key: 'all', label: 'All Appointments', count: appointments.length },
    { key: 'scheduled', label: 'Scheduled', count: appointments.filter(a => a.status === 'scheduled').length },
    { key: 'confirmed', label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length },
    { key: 'in_progress', label: 'In Progress', count: appointments.filter(a => a.status === 'in_progress').length },
    { key: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'completed').length },
    { key: 'cancelled', label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length }
  ]

  const filteredAppointments = appointments.filter(appointment => {
    const matchesFilter = selectedFilter === 'all' || appointment.status === selectedFilter
    const customerName = `${appointment.customer_id?.first_name || ''} ${appointment.customer_id?.last_name || ''}`.toLowerCase()
    const barberName = `${appointment.barber_id?.first_name || ''} ${appointment.barber_id?.last_name || ''}`.toLowerCase()
    const serviceName = appointment.service_id?.name?.toLowerCase() || ''
    const matchesSearch = searchQuery === '' || 
      customerName.includes(searchQuery.toLowerCase()) ||
      serviceName.includes(searchQuery.toLowerCase()) ||
      barberName.includes(searchQuery.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const totalFiltered = filteredAppointments.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE))
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const canEditAppointment = (appointment) => {
    // Completed and cancelled appointments cannot be edited
    if (appointment.status === 'completed' || appointment.status === 'cancelled') return false
    if (user?.role === 'admin' || user?.role === 'receptionist') return true
    if (user?.role === 'barber') {
      const barberId = user._id || user.id
      const appointmentBarberId = appointment.barber_id?._id || appointment.barber_id
      return appointmentBarberId === barberId
    }
    if (user?.role === 'customer') {
      const customerId = user._id || user.id
      const appointmentCustomerId = appointment.customer_id?._id || appointment.customer_id
      return appointment.status === 'scheduled' && appointmentCustomerId === customerId
    }
    return false
  }

  const canStartAppointment = (appointment) => {
    if (user?.role === 'admin' || user?.role === 'receptionist') {
      return appointment.status === 'scheduled' || appointment.status === 'confirmed'
    }
    if (user?.role === 'barber') {
      const barberId = user._id || user.id
      const appointmentBarberId = appointment.barber_id?._id || appointment.barber_id
      return appointmentBarberId === barberId && (appointment.status === 'scheduled' || appointment.status === 'confirmed')
    }
    return false
  }

  const canCompleteAppointment = (appointment) => {
    if (user?.role === 'admin' || user?.role === 'receptionist') {
      return appointment.status === 'in_progress' || appointment.status === 'confirmed'
    }
    if (user?.role === 'barber') {
      const barberId = user._id || user.id
      const appointmentBarberId = appointment.barber_id?._id || appointment.barber_id
      return appointmentBarberId === barberId && (appointment.status === 'in_progress' || appointment.status === 'confirmed')
    }
    return false
  }

  const canLeaveReview = (appointment) => {
    if (user?.role !== 'customer') return false
    if (appointment.status !== 'completed') return false
    const aptId = String(appointment._id || appointment.id)
    const customerId = appointment.customer_id?._id || appointment.customer_id
    const userId = user._id || user.id
    if (String(customerId) !== String(userId)) return false
    return !appointmentsWithReviews.has(aptId)
  }

  const canTipBarber = (appointment) => {
    if (user?.role !== 'customer') return false
    if (appointment.status !== 'completed') return false
    const customerId = appointment.customer_id?._id || appointment.customer_id
    const userId = user._id || user.id
    if (String(customerId) !== String(userId)) return false
    return true
  }

  const handleStartAppointment = async (appointment) => {
    setStartingId(appointment._id || appointment.id)
    try {
      await appointmentService.updateAppointment(appointment._id || appointment.id, {
        status: 'in_progress'
      })
      toast.success('Appointment started!')
      queryClient.invalidateQueries(['appointments'])
      refetch()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start appointment')
    } finally {
      setStartingId(null)
    }
  }

  const handleCompleteAppointment = async (appointment) => {
    if (!window.confirm('Mark this appointment as completed?')) {
      return
    }

    setCompletingId(appointment._id || appointment.id)
    try {
      await appointmentService.updateAppointment(appointment._id || appointment.id, {
        status: 'completed'
      })
      toast.success('Appointment marked as completed!')
      queryClient.invalidateQueries(['appointments'])
      refetch()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete appointment')
    } finally {
      setCompletingId(null)
    }
  }

  const handleCancelAppointment = async (appointment) => {
    if (!window.confirm('Cancel this appointment? The customer will need to book again.')) return
    const id = appointment._id || appointment.id
    setCancellingId(id)
    setOpenMoreId(null)
    try {
      await appointmentService.updateAppointment(id, { status: 'cancelled' })
      toast.success('Appointment cancelled.')
      queryClient.invalidateQueries(['appointments'])
      refetch()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel appointment')
    } finally {
      setCancellingId(null)
    }
  }

  const canCancelAppointment = (appointment) => {
    if (['completed', 'cancelled'].includes(appointment.status)) return false
    if (user?.role === 'admin' || user?.role === 'receptionist') return true
    if (user?.role === 'barber') {
      const barberId = user._id || user.id
      const appointmentBarberId = appointment.barber_id?._id || appointment.barber_id
      return appointmentBarberId === barberId
    }
    return false
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">Manage and track all appointments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link 
            to="/booking"
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Book New</span>
          </Link>
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">View Date:</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousDay}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={selectedDate || ''}
                onChange={(e) => handleDateChange(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={goToNextDay}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-800 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Today
              </button>
              {selectedDate && (
                <button
                  onClick={clearDateFilter}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Show All
                </button>
              )}
            </div>
          </div>
          {selectedDate && (
            <div className="text-sm text-gray-600">
              Showing appointments for: <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
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
            placeholder="Search appointments..."
            className="input pl-10 w-full lg:w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Appointments Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Washer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                      <p className="text-gray-500 mb-4">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'No appointments match the selected filter.'}
                      </p>
                      <Link to="/booking" className="btn btn-primary">
                        Book First Appointment
                      </Link>
                    </td>
                  </tr>
                ) : (
                  paginatedAppointments.map((appointment) => (
                    <tr key={appointment._id || appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'Africa/Addis_Ababa'
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(appointment.appointment_date).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit', 
                              hour12: true,
                              timeZone: 'Africa/Addis_Ababa'
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.customer_id?.first_name || 'N/A'} {appointment.customer_id?.last_name || ''}
                            </div>
                            {appointment.customer_notes && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">{appointment.customer_notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.barber_id?.first_name || 'N/A'} {appointment.barber_id?.last_name || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const customer = getCustomerForAppointment(appointment)
                          if (!customer?.wash_after_cut) return <span className="text-sm text-gray-400">—</span>
                          const name = getWasherName(customer.washer_id)
                          return (
                            <div className="text-sm text-gray-900 flex items-center space-x-1">
                              <Droplets className="h-4 w-4 text-sky-500 flex-shrink-0" />
                              <span>{name || 'Yes'}</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{appointment.service_id?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{appointment.service_id?.duration || 'N/A'} min</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status === 'completed' && <Check className="w-3 h-3 mr-1" />}
                          {appointment.status === 'cancelled' && <X className="w-3 h-3 mr-1" />}
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(appointment.price || 0).toFixed(2)} ETB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {canStartAppointment(appointment) && (
                            <button
                              onClick={() => handleStartAppointment(appointment)}
                              disabled={startingId === (appointment._id || appointment.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Start appointment"
                            >
                              <Play className="h-4 w-4" />
                              <span>{startingId === (appointment._id || appointment.id) ? 'Starting...' : 'Start'}</span>
                            </button>
                          )}
                          {canCompleteAppointment(appointment) && (
                            <button
                              onClick={() => handleCompleteAppointment(appointment)}
                              disabled={completingId === (appointment._id || appointment.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Mark as completed"
                            >
                              <Check className="h-4 w-4" />
                              <span>{completingId === (appointment._id || appointment.id) ? 'Completing...' : 'Complete'}</span>
                            </button>
                          )}
                          {canLeaveReview(appointment) && (
                            <button
                              onClick={() => setReviewModalAppointment(appointment)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                              title="Leave a review"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>Review</span>
                            </button>
                          )}
                          {canTipBarber(appointment) && (
                            <button
                              onClick={() => setTipModalAppointment(appointment)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                              title="Give points to barber"
                            >
                              <Gift className="h-4 w-4" />
                              <span>Tip</span>
                            </button>
                          )}
                          {canEditAppointment(appointment) && !canStartAppointment(appointment) && !canCompleteAppointment(appointment) && !canLeaveReview(appointment) && !canTipBarber(appointment) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditModalAppointment(appointment)
                                setOpenMoreId(null)
                              }}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit appointment"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {(user?.role === 'admin' || user?.role === 'receptionist' || user?.role === 'barber') && (
                            <div className="relative inline-block" ref={openMoreId === (appointment._id || appointment.id) ? moreMenuRef : undefined}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMoreId(openMoreId === (appointment._id || appointment.id) ? null : (appointment._id || appointment.id))
                                }}
                                className="text-gray-400 hover:text-gray-600"
                                title="More options"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {openMoreId === (appointment._id || appointment.id) && (
                                <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewModalAppointment(appointment)
                                      setOpenMoreId(null)
                                    }}
                                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span>View details</span>
                                  </button>
                                  {canEditAppointment(appointment) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditModalAppointment(appointment)
                                        setOpenMoreId(null)
                                      }}
                                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                  {canCancelAppointment(appointment) && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelAppointment(appointment)}
                                      disabled={cancellingId === (appointment._id || appointment.id)}
                                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left disabled:opacity-50"
                                    >
                                      <X className="h-4 w-4" />
                                      <span>{cancellingId === (appointment._id || appointment.id) ? 'Cancelling...' : 'Cancel appointment'}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalFiltered > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalFiltered)} of {totalFiltered} appointments
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary py-1.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 inline mr-0.5" />
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary py-1.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 inline ml-0.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="p-6 text-center">
            <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'scheduled').length}</p>
            <p className="text-sm text-gray-600">Scheduled</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'in_progress').length}</p>
            <p className="text-sm text-gray-600">In Progress</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'completed').length}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <X className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{appointments.filter(a => a.status === 'cancelled').length}</p>
            <p className="text-sm text-gray-600">Cancelled</p>
          </div>
        </div>
      </div>

      {reviewModalAppointment && (
        <LeaveReviewModal
          appointment={reviewModalAppointment}
          onClose={() => setReviewModalAppointment(null)}
          onSuccess={() => {
            queryClient.invalidateQueries(['appointments'])
            queryClient.invalidateQueries(['my-reviews'])
          }}
        />
      )}

      {tipModalAppointment && (
        <TipBarberModal
          appointment={tipModalAppointment}
          availablePoints={availablePoints}
          onClose={() => setTipModalAppointment(null)}
          onSuccess={() => {
            queryClient.invalidateQueries(['appointments'])
            queryClient.invalidateQueries(['userStats'])
          }}
        />
      )}

      {editModalAppointment && (
        <CreateAppointmentModal
          appointment={editModalAppointment}
          onClose={() => setEditModalAppointment(null)}
          onAppointmentUpdated={() => {
            queryClient.invalidateQueries(['appointments'])
            refetch()
          }}
        />
      )}

      {viewModalAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Appointment Details</h2>
              <button
                type="button"
                onClick={() => setViewModalAppointment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p><span className="font-medium text-gray-600">Date & time:</span>{' '}
                {new Date(viewModalAppointment.appointment_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Addis_Ababa' })}
              </p>
              <p><span className="font-medium text-gray-600">Customer:</span>{' '}
                {viewModalAppointment.customer_id?.first_name || 'N/A'} {viewModalAppointment.customer_id?.last_name || ''}
              </p>
              <p><span className="font-medium text-gray-600">Barber:</span>{' '}
                {viewModalAppointment.barber_id?.first_name || 'N/A'} {viewModalAppointment.barber_id?.last_name || ''}
              </p>
              <p><span className="font-medium text-gray-600">Service:</span>{' '}
                {viewModalAppointment.service_id?.name || 'N/A'} ({viewModalAppointment.service_id?.duration || 0} min)
              </p>
              <p><span className="font-medium text-gray-600">Status:</span>{' '}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewModalAppointment.status)}`}>
                  {viewModalAppointment.status.replace('_', ' ')}
                </span>
              </p>
              <p><span className="font-medium text-gray-600">Price:</span>{' '}
                {(viewModalAppointment.price || 0).toFixed(2)} ETB
              </p>
              {viewModalAppointment.customer_notes && (
                <p><span className="font-medium text-gray-600">Notes:</span> {viewModalAppointment.customer_notes}</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setViewModalAppointment(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppointmentsPage