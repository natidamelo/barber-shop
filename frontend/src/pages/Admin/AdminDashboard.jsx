import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Calendar, 
  Scissors, 
  Package, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  Settings,
  BarChart3,
  UserPlus
} from 'lucide-react'
import StatsCard from '../../components/UI/StatsCard'
import { useUsers } from '../../hooks/useUsers'
import { useServices } from '../../hooks/useServices'
import { useAppointments, useAppointmentsByDateRange } from '../../hooks/useAppointments'

const AdminDashboard = () => {
  const today = new Date().toISOString().split('T')[0]
  
  // Calculate date range for week (7 days ago to today)
  const weekStartDate = new Date()
  weekStartDate.setDate(weekStartDate.getDate() - 7)
  const weekStart = weekStartDate.toISOString().split('T')[0]
  
  // Calculate date range for month (30 days ago to today)
  const monthStartDate = new Date()
  monthStartDate.setDate(monthStartDate.getDate() - 30)
  const monthStart = monthStartDate.toISOString().split('T')[0]
  
  // Fetch real data
  const { data: usersData = { data: [] }, isLoading: loadingUsers } = useUsers({ limit: 100 })
  const { data: servicesData = { data: [] }, isLoading: loadingServices } = useServices({ limit: 50 })
  const { data: todayAppointmentsData = { data: [] }, isLoading: loadingAppointments } = useAppointments({ 
    date: today,
    limit: 100 
  })
  const { data: weekAppointmentsData = { data: [] }, isLoading: loadingWeekAppointments } = useAppointmentsByDateRange(weekStart, today)
  const { data: monthAppointmentsData = { data: [] }, isLoading: loadingMonthAppointments } = useAppointmentsByDateRange(monthStart, today)

  const users = usersData.data || []
  const services = servicesData.data || []
  const todayAppointments = todayAppointmentsData.data || []
  const weekAppointments = weekAppointmentsData.data || []
  const monthAppointments = monthAppointmentsData.data || []

  // Calculate real system stats
  const systemStats = {
    totalUsers: users.length,
    totalBarbers: users.filter(u => u.role === 'barber').length,
    totalCustomers: users.filter(u => u.role === 'customer').length,
    totalServices: services.filter(s => s.is_active).length,
    todayAppointments: todayAppointments.length,
    todayRevenue: todayAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
    weekRevenue: weekAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
    monthRevenue: monthAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
    lowStockItems: 3, // Would need inventory API
    pendingAppointments: todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
    completedToday: todayAppointments.filter(a => a.status === 'completed').length
  }

  if (loadingUsers || loadingServices || loadingAppointments || loadingWeekAppointments || loadingMonthAppointments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading admin dashboard...</span>
      </div>
    )
  }

  const systemHealth = [
    { metric: 'Database', status: 'healthy', value: '99.9%' },
    { metric: 'API Response', status: 'healthy', value: '120ms' },
    { metric: 'Storage', status: 'warning', value: '78%' },
    { metric: 'Active Sessions', status: 'healthy', value: '156' },
  ]

  const managementActions = [
    { title: 'Manage Users', href: '/dashboard/admin/users', icon: Users, color: 'bg-blue-500', count: systemStats.totalUsers },
    { title: 'Service Settings', href: '/dashboard/admin/services', icon: Scissors, color: 'bg-green-500', count: systemStats.totalServices },
    { title: 'Inventory Control', href: '/dashboard/admin/inventory', icon: Package, color: 'bg-yellow-500', alert: systemStats.lowStockItems > 0 },
    { title: 'Analytics & Reports', href: '/dashboard/admin/reports', icon: BarChart3, color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
          <p className="text-gray-600 mt-1">Monitor and manage your barber shop operations</p>
        </div>
        <Link to="/dashboard/admin/users" className="btn btn-primary flex items-center space-x-2">
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={systemStats.totalUsers}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100"
          trend="up"
          trendValue="+12 this month"
        />
        <StatsCard
          title="Active Barbers"
          value={systemStats.totalBarbers}
          icon={Scissors}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatsCard
          title="Today's Revenue"
          value={`${systemStats.todayRevenue} ETB`}
          icon={DollarSign}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
          trend="up"
          trendValue="+8.2%"
        />
        <StatsCard
          title="Month Revenue"
          value={`${systemStats.monthRevenue} ETB`}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-100"
          trend="up"
          trendValue="+15.3%"
        />
      </div>

      {/* System Health & Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {systemHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'healthy' ? 'bg-green-500' :
                      item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">{item.metric}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Today's Summary</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{systemStats.completedToday}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{systemStats.pendingAppointments}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{systemStats.totalCustomers}</p>
                <p className="text-sm text-gray-600">Customers</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{systemStats.totalServices}</p>
                <p className="text-sm text-gray-600">Services</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Management Center</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {managementActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  to={action.href}
                  className="relative flex flex-col items-center p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
                >
                  {action.alert && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                  <div className={`p-3 rounded-full ${action.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 text-center">{action.title}</span>
                  {action.count && (
                    <span className="text-xs text-gray-500 mt-1">{action.count} items</span>
                  )}
                  {action.alert && (
                    <span className="text-xs text-red-600 mt-1">Needs attention</span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {systemStats.lowStockItems > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Inventory Alert
              </h4>
              <p className="text-sm text-red-700">
                {systemStats.lowStockItems} items are running low on stock. 
                <Link to="/dashboard/admin/inventory" className="font-medium underline ml-1">
                  Check inventory →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard