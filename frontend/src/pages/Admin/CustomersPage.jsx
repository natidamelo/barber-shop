import React, { useState } from 'react'
import { 
  Search, 
  UserPlus,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Eye,
  Droplets
} from 'lucide-react'
import { useCustomers, useWashers, useBarbers } from '../../hooks/useUsers'
import { useAppointments } from '../../hooks/useAppointments'
import CreateCustomerModal from '../../components/UI/CreateCustomerModal'
import { useQueryClient } from 'react-query'

const CustomersPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateCustomer, setShowCreateCustomer] = useState(false)
  const queryClient = useQueryClient()

  // Fetch customers
  const { data: customersData = { data: [] }, isLoading, error } = useCustomers({
    page: 1,
    limit: 100
  })

  // Fetch all appointments to calculate customer stats
  const { data: appointmentsData = { data: [] } } = useAppointments({
    page: 1,
    limit: 1000
  })

  const { data: washersData = { data: [] } } = useWashers()
  const { data: barbersData = { data: [] } } = useBarbers()
  const washers = washersData.data || []
  const barbers = barbersData.data || []

  const customers = customersData.data || []
  const appointments = appointmentsData.data || []

  const getWasherName = (washerId) => {
    if (!washerId) return null
    const w = washers.find(x => (x._id || x.id) === washerId)
    return w ? `${w.first_name} ${w.last_name}` : null
  }

  const getBarberName = (barberId) => {
    if (!barberId) return null
    const b = barbers.find(x => (x._id || x.id) === barberId)
    return b ? `${b.first_name} ${b.last_name}` : null
  }

  // Calculate customer statistics
  const getCustomerStats = (customerId) => {
    const customerAppointments = appointments.filter(apt => 
      apt.customer_id?._id?.toString() === customerId.toString() || 
      apt.customer_id?.toString() === customerId.toString()
    )
    
    const totalAppointments = customerAppointments.length
    const completedAppointments = customerAppointments.filter(apt => apt.status === 'completed').length
    const totalSpent = customerAppointments
      .filter(apt => apt.payment_status === 'paid')
      .reduce((sum, apt) => sum + (apt.price || 0), 0)
    
    return {
      totalAppointments,
      completedAppointments,
      totalSpent
    }
  }

  const handleCustomerCreated = () => {
    queryClient.invalidateQueries(['customers'])
    queryClient.invalidateQueries(['users'])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading customers...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customers</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    )
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      customer.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery)
    
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage and view all customer accounts</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowCreateCustomer(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              className="input pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Customers Table */}
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
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber (who cuts)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wash / Washer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member Since
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                      <p className="text-gray-500 mb-4">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first customer.'}
                      </p>
                      <button 
                        onClick={() => setShowCreateCustomer(true)}
                        className="btn btn-primary"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add First Customer
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const stats = getCustomerStats(customer._id)
                    return (
                      <tr key={customer._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {customer.first_name} {customer.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {customer._id.toString().substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center space-x-1">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                          {customer.phone && (
                            <div className="text-sm text-gray-500 flex items-center space-x-1 mt-1">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.barber_id ? (
                            <span className="text-sm text-gray-900">{getBarberName(customer.barber_id) || '—'}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{stats.totalAppointments} total</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {stats.completedAppointments} completed
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.wash_after_cut ? (
                            <div className="text-sm text-gray-900 flex items-center space-x-1">
                              <Droplets className="h-4 w-4 text-sky-500 flex-shrink-0" />
                              <span>{getWasherName(customer.washer_id) || 'Yes'}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span>{stats.totalSpent.toFixed(2)} ETB</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer.status === 'active' ? 'bg-green-100 text-green-800' :
                            customer.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {customer.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.createdAt 
                            ? new Date(customer.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'N/A'
                          }
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

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{customers.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {customers.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <User className="h-6 w-6 text-green-600" />
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
                  {appointments
                    .filter(apt => apt.payment_status === 'paid')
                    .reduce((sum, apt) => sum + (apt.price || 0), 0)
                    .toFixed(2)} ETB
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      {showCreateCustomer && (
        <CreateCustomerModal
          onCustomerCreated={handleCustomerCreated}
          onClose={() => setShowCreateCustomer(false)}
        />
      )}
    </div>
  )
}

export default CustomersPage
