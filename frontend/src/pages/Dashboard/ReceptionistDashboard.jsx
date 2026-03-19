import React, { useState } from 'react'
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Scissors,
  TrendingUp,
} from 'lucide-react'
import { useAppointments } from '../../hooks/useAppointments'
import { useBarbers } from '../../hooks/useUsers'
import { appointmentService } from '../../services/appointmentService'
import toast from 'react-hot-toast'
import StatsCard from '../../components/UI/StatsCard'
import BarberAssignmentModal from '../../components/UI/BarberAssignmentModal'
import BillManagementModal from '../../components/UI/BillManagementModal'

const ReceptionistDashboard = () => {
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showBarberModal, setShowBarberModal] = useState(false)
  const [showBillModal, setShowBillModal] = useState(false)
  const [viewMode, setViewMode] = useState('today') // 'today' or 'byBarber'

  // Today's date in YYYY-MM-DD for API
  const todayISO = new Date().toISOString().split('T')[0]

  // Fetch today's appointments (for Today's Revenue, Today's Appointments count and table)
  const { data: todayAppointmentsData = { data: [] }, isLoading: loadingToday, refetch: refetchToday } = useAppointments({
    date: todayISO,
    page: 1,
    limit: 100
  })

  // Fetch all appointments (for Pending Payments, Unassigned, and other sections)
  const { data: appointmentsData = { data: [] }, isLoading: loadingAll, refetch } = useAppointments({
    page: 1,
    limit: 200
  })

  // Fetch barbers
  const { data: barbersData = { data: [] } } = useBarbers()

  const todayAppointments = todayAppointmentsData.data || []
  const appointments = appointmentsData.data || []
  const barbers = barbersData.data || []
  const isLoading = loadingToday || loadingAll

  const pendingPayments = appointments.filter(apt => 
    apt.payment_status === 'pending' || apt.payment_status === 'partially_paid'
  )

  const totalRevenue = appointments
    .filter(apt => apt.status === 'completed' && apt.payment_status === 'paid')
    .reduce((sum, apt) => sum + (apt.price || 0), 0)

  // Today's revenue: sum of paid appointments for today (paid = money collected; include in_progress and completed)
  const todayRevenue = todayAppointments
    .filter(apt => apt.status !== 'cancelled' && apt.payment_status === 'paid')
    .reduce((sum, apt) => sum + (Number(apt.price) || Number(apt.service_id?.price) || 0), 0)

  const unassignedAppointments = appointments.filter(apt => 
    !apt.barber_id || apt.status === 'scheduled'
  )

  const handleAssignBarber = (appointment) => {
    setSelectedAppointment(appointment)
    setShowBarberModal(true)
  }

  const handleManageBill = (appointment) => {
    setSelectedAppointment(appointment)
    setShowBillModal(true)
  }

  const handleBarberAssigned = async (barberId) => {
    try {
      await appointmentService.updateAppointment(selectedAppointment._id, {
        barber_id: barberId,
        status: 'confirmed'
      })
      toast.success('Barber assigned successfully!')
      setShowBarberModal(false)
      setSelectedAppointment(null)
      refetch()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign barber')
    }
  }

  const handleBillUpdated = async (paymentData) => {
    try {
      await appointmentService.updateAppointment(selectedAppointment._id, paymentData)
      toast.success('Payment updated successfully!')
      setShowBillModal(false)
      setSelectedAppointment(null)
      refetch()
      refetchToday() // refresh today's appointments so Today's Revenue updates
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update payment')
    }
  }

  // All appointments for billing section
  const allAppointments = appointments.filter(apt => 
    apt.status !== 'cancelled'
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={Calendar}
          color="blue"
          subtitle={`${todayAppointments.filter(a => a.status === 'completed').length} completed`}
        />
        <StatsCard
          title="Pending Payments"
          value={pendingPayments.length}
          icon={DollarSign}
          color="yellow"
          subtitle={`${(pendingPayments.reduce((sum, apt) => sum + (apt.price || 0), 0)).toFixed(2)} ETB`}
        />
        <StatsCard
          title="Today's Revenue"
          value={`${todayRevenue.toFixed(2)} ETB`}
          icon={TrendingUp}
          color="green"
          subtitle={`${todayAppointments.filter(a => a.payment_status === 'paid').length} paid today`}
        />
        <StatsCard
          title="Unassigned"
          value={unassignedAppointments.length}
          icon={Users}
          color="orange"
          subtitle="Need barber assignment"
        />
      </div>

      {/* Appointments View */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-bold text-gray-900">
            {viewMode === 'today' ? "Today's Appointments" : "Appointments by Barber"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {viewMode === 'today' 
              ? "Manage appointments and assign barbers" 
              : "View all appointments organized by barber"}
          </p>
        </div>
        <div className="card-body p-0">
          {viewMode === 'today' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments today</h3>
                        <p className="text-gray-500">All appointments for today are completed or cancelled.</p>
                      </td>
                    </tr>
                  ) : (
                    todayAppointments.map((appointment) => (
                      <tr key={appointment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(appointment.appointment_date).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit', 
                              hour12: true,
                              timeZone: 'Africa/Addis_Ababa'
                            })}
                            {appointment.is_walk_in && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Walk-In
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.customer_id?.first_name} {appointment.customer_id?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{appointment.customer_id?.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.service_id?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {(appointment.price || appointment.service_id?.price || 0).toFixed(2)} ETB
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {appointment.barber_id ? (
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.barber_id?.first_name} {appointment.barber_id?.last_name}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm flex flex-col">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              appointment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              appointment.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {appointment.payment_status?.replace('_', ' ') || 'pending'}
                            </span>
                            {appointment.payment_status === 'partially_paid' && appointment.amount_paid > 0 && (
                              <span className="text-xs text-gray-600 mt-1">
                                Paid: {appointment.amount_paid.toFixed(2)} ETB
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {!appointment.barber_id && (
                              <button
                                onClick={() => handleAssignBarber(appointment)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Assign Barber"
                              >
                                <Users className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleManageBill(appointment)}
                              className="text-green-600 hover:text-green-900"
                              title="Manage Bill"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              {barbers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No barbers found</h3>
                  <p className="text-gray-500">Add barbers to see appointments grouped by barber.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {barbers.map((barber) => {
                    const barberAppointments = appointments.filter(
                      apt => apt.barber_id?._id === barber._id || apt.barber_id?.toString() === barber._id
                    )
                    return (
                      <div key={barber._id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {barber.first_name} {barber.last_name}
                              </h3>
                              <p className="text-sm text-gray-600">{barber.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {barberAppointments.length} appointment{barberAppointments.length !== 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-gray-500">
                                {barberAppointments.filter(a => a.status === 'in_progress').length} in progress
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          {barberAppointments.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No appointments</p>
                          ) : (
                            <div className="space-y-3">
                              {barberAppointments
                                .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
                                .map((appointment) => (
                                  <div key={appointment._id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3">
                                        <div className="text-sm font-medium text-gray-900">
                                          {new Date(appointment.appointment_date).toLocaleTimeString('en-US', { 
                                            hour: 'numeric', 
                                            minute: '2-digit', 
                                            hour12: true 
                                          })}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">
                                            {appointment.customer_id?.first_name} {appointment.customer_id?.last_name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {appointment.service_id?.name} • {(appointment.price || appointment.service_id?.price || 0).toFixed(2)} ETB
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        appointment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                        appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {appointment.status.replace('_', ' ')}
                                      </span>
                                      <button
                                        onClick={() => handleManageBill(appointment)}
                                        className="text-green-600 hover:text-green-900"
                                        title="Manage Bill"
                                      >
                                        <DollarSign className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-bold text-gray-900">Pending Payments</h2>
            <p className="text-sm text-gray-600 mt-1">Appointments requiring payment</p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {pendingPayments.slice(0, 5).map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.customer_id?.first_name} {appointment.customer_id?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {appointment.service_id?.name} - {new Date(appointment.appointment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {(appointment.price || 0).toFixed(2)} ETB
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {appointment.payment_status?.replace('_', ' ')}
                        {appointment.payment_status === 'partially_paid' && appointment.amount_paid > 0 && (
                          <span className="block mt-0.5">Paid: {appointment.amount_paid.toFixed(2)} ETB</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleManageBill(appointment)}
                      className="btn btn-primary btn-sm"
                    >
                      Process Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showBarberModal && selectedAppointment && (
        <BarberAssignmentModal
          appointment={selectedAppointment}
          barbers={barbers}
          onAssign={handleBarberAssigned}
          onClose={() => {
            setShowBarberModal(false)
            setSelectedAppointment(null)
          }}
        />
      )}

      {showBillModal && selectedAppointment && (
        <BillManagementModal
          appointment={selectedAppointment}
          onUpdate={handleBillUpdated}
          onClose={() => {
            setShowBillModal(false)
            setSelectedAppointment(null)
          }}
        />
      )}

    </div>
  )
}

export default ReceptionistDashboard
