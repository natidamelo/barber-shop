import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  Clock, 
  Star, 
  DollarSign, 
  Users,
  Scissors,
  TrendingUp,
  CheckCircle,
  Package,
  Gift,
  X
} from 'lucide-react'
import { useQuery } from 'react-query'
import { useAppointments } from '../../hooks/useAppointments'
import { useUserStats } from '../../hooks/useUsers'
import { reviewService } from '../../services/reviewService'
import { barberTipService } from '../../services/barberTipService'
import { authService } from '../../services/authService'

const BarberDashboard = () => {
  const user = authService.getStoredUser()
  const today = new Date().toISOString().split('T')[0]
  const [showTipsModal, setShowTipsModal] = useState(false)
  
  // Fetch real data
  const userId = user?._id || user?.id
  const { data: todayAppointments = { data: [] }, isLoading: loadingToday } = useAppointments({ 
    date: today,
    barber_id: userId 
  })
  
  const { data: userStats = { data: {} }, isLoading: loadingStats } = useUserStats(userId)
  const { data: barberStatsData = { data: {} }, isLoading: loadingReviews } = useQuery(
    ['barberStats', userId],
    () => reviewService.getBarberStats(userId),
    { enabled: !!userId }
  )
  const { data: tipsData = { data: [] }, isLoading: loadingTips } = useQuery(
    ['barberTips'],
    () => barberTipService.getTips({ limit: 100 }),
    { enabled: showTipsModal }
  )
  const tips = tipsData.data || []

  // Calculate stats from real data
  const appointments = todayAppointments.data || []
  const stats = {
    todayAppointments: appointments.length,
    weeklyAppointments: userStats.data?.total_appointments || 0,
    monthlyRevenue: userStats.data?.total_earnings || 0,
    averageRating: userStats.data?.average_rating || 0,
    totalCustomers: userStats.data?.total_customers || 0,
    barberPoints: userStats.data?.barber_points_received || 0,
    completedToday: appointments.filter(a => a.status === 'completed').length,
    nextAppointment: appointments
      .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0]
  }

  if (loadingToday || loadingStats || loadingReviews) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  // Transform real appointments to schedule format
  const todaySchedule = appointments.map(appointment => ({
    time: new Date(appointment.appointment_date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'Africa/Addis_Ababa'
    }),
    customer: appointment.customer_first_name + ' ' + appointment.customer_last_name,
    service: appointment.service_name,
    status: appointment.status
  })).sort((a, b) => new Date(`1970-01-01 ${a.time}`) - new Date(`1970-01-01 ${b.time}`))

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    return date.toLocaleDateString()
  }

  // Real reviews from API
  const rawReviews = barberStatsData?.data?.recent_reviews || []
  const recentReviews = rawReviews.map((r) => ({
    customer: [r.customer_first_name, r.customer_last_name].filter(Boolean).join(' ') || 'Customer',
    rating: r.rating,
    comment: r.comment || '',
    time: formatTimeAgo(r.created_at)
  }))

  const quickActions = [
    { title: 'View Schedule', href: '/dashboard/appointments', icon: Calendar, color: 'bg-blue-500' },
    { title: 'Manage Services', href: '/dashboard/admin/services', icon: Scissors, color: 'bg-green-500' },
    { title: 'Check Inventory', href: '/dashboard/admin/inventory', icon: Package, color: 'bg-yellow-500' },
    { title: 'My Reviews', href: '/dashboard/reviews', icon: Star, color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={Calendar}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Weekly Appointments"
          value={stats.weeklyAppointments}
          icon={Clock}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="Monthly Revenue"
          value={`${stats.monthlyRevenue} ETB`}
          icon={DollarSign}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <StatCard
          title="Average Rating"
          value={stats.averageRating}
          icon={Star}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <StatCard
          title="Points Received"
          value={stats.barberPoints}
          icon={Gift}
          color="text-amber-600"
          bgColor="bg-amber-100"
          subtitle="From customer tips. Ask the shop about redemption or rewards."
          actionLabel="View details"
          onAction={() => setShowTipsModal(true)}
        />
      </div>

      {/* Next Appointment Alert */}
      {stats.nextAppointment && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Next Appointment</h3>
              <p className="text-primary-100 mt-1">
                {new Date(stats.nextAppointment.appointment_date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true,
                  timeZone: 'Africa/Addis_Ababa'
                })} - {stats.nextAppointment.customer_first_name} {stats.nextAppointment.customer_last_name}
              </p>
              <p className="text-primary-200 text-sm">{stats.nextAppointment.service_name}</p>
            </div>
            <Clock className="h-8 w-8 text-primary-200" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Today's Schedule</h3>
              <Link to="/dashboard/appointments" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {todaySchedule.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">
                      {appointment.time}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appointment.customer}</p>
                      <p className="text-xs text-gray-500">{appointment.service}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {appointment.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {appointment.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Reviews</h3>
              <Link to="/dashboard/reviews" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {recentReviews.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Star className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No reviews yet. Reviews from customers will appear here.</p>
                </div>
              ) : (
                recentReviews.map((review, index) => (
                  <div key={index} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{review.customer}</p>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600 mb-1">"{review.comment}"</p>}
                    <p className="text-xs text-gray-400">{review.time}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  to={action.href}
                  className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className={`p-3 rounded-full ${action.color} mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 text-center">{action.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Points received – detail modal */}
      {showTipsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowTipsModal(false)} aria-hidden />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-500" />
                  Points received – details
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTipsModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {loadingTips ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="loading-spinner w-6 h-6" />
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : tips.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tips received yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {tips.map((tip) => (
                      <li key={tip.id || tip._id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900">{tip.customer_name || 'Customer'}</p>
                            <p className="text-sm text-amber-600 font-medium">{tip.points} points</p>
                            {tip.message && (
                              <p className="text-sm text-gray-600 mt-1">&ldquo;{tip.message}&rdquo;</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">
                            {tip.createdAt ? new Date(tip.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const StatCard = ({ title, value, icon: Icon, color, bgColor, subtitle, actionLabel, onAction }) => {
  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            {actionLabel && onAction && (
              <button type="button" onClick={onAction} className="text-xs font-medium text-primary-600 hover:text-primary-700 mt-2">
                {actionLabel}
              </button>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberDashboard