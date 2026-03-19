import React, { useState } from 'react'
import { Calendar, Clock, Plus, Edit, Trash2, Save, X, User, Scissors } from 'lucide-react'
import { scheduleService } from '../../services/scheduleService'
import { useQuery, useQueryClient } from 'react-query'
import { useAppointments } from '../../hooks/useAppointments'
import { authService } from '../../services/authService'
import toast from 'react-hot-toast'

const SchedulePage = () => {
  const user = authService.getStoredUser()
  const userId = user?._id || user?.id
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [formData, setFormData] = useState({
    date: selectedDate,
    start_time: '09:00',
    end_time: '18:00',
    break_start: '',
    break_end: '',
    notes: '',
    is_available: true,
    schedule_type: 'regular'
  })

  // Get start and end of week for the selected date
  const getWeekDates = (dateStr) => {
    const date = new Date(dateStr)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    const monday = new Date(date.setDate(diff))
    
    const week = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      week.push(d.toISOString().split('T')[0])
    }
    return week
  }

  const weekDates = getWeekDates(selectedDate)
  const startDate = weekDates[0]
  const endDate = weekDates[6]

  // Fetch schedules for the week
  const { data: schedulesData = { data: [] }, isLoading: loadingSchedules } = useQuery(
    ['schedules', userId, startDate, endDate],
    () => scheduleService.getSchedules({
      staff_id: userId,
      start_date: startDate,
      end_date: endDate
    }),
    {
      enabled: !!userId,
      staleTime: 1000 * 60 * 5
    }
  )

  // Fetch appointments for the week
  const { data: appointmentsData = { data: [] }, isLoading: loadingAppointments } = useAppointments({
    barber_id: userId,
    start_date: startDate,
    end_date: endDate,
    limit: 200
  })

  const schedules = schedulesData.data || []
  const appointments = appointmentsData.data || []
  
  // Combine schedules and appointments by date
  const itemsByDate = {}
  
  // Add schedules
  schedules.forEach(schedule => {
    const date = new Date(schedule.date).toISOString().split('T')[0]
    if (!itemsByDate[date]) itemsByDate[date] = { schedules: [], appointments: [] }
    itemsByDate[date].schedules.push(schedule)
  })
  
  // Add appointments
  appointments.forEach(appointment => {
    const date = new Date(appointment.appointment_date).toISOString().split('T')[0]
    if (!itemsByDate[date]) itemsByDate[date] = { schedules: [], appointments: [] }
    itemsByDate[date].appointments.push(appointment)
  })

  const isLoading = loadingSchedules || loadingAppointments

  const handleAddSchedule = () => {
    setFormData({
      date: selectedDate,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '',
      break_end: '',
      notes: '',
      is_available: true,
      schedule_type: 'regular'
    })
    setEditingSchedule(null)
    setShowAddModal(true)
  }

  const handleEditSchedule = (schedule) => {
    setFormData({
      date: new Date(schedule.date).toISOString().split('T')[0],
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start: schedule.break_start || '',
      break_end: schedule.break_end || '',
      notes: schedule.notes || '',
      is_available: schedule.is_available,
      schedule_type: schedule.schedule_type
    })
    setEditingSchedule(schedule)
    setShowAddModal(true)
  }

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return

    try {
      await scheduleService.deleteSchedule(id)
      toast.success('Schedule deleted successfully')
      queryClient.invalidateQueries(['schedules'])
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete schedule')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingSchedule) {
        await scheduleService.updateSchedule(editingSchedule._id, formData)
        toast.success('Schedule updated successfully')
      } else {
        await scheduleService.createSchedule(formData)
        toast.success('Schedule created successfully')
      }
      setShowAddModal(false)
      queryClient.invalidateQueries(['schedules'])
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save schedule')
    }
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading schedule...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-600 mt-1">Manage your working hours and availability</p>
        </div>
        <button
          onClick={handleAddSchedule}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Schedule</span>
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => {
            const date = new Date(selectedDate)
            date.setDate(date.getDate() - 7)
            setSelectedDate(date.toISOString().split('T')[0])
          }}
          className="btn btn-secondary"
        >
          Previous Week
        </button>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-sm text-gray-600">
            {new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - 
            {new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => {
            const date = new Date(selectedDate)
            date.setDate(date.getDate() + 7)
            setSelectedDate(date.toISOString().split('T')[0])
          }}
          className="btn btn-secondary"
        >
          Next Week
        </button>
      </div>

      {/* Schedule Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDates.map((date, index) => {
          const dayItems = itemsByDate[date] || { schedules: [], appointments: [] }
          const isToday = date === new Date().toISOString().split('T')[0]
          const hasItems = dayItems.schedules.length > 0 || dayItems.appointments.length > 0
          
          return (
            <div
              key={date}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                isToday ? 'border-primary-500 border-2' : 'border-gray-200'
              }`}
            >
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-500">{dayNames[index]}</h3>
                <p className={`text-lg font-semibold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                  {new Date(date).getDate()}
                </p>
              </div>

              {hasItems ? (
                <div className="space-y-2">
                  {/* Display Working Hours (Schedules) */}
                  {dayItems.schedules.map((schedule) => (
                    <div
                      key={schedule._id}
                      className={`p-2 rounded text-xs ${
                        schedule.is_available
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditSchedule(schedule)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs">Working Hours</div>
                      {schedule.break_start && schedule.break_end && (
                        <div className="text-gray-600 text-xs mt-1">
                          Break: {formatTime(schedule.break_start)} - {formatTime(schedule.break_end)}
                        </div>
                      )}
                      {!schedule.is_available && (
                        <div className="text-red-600 text-xs font-medium mt-1">Unavailable</div>
                      )}
                    </div>
                  ))}

                  {/* Display Appointments */}
                  {dayItems.appointments.map((appointment) => {
                    const appointmentTime = new Date(appointment.appointment_date)
                    const endTime = new Date(appointment.end_time || appointmentTime.getTime() + (appointment.service_id?.duration || 30) * 60000)
                    const statusColors = {
                      scheduled: 'bg-blue-50 border-blue-200',
                      confirmed: 'bg-green-50 border-green-200',
                      in_progress: 'bg-yellow-50 border-yellow-200',
                      completed: 'bg-gray-50 border-gray-200',
                      cancelled: 'bg-red-50 border-red-200',
                      no_show: 'bg-orange-50 border-orange-200'
                    }
                    
                    return (
                      <div
                        key={appointment._id}
                        className={`p-2 rounded text-xs border ${statusColors[appointment.status] || 'bg-blue-50 border-blue-200'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {appointmentTime.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit', 
                                hour12: true 
                              })}
                            </span>
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            appointment.status === 'completed' ? 'bg-green-200 text-green-800' :
                            appointment.status === 'cancelled' ? 'bg-red-200 text-red-800' :
                            appointment.status === 'confirmed' ? 'bg-blue-200 text-blue-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {appointment.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-gray-700 text-xs flex items-center space-x-1 mt-1">
                          <User className="h-3 w-3" />
                          <span>
                            {appointment.customer_id?.first_name || 'N/A'} {appointment.customer_id?.last_name || ''}
                          </span>
                        </div>
                        <div className="text-gray-600 text-xs flex items-center space-x-1 mt-1">
                          <Scissors className="h-3 w-3" />
                          <span>{appointment.service_id?.name || 'N/A'}</span>
                        </div>
                        {appointment.customer_notes && (
                          <div className="text-gray-500 text-xs mt-1 italic">
                            "{appointment.customer_notes}"
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No schedule
                </div>
              )}

              <button
                onClick={() => {
                  setFormData(prev => ({ ...prev, date }))
                  setSelectedDate(date)
                  setEditingSchedule(null)
                  setShowAddModal(true)
                }}
                className="mt-2 w-full text-xs text-primary-600 hover:text-primary-800 flex items-center justify-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Schedule</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Break Start
                  </label>
                  <input
                    type="time"
                    value={formData.break_start}
                    onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Break End
                  </label>
                  <input
                    type="time"
                    value={formData.break_end}
                    onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Type
                </label>
                <select
                  value={formData.schedule_type}
                  onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                  className="input w-full"
                >
                  <option value="regular">Regular</option>
                  <option value="overtime">Overtime</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full"
                  rows="3"
                  maxLength={500}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">
                  Available for appointments
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingSchedule ? 'Update' : 'Create'} Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchedulePage
