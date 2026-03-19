import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Check,
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useActiveServices } from '../../hooks/useServices'
import { useBarbers } from '../../hooks/useUsers'
import { appointmentService } from '../../services/appointmentService'

const BookingPage = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [serviceSearch, setServiceSearch] = useState('')
  const [bookingData, setBookingData] = useState({
    service: null,
    barber: null,
    date: '',
    time: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const navigate = useNavigate()
  
  // Calendar state
  const today = new Date()
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())

  // Fetch real data
  const { data: servicesData = { data: [] }, isLoading: loadingServices } = useActiveServices()
  const { data: barbersData = { data: [] }, isLoading: loadingBarbers } = useBarbers()

  const services = servicesData.data || []
  const barbers = barbersData.data || []

  const filteredServices = serviceSearch.trim()
    ? services.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
          (s.description || '').toLowerCase().includes(serviceSearch.toLowerCase())
      )
    : services

  const isPackageOrVip = (name) => {
    const n = (name || '').toLowerCase()
    return n.includes('package') || n.includes('vip') || n.includes('complete')
  }

  // Fetch available time slots when date (and barber + service) are set — must run before any early return (Rules of Hooks)
  useEffect(() => {
    const date = bookingData.date
    const barberId = bookingData.barber?._id || bookingData.barber?.id
    const serviceId = bookingData.service?._id || bookingData.service?.id
    if (!date || !barberId || !serviceId) {
      setAvailableSlots([])
      return
    }
    setLoadingSlots(true)
    appointmentService
      .getAvailableSlots(barberId, date, serviceId)
      .then((res) => {
        const slots = res?.data?.available_slots || []
        setAvailableSlots(slots.map((s) => s.time))
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [bookingData.date, bookingData.barber, bookingData.service])

  if (loadingServices || loadingBarbers) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
          <span className="ml-2 text-gray-600">Loading booking options...</span>
        </div>
      </div>
    )
  }

  // Convert "9:00 AM" / "2:30 PM" to 24h "09:00" / "14:30" for API comparison
  const time12To24 = (time12) => {
    const [timePart, period] = time12.split(' ')
    let [h, m] = (timePart || '0:0').split(':').map((n) => parseInt(n, 10) || 0)
    if (period === 'PM' && h !== 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // Convert 24h "09:00" / "14:30" to 12h "9:00 AM" / "2:30 PM" for display
  const time24To12 = (time24) => {
    const [hStr, mStr] = (time24 || '0:0').split(':')
    let h = parseInt(hStr, 10) || 0
    const m = parseInt(mStr, 10) || 0
    const period = h < 12 ? 'AM' : 'PM'
    if (h === 0) h = 12
    else if (h > 12) h -= 12
    return `${h}:${String(m).padStart(2, '0')} ${period}`
  }

  const handleServiceSelect = (service) => {
    setBookingData({ ...bookingData, service })
    setCurrentStep(2)
  }

  const handleBarberSelect = (barber) => {
    setBookingData({ ...bookingData, barber })
    setCurrentStep(3)
  }

  const handleDateTimeSelect = (date, time) => {
    setBookingData({ ...bookingData, date, time })
    setCurrentStep(4)
  }

  // Calendar helper functions
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isPastDate = (year, month, day) => {
    const date = new Date(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const isToday = (year, month, day) => {
    const date = new Date(year, month, day)
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const handlePreviousMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear(calendarYear - 1)
    } else {
      setCalendarMonth(calendarMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear(calendarYear + 1)
    } else {
      setCalendarMonth(calendarMonth + 1)
    }
  }

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value)
    if (newYear >= today.getFullYear()) {
      setCalendarYear(newYear)
    }
  }

  const handleMonthChange = (e) => {
    setCalendarMonth(parseInt(e.target.value))
  }

  const handleDateSelect = (day) => {
    const selectedDate = formatDate(calendarYear, calendarMonth, day)
    if (!isPastDate(calendarYear, calendarMonth, day)) {
      setBookingData({ ...bookingData, date: selectedDate, time: '' })
    }
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear)
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() + i)

  const handleBookingSubmit = async () => {
    if (!bookingData.service || !bookingData.barber || !bookingData.date || !bookingData.time) {
      toast.error('Please complete all booking details')
      return
    }

    // Validate IDs
    const serviceId = bookingData.service._id || bookingData.service.id
    const barberId = bookingData.barber._id || bookingData.barber.id

    if (!serviceId || !barberId) {
      toast.error('Invalid service or barber selection. Please try again.')
      return
    }

    setLoading(true)
    try {
      // Parse date and time
      const timeStr = bookingData.time.trim()
      const [timePart, period] = timeStr.split(' ')
      
      if (!timePart || !period) {
        toast.error('Invalid time format. Please select a time.')
        setLoading(false)
        return
      }

      const [hours, minutes] = timePart.split(':')
      let hour24 = parseInt(hours, 10)
      const minutesInt = parseInt(minutes, 10)

      if (isNaN(hour24) || isNaN(minutesInt)) {
        toast.error('Invalid time format. Please select a valid time.')
        setLoading(false)
        return
      }

      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0
      }

      // Create date object from the selected date string (YYYY-MM-DD format)
      const dateStr = bookingData.date // Should be in YYYY-MM-DD format
      const appointmentDateTime = new Date(dateStr + 'T00:00:00')
      
      if (isNaN(appointmentDateTime.getTime())) {
        toast.error('Invalid date. Please select a valid date.')
        setLoading(false)
        return
      }

      appointmentDateTime.setHours(hour24, minutesInt, 0, 0)

      // Ensure the date is in the future
      const now = new Date()
      if (appointmentDateTime <= now) {
        toast.error('Appointment date must be in the future. Please select a future date and time.')
        setLoading(false)
        return
      }

      // Create appointment data
      const appointmentData = {
        service_id: serviceId,
        barber_id: barberId,
        appointment_date: appointmentDateTime.toISOString(),
        customer_notes: bookingData.notes || ''
      }

      console.log('Booking appointment with data:', appointmentData)

      // Create appointment via API
      await appointmentService.createAppointment(appointmentData)
      
      toast.success('Appointment booked successfully!')
      navigate('/dashboard/appointments')
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to book appointment'
      toast.error(errorMessage)
      console.error('Error booking appointment:', error)
      if (error.response?.data) {
        console.error('Error details:', error.response.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Choose Service', completed: currentStep > 1 },
    { number: 2, title: 'Select Barber', completed: currentStep > 2 },
    { number: 3, title: 'Pick Date & Time', completed: currentStep > 3 },
    { number: 4, title: 'Confirm Booking', completed: false }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Book Your Appointment</h1>
        <p className="text-xl text-gray-600">Choose your service and preferred time</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-12">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step.completed || currentStep === step.number
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-gray-300 text-gray-400'
            }`}>
              {step.completed ? <Check className="h-5 w-5" /> : step.number}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                step.completed || currentStep === step.number ? 'text-primary-600' : 'text-gray-400'
              }`}>
                {step.title}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={`hidden sm:block w-16 h-0.5 mx-4 ${
                step.completed ? 'bg-primary-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Step 1: Choose Service */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Choose Your Service</h2>
              <p className="text-gray-500 text-sm">Pick a service below, then continue to select your barber and time.</p>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or description..."
                className="input pl-10 w-full max-w-md"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredServices.map((service) => {
                const isSpecial = isPackageOrVip(service.name)
                return (
                  <button
                    type="button"
                    key={service._id || service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="text-left p-5 rounded-xl border-2 border-gray-200 bg-white hover:border-primary-400 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-200 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                        {isSpecial ? (
                          <Sparkles className="h-6 w-6 text-primary-600" />
                        ) : (
                          <Scissors className="h-6 w-6 text-primary-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-700">
                            {service.name}
                          </h3>
                          {isSpecial && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-accent-100 text-accent-800">
                              Popular
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {service.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 font-medium text-primary-700">
                            <DollarSign className="h-3.5 w-3.5" />
                            {service.price} ETB
                          </span>
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            {service.duration} min
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                        <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-primary-600" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {filteredServices.length === 0 && (
              <div className="text-center py-10 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-600 font-medium">No services match your search.</p>
                <p className="text-gray-500 text-sm mt-1">Try a different keyword or clear the search.</p>
                <button
                  type="button"
                  onClick={() => setServiceSearch('')}
                  className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Choose Barber */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Barber</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {barbers.map((barber) => (
                <div
                  key={barber._id || barber.id}
                  onClick={() => handleBarberSelect(barber)}
                  className="p-6 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600">
                        {barber.first_name} {barber.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{barber.bio || 'Professional Barber'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-900">
                        {barber.average_rating || 'New'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({barber.total_reviews || 0} reviews)
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentStep(1)}
              className="mt-6 btn btn-secondary flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Services</span>
            </button>
          </div>
        )}

        {/* Step 3: Choose Date & Time */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Date & Time</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Date Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Date</h3>
                
                {/* Month and Year Navigation */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    <select
                      value={calendarMonth}
                      onChange={handleMonthChange}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {monthNames.map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                      ))}
                    </select>
                    
                    <select
                      value={calendarYear}
                      onChange={handleYearChange}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="p-2" />
                    }
                    
                    const dateStr = formatDate(calendarYear, calendarMonth, day)
                    const isPast = isPastDate(calendarYear, calendarMonth, day)
                    const isSelected = bookingData.date === dateStr
                    const isTodayDate = isToday(calendarYear, calendarMonth, day)
                    
                    return (
                      <button
                        key={day}
                        onClick={() => handleDateSelect(day)}
                        disabled={isPast}
                        className={`p-2 text-sm rounded-md transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white font-semibold'
                            : isPast
                            ? 'text-gray-300 cursor-not-allowed'
                            : isTodayDate
                            ? 'bg-primary-50 text-primary-700 font-semibold border-2 border-primary-300'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Select Time</h3>
                {bookingData.service?.duration && (
                  <p className="text-sm text-gray-500 mb-4">
                    Your service is {bookingData.service.duration} min — only start times that fit your booking are shown.
                  </p>
                )}
                {!bookingData.date ? (
                  <p className="text-gray-500 text-sm py-4">Select a date to see available times.</p>
                ) : loadingSlots ? (
                  <div className="flex items-center gap-2 py-6">
                    <div className="loading-spinner w-5 h-5" />
                    <span className="text-sm text-gray-600">Loading available times...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                    {[...availableSlots].sort().map((time24) => {
                      const time12 = time24To12(time24)
                      const isSelected = bookingData.time === time12
                      return (
                        <button
                          key={time24}
                          type="button"
                          onClick={() => setBookingData({ ...bookingData, time: time12 })}
                          className={`p-3 text-sm rounded-md border transition-colors flex items-center justify-center gap-2 ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-900'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          <span>{time12}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {bookingData.date && !loadingSlots && availableSlots.length === 0 && (
                  <p className="text-amber-700 text-sm mt-3 bg-amber-50 border border-amber-200 rounded-md p-3">
                    No available times on this date. Please choose another date.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Barbers</span>
              </button>
              
              {bookingData.date && bookingData.time && (
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <span>Continue to Review</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
            </div>
          </div>
        )}

        {/* Step 4: Confirm Booking */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Your Booking</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Summary</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium text-gray-900">{bookingData.service?.name}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Barber:</span>
                  <span className="font-medium text-gray-900">
                    {bookingData.barber?.first_name} {bookingData.barber?.last_name}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium text-gray-900">
                    {bookingData.date ? new Date(bookingData.date + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Not selected'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium text-gray-900">{bookingData.time}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">{bookingData.service?.duration} minutes</span>
                </div>
                
                <hr className="border-gray-200" />
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-primary-600">{bookingData.service?.price} ETB</span>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                rows="3"
                className="input"
                placeholder="Any special requests or preferences..."
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Date & Time</span>
              </button>
              
              <button
                onClick={handleBookingSubmit}
                disabled={loading}
                className="btn btn-primary btn-lg flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner w-4 h-4" />
                    <span>Booking...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Summary Sidebar (for steps 2-4) */}
      {currentStep > 1 && (
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Booking Progress</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3 text-sm">
                {bookingData.service && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium text-gray-900">{bookingData.service.name}</span>
                  </div>
                )}
                
                {bookingData.barber && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Barber:</span>
                    <span className="font-medium text-gray-900">
                      {bookingData.barber.first_name} {bookingData.barber.last_name}
                    </span>
                  </div>
                )}
                
                {bookingData.date && bookingData.time && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium text-gray-900">
                        {bookingData.date ? new Date(bookingData.date + 'T00:00:00').toLocaleDateString() : 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium text-gray-900">{bookingData.time}</span>
                    </div>
                  </>
                )}

                {bookingData.service && (
                  <>
                    <hr className="border-gray-200" />
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Total:</span>
                      <span className="font-bold text-primary-600">{bookingData.service.price} ETB</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingPage