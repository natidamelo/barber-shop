import React, { useState } from 'react'
import { 
  Search, 
  DollarSign,
  Calendar,
  User,
  Scissors,
  CreditCard,
  Wallet,
  Globe,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react'
import { useAppointments } from '../../hooks/useAppointments'
import { appointmentService } from '../../services/appointmentService'
import BillManagementModal from '../../components/UI/BillManagementModal'
import toast from 'react-hot-toast'
import { useQueryClient } from 'react-query'

const BillingPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all') // all, pending, partially_paid, paid
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showBillModal, setShowBillModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch all appointments
  const { data: appointmentsData = { data: [] }, isLoading, error, refetch } = useAppointments({
    page: 1,
    limit: 1000
  })

  const appointments = appointmentsData.data || []

  const handleManageBill = (appointment) => {
    setSelectedAppointment(appointment)
    setShowBillModal(true)
  }

  const handleBillUpdated = async (paymentData) => {
    try {
      await appointmentService.updateAppointment(selectedAppointment._id, paymentData)
      toast.success('Payment updated successfully!')
      setShowBillModal(false)
      setSelectedAppointment(null)
      queryClient.invalidateQueries(['appointments'])
      refetch()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update payment')
    }
  }

  // Filter appointments
  const filteredAppointments = appointments.filter(appointment => {
    // Payment status filter
    const matchesPaymentFilter = paymentFilter === 'all' || 
      appointment.payment_status === paymentFilter

    // Search filter
    const matchesSearch = searchQuery === '' || 
      appointment.customer_id?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.customer_id?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.customer_id?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service_id?.name?.toLowerCase().includes(searchQuery.toLowerCase())

    // Date range filter (based on appointment_date)
    let matchesDate = true
    if (startDate || endDate) {
      const aptDate = appointment.appointment_date ? new Date(appointment.appointment_date) : null
      if (!aptDate || Number.isNaN(aptDate.getTime())) {
        matchesDate = false
      } else {
        if (startDate) {
          const start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
          if (aptDate < start) matchesDate = false
        }
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          if (aptDate > end) matchesDate = false
        }
      }
    }

    return matchesPaymentFilter && matchesSearch && matchesDate
  })

  // Calculate statistics (respect current filters so cards match the table)
  const pendingAppointments = filteredAppointments.filter(apt => 
    apt.payment_status === 'pending' || apt.payment_status === 'partially_paid'
  )
  const paidAppointments = filteredAppointments.filter(apt => apt.payment_status === 'paid')
  
  // Calculate pending amount correctly: for partially_paid, show remaining unpaid amount
  const totalPending = pendingAppointments.reduce((sum, apt) => {
    const price = apt.price || 0
    const amountPaid = apt.amount_paid || 0
    
    if (apt.payment_status === 'partially_paid') {
      // For partially paid, calculate remaining unpaid amount
      return sum + (price - amountPaid)
    } else {
      // For pending, use full price
      return sum + price
    }
  }, 0)
  
  const totalPaid = paidAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
  // Total Revenue = all paid appointments (real collected revenue, regardless of status)
  const totalRevenue = paidAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partially_paid: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: Wallet,
      card: CreditCard,
      online: Globe,
      other: MoreHorizontal
    }
    return icons[method] || DollarSign
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading billing information...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Billing</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing Management</h1>
          <p className="text-gray-600 mt-1">Manage payments and billing for all appointments</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {pendingAppointments.length}
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  {totalPending.toFixed(2)} ETB
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid Appointments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {paidAppointments.length}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {totalPaid.toFixed(2)} ETB
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalRevenue.toFixed(2)} ETB
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {startDate || endDate ? 'Filtered by date range' : 'All time'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {appointments.length}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  All statuses
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name, email, or service..."
                className="input pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Payments</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                      <p className="text-gray-500">
                        {searchQuery || paymentFilter !== 'all' 
                          ? 'Try adjusting your filters.' 
                          : 'No appointments have been created yet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appointment) => {
                    const PaymentMethodIcon = getPaymentMethodIcon(appointment.payment_method)
                    return (
                      <tr key={appointment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {appointment.customer_id?.first_name} {appointment.customer_id?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {appointment.customer_id?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Scissors className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {appointment.service_id?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {appointment.service_id?.duration} min
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {(appointment.price || 0).toFixed(2)} ETB
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(appointment.payment_status)}`}>
                              {appointment.payment_status?.replace('_', ' ') || 'pending'}
                            </span>
                            {appointment.payment_status === 'partially_paid' && (
                              <span className="text-xs font-medium text-orange-700 mt-1">
                                Paid: {(appointment.amount_paid || 0).toFixed(2)} ETB / {(appointment.price || 0).toFixed(2)} ETB
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {appointment.payment_method ? (
                            <div className="flex items-center space-x-1">
                              <PaymentMethodIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900 capitalize">
                                {appointment.payment_method}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status?.replace('_', ' ') || 'scheduled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleManageBill(appointment)}
                            className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                          >
                            <DollarSign className="h-4 w-4" />
                            <span>Manage Bill</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bill Management Modal */}
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

export default BillingPage
