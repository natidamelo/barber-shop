import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { 
  Users, 
  Calendar, 
  Scissors, 
  Package, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { useUsers } from '../../hooks/useUsers'
import { useServices } from '../../hooks/useServices'
import { useAppointments, useAppointmentsByDateRange } from '../../hooks/useAppointments'
import { useLowStockItems } from '../../hooks/useInventory'
import { reviewService } from '../../services/reviewService'

// Format date to "X min ago" / "X hours ago" / "X days ago"
function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return d.toLocaleDateString()
}

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
  const { data: weekAppointmentsData = { data: [] }, isLoading: loadingWeekAppointments } = useAppointmentsByDateRange(weekStart, today, { limit: 500 })
  const { data: monthAppointmentsData = { data: [] }, isLoading: loadingMonthAppointments } = useAppointmentsByDateRange(monthStart, today, { limit: 1000 })
  const { data: lowStockData = { data: [] }, isLoading: loadingLowStock } = useLowStockItems()
  const { data: reviewsData = { data: [] }, isLoading: loadingReviews } = useQuery(
    ['recentReviews'],
    () => reviewService.getReviews({ limit: 10, sort: 'createdAt', order: 'desc' }),
    { staleTime: 1000 * 60 * 2 }
  )

  const users = usersData.data || []
  const services = servicesData.data || []
  const todayAppointments = todayAppointmentsData.data || []
  const weekAppointments = weekAppointmentsData.data || []
  const monthAppointments = monthAppointmentsData.data || []
  const lowStockItems = lowStockData.data || []
  const recentReviews = (reviewsData?.data || []).slice(0, 5)

  // Calculate real stats - only count completed and paid appointments for revenue
  const completedWeekAppointments = weekAppointments.filter(apt => 
    apt.status === 'completed' && apt.payment_status === 'paid'
  )
  const completedMonthAppointments = monthAppointments.filter(apt => 
    apt.status === 'completed' && apt.payment_status === 'paid'
  )

  const stats = {
    totalCustomers: users.filter(u => u.role === 'customer').length,
    totalBarbers: users.filter(u => u.role === 'barber').length,
    todayAppointments: todayAppointments.length,
    weekRevenue: completedWeekAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
    monthlyRevenue: completedMonthAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
    lowStockItems: lowStockItems.length,
    pendingAppointments: todayAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
    completedToday: todayAppointments.filter(a => a.status === 'completed').length
  }

  // Next appointment: first upcoming today (scheduled/confirmed) by appointment_date
  const now = new Date()
  const upcomingToday = todayAppointments
    .filter(a => (a.status === 'scheduled' || a.status === 'confirmed') && new Date(a.appointment_date) >= now)
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
  const nextAppointment = upcomingToday[0]

  const getCustomerName = (apt) => {
    const c = apt.customer_id
    if (!c) return 'Customer'
    if (typeof c === 'object') return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Customer'
    return 'Customer'
  }
  const getBarberName = (apt) => {
    const b = apt.barber_id
    if (!b) return 'Barber'
    if (typeof b === 'object') return [b.first_name, b.last_name].filter(Boolean).join(' ') || b.email || 'Barber'
    return 'Barber'
  }

  const nextAppointmentMinutes = nextAppointment
    ? Math.round((new Date(nextAppointment.appointment_date) - now) / 60000)
    : null

  // Recent activity: merge appointments, low stock, new customers, reviews (with timestamps for sorting)
  const customerUsers = users.filter(u => u.role === 'customer')
  const recentCustomers = [...customerUsers]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3)
  const recentWeekAppointments = [...weekAppointments]
    .sort((a, b) => new Date(b.appointment_date || b.createdAt) - new Date(a.appointment_date || a.createdAt))
    .slice(0, 5)

  const activityItems = []
  recentWeekAppointments.forEach(apt => {
    activityItems.push({
      type: 'appointment',
      action: 'New appointment booked',
      customer: getCustomerName(apt),
      time: formatTimeAgo(apt.appointment_date || apt.createdAt),
      sortAt: new Date(apt.appointment_date || apt.createdAt)
    })
  })
  lowStockItems.slice(0, 3).forEach(item => {
    activityItems.push({
      type: 'inventory',
      action: 'Low stock alert',
      item: item.name || 'Item',
      time: formatTimeAgo(item.updatedAt),
      sortAt: new Date(item.updatedAt || 0)
    })
  })
  recentCustomers.forEach(u => {
    activityItems.push({
      type: 'user',
      action: 'Customer registered',
      customer: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Customer',
      time: formatTimeAgo(u.createdAt),
      sortAt: new Date(u.createdAt || 0)
    })
  })
  recentReviews.forEach(r => {
    const customerName = r.customer_first_name != null || r.customer_last_name != null
      ? [r.customer_first_name, r.customer_last_name].filter(Boolean).join(' ')
      : (r.customer_id && typeof r.customer_id === 'object')
        ? [r.customer_id.first_name, r.customer_id.last_name].filter(Boolean).join(' ')
        : 'Customer'
    activityItems.push({
      type: 'review',
      action: 'Review submitted',
      customer: customerName || 'Customer',
      rating: r.rating,
      time: formatTimeAgo(r.created_at || r.createdAt),
      sortAt: new Date(r.created_at || r.createdAt || 0)
    })
  })
  const recentActivity = activityItems
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 8)

  if (loadingUsers || loadingServices || loadingAppointments || loadingWeekAppointments || loadingMonthAppointments || loadingLowStock) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  const quickActions = [
    { title: 'Add New Service', href: '/dashboard/admin/services', icon: Scissors, color: 'bg-blue-500' },
    { title: 'Manage Users', href: '/dashboard/admin/users', icon: Users, color: 'bg-green-500' },
    { title: 'Check Inventory', href: '/dashboard/admin/inventory', icon: Package, color: 'bg-yellow-500' },
    { title: 'View Reports', href: '/dashboard/admin/reports', icon: TrendingUp, color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Active Barbers"
          value={stats.totalBarbers}
          icon={Scissors}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={Calendar}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <StatCard
          title="Week Revenue"
          value={`${stats.weekRevenue} ETB`}
          icon={DollarSign}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Today's Overview</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.pendingAppointments}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Alerts</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {stats.lowStockItems > 0 ? (
                <Link to="/dashboard/admin/inventory" className="block">
                  <div className="flex items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">{stats.lowStockItems} Low Stock Item{stats.lowStockItems !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-red-600">Reorder supplies needed</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">No low stock alerts</p>
                    <p className="text-xs text-gray-500">Inventory levels are good</p>
                  </div>
                </div>
              )}
              {nextAppointment ? (
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Next appointment {nextAppointmentMinutes <= 0 ? 'now' : `in ${nextAppointmentMinutes} min`}
                    </p>
                    <p className="text-xs text-blue-600">
                      {getCustomerName(nextAppointment)} with {getBarberName(nextAppointment)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">No upcoming appointments today</p>
                    <p className="text-xs text-gray-500">Next appointment will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <Link
                    key={index}
                    to={action.href}
                    className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className={`p-2 rounded-md ${action.color} mr-3`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{action.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No recent activity yet. Appointments, new customers, low stock alerts, and reviews will appear here.</p>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={`${activity.type}-${index}-${activity.time || ''}`} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'appointment' ? 'bg-blue-500' :
                      activity.type === 'inventory' ? 'bg-red-500' :
                      activity.type === 'user' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.action}</p>
                      {activity.customer && (
                        <p className="text-xs text-gray-500">{activity.customer}</p>
                      )}
                      {activity.item && (
                        <p className="text-xs text-gray-500">{activity.item}</p>
                      )}
                      {activity.rating != null && (
                        <p className="text-xs text-gray-500">{'★'.repeat(activity.rating)} rating</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ title, value, icon: Icon, color, bgColor }) => {
  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard