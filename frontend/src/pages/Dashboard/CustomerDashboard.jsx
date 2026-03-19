import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  Clock, 
  Star, 
  DollarSign, 
  Scissors,
  User,
  Heart,
  MessageCircle
} from 'lucide-react'
import { useAppointments } from '../../hooks/useAppointments'
import { useUserStats } from '../../hooks/useUsers'
import { authService } from '../../services/authService'

const CustomerDashboard = () => {
  const user = authService.getStoredUser()
  const userId = user?._id || user?.id
  
  // Fetch real data
  const { data: appointmentsData = { data: [] }, isLoading: loadingAppointments } = useAppointments({ 
    customer_id: userId,
    limit: 50 
  })
  
  const { data: userStatsData = { data: {} }, isLoading: loadingStats } = useUserStats(userId)

  const appointments = appointmentsData.data || []
  const userStats = userStatsData.data || {}

  // Calculate real stats (loyalty_points from API accounts for points given to barbers)
  const stats = {
    totalAppointments: userStats.total_appointments || appointments.length,
    totalSpent: userStats.total_spent || appointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
    averageRating: userStats.average_rating || 0,
    loyaltyPoints: userStats.loyalty_points ?? Math.floor((userStats.total_spent || 0) / 10),
    nextAppointment: appointments
      .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
      .filter(a => new Date(a.appointment_date) > new Date())
      .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0]
  }

  if (loadingAppointments || loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  // Get recent completed appointments
  const recentAppointments = appointments
    .filter(a => a.status === 'completed')
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
    .slice(0, 3)
    .map(appointment => ({
      date: appointment.appointment_date.split('T')[0],
      barber: `${appointment.barber_first_name} ${appointment.barber_last_name}`,
      service: appointment.service_name,
      status: appointment.status,
      rating: 5 // Would come from reviews API
    }))

  // Calculate favorite barbers from appointment history
  const barberStats = {}
  appointments.filter(a => a.status === 'completed').forEach(appointment => {
    const barberName = `${appointment.barber_first_name} ${appointment.barber_last_name}`
    if (!barberStats[barberName]) {
      barberStats[barberName] = { appointments: 0, rating: 4.8 }
    }
    barberStats[barberName].appointments++
  })

  const favoriteBarbers = Object.entries(barberStats)
    .sort((a, b) => b[1].appointments - a[1].appointments)
    .slice(0, 3)
    .map(([name, stats]) => ({
      name,
      appointments: stats.appointments,
      rating: stats.rating,
      speciality: 'Professional Services'
    }))

  const quickActions = [
    { title: 'Book Appointment', href: '/booking', icon: Calendar, color: 'bg-blue-500' },
    { title: 'View Services', href: '/services', icon: Scissors, color: 'bg-green-500' },
    { title: 'My Reviews', href: '/dashboard/reviews', icon: Star, color: 'bg-yellow-500' },
    { title: 'Update Profile', href: '/dashboard/profile', icon: User, color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Appointments"
          value={stats.totalAppointments}
          icon={Calendar}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Total Spent"
          value={`${stats.totalSpent} ETB`}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="Average Rating Given"
          value={stats.averageRating}
          icon={Star}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <StatCard
          title="Loyalty Points"
          value={stats.loyaltyPoints}
          icon={Heart}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
      </div>

      {/* Next Appointment */}
      {stats.nextAppointment && (
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Next Appointment</h3>
              <p className="text-primary-100 mt-1">
                {new Date(stats.nextAppointment.appointment_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'Africa/Addis_Ababa'
                })} at {' '}
                {new Date(stats.nextAppointment.appointment_date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true,
                  timeZone: 'Africa/Addis_Ababa'
                })}
              </p>
              <p className="text-primary-200 text-sm">
                {stats.nextAppointment.service_name} with {stats.nextAppointment.barber_first_name} {stats.nextAppointment.barber_last_name}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="h-8 w-8 text-primary-200 mb-2" />
              <Link 
                to="/dashboard/appointments" 
                className="text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full hover:bg-opacity-30 transition-colors"
              >
                Manage
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Appointments</h3>
              <Link to="/dashboard/appointments" className="text-sm text-primary-600 hover:text-primary-700">
                View All
              </Link>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {recentAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appointment.service}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(appointment.date).toLocaleDateString()} • {appointment.barber}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">{appointment.rating}</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {appointment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Favorite Barbers */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Your Favorite Barbers</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {favoriteBarbers.map((barber, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{barber.name}</p>
                      <p className="text-xs text-gray-500">{barber.speciality}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">{barber.rating}</span>
                    </div>
                    <p className="text-xs text-gray-400">{barber.appointments} visits</p>
                  </div>
                </div>
              ))}
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
                    className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className={`p-3 rounded-full ${action.color} mb-3`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center">{action.title}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Loyalty Program */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Loyalty Rewards</h3>
          </div>
          <div className="card-body">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stats.loyaltyPoints}</p>
              <p className="text-sm text-gray-600 mb-4">Points earned</p>
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full" 
                  style={{ width: `${(stats.loyaltyPoints % 500) / 5}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {500 - (stats.loyaltyPoints % 500)} points to next reward
              </p>
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

export default CustomerDashboard