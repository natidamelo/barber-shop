import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Package, 
  BarChart3, 
  Settings,
  User,
  Clock,
  Star,
  DollarSign,
  UserPlus,
  Cog,
  Key,
  Shield
} from 'lucide-react'
import { authService } from '../../services/authService'
import { useBusinessName } from '../../hooks/useBusinessName'
import CreateCustomerModal from '../UI/CreateCustomerModal'
import WalkInAppointmentModal from '../UI/WalkInAppointmentModal'
import CreateAppointmentModal from '../UI/CreateAppointmentModal'

const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(() => authService.getStoredUser())
  const { businessName } = useBusinessName()
  const [showAddCustomer, setShowAddCustomer] = useState(false)

  // Re-read user when profile is updated (e.g. profile picture changed)
  React.useEffect(() => {
    const handleUserUpdated = () => setUser(authService.getStoredUser())
    window.addEventListener('user-updated', handleUserUpdated)
    return () => window.removeEventListener('user-updated', handleUserUpdated)
  }, [])
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [showBookAppointment, setShowBookAppointment] = useState(false)
  
  // Check URL params for view state
  const searchParams = new URLSearchParams(location.search)
  const viewToday = searchParams.get('view') === 'today' || location.pathname.includes('appointments')
  const showBilling = location.pathname === '/dashboard/billing'

  const getNavigation = () => {
    // Washer: no dashboard access — only Profile
    if (user?.role === 'washer') {
      return [
        { name: 'Profile', href: '/dashboard/profile', icon: User },
      ]
    }

    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
      { name: 'Profile', href: '/dashboard/profile', icon: User },
    ]

    if (user?.role === 'superadmin') {
      return [
        ...baseNavigation,
        { name: 'Admin Panel', href: '/dashboard/admin', icon: Settings },
        { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
        { name: 'Service Management', href: '/dashboard/admin/services', icon: Scissors },
        { name: 'Inventory', href: '/dashboard/admin/inventory', icon: Package },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: BarChart3 },
        { name: 'License Dashboard', href: '/dashboard/admin/license-dashboard', icon: Key },
        { name: 'License Manager', href: '/dashboard/admin/licenses', icon: Shield },
        { name: 'Settings', href: '/dashboard/admin/settings', icon: Cog },
      ]
    }

    if (user?.role === 'admin') {
      return [
        ...baseNavigation,
        { name: 'Admin Panel', href: '/dashboard/admin', icon: Settings },
        { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
        { name: 'Service Management', href: '/dashboard/admin/services', icon: Scissors },
        { name: 'Inventory', href: '/dashboard/admin/inventory', icon: Package },
        { name: 'Reports', href: '/dashboard/admin/reports', icon: BarChart3 },
        { name: 'Settings', href: '/dashboard/admin/settings', icon: Cog },
      ]
    }

    if (user?.role === 'receptionist') {
      return [
        ...baseNavigation,
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Billing', href: '/dashboard/billing', icon: DollarSign },
      ]
    }

    if (user?.role === 'barber') {
      return [
        ...baseNavigation,
        { name: 'My Schedule', href: '/dashboard/schedule', icon: Clock },
        { name: 'My Reviews', href: '/dashboard/reviews', icon: Star },
      ]
    }

    // Customer navigation
    return [
      ...baseNavigation,
      { name: 'Book Appointment', href: '/booking', icon: Calendar },
      { name: 'My Reviews', href: '/dashboard/reviews', icon: Star },
    ]
  }

  const navigation = getNavigation()

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <Scissors className="h-8 w-8 text-primary-600" />
          <span className="text-xl font-bold text-gray-900">{businessName}</span>
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center px-6 mb-6">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={`${user?.first_name} ${user?.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-primary-600" />
              )}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            )
          })}

          {/* Quick Actions for Receptionist, Admin and Superadmin */}
          {(user?.role === 'receptionist' || user?.role === 'admin' || user?.role === 'superadmin') && (
            <>
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Quick Actions
                </p>
                
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                >
                  <UserPlus className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  Add Customer
                </button>

                <button
                  onClick={() => setShowWalkIn(true)}
                  className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                >
                  <Clock className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  Walk-In Appointment
                </button>

                <button
                  onClick={() => setShowBookAppointment(true)}
                  className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                >
                  <Calendar className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  Book Appointment
                </button>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  View Options
                </p>
                
                <button
                  onClick={() => {
                    // Navigate to appointments with today filter
                    if (!viewToday) {
                      navigate('/dashboard/appointments?view=today')
                    } else {
                      navigate('/dashboard/appointments')
                    }
                  }}
                  className={`group flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    viewToday
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Calendar className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    View: Today
                  </div>
                  {viewToday && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (!showBilling) {
                      navigate('/dashboard/billing')
                    } else {
                      navigate('/dashboard')
                    }
                  }}
                  className={`group flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    showBilling
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <DollarSign className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    Show Billing
                  </div>
                  {showBilling && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  )}
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Modals */}
        {showAddCustomer && (
          <CreateCustomerModal
            onCustomerCreated={() => {
              setShowAddCustomer(false)
            }}
            onClose={() => setShowAddCustomer(false)}
          />
        )}

        {showWalkIn && (
          <WalkInAppointmentModal
            onAppointmentCreated={() => {
              setShowWalkIn(false)
            }}
            onClose={() => setShowWalkIn(false)}
          />
        )}

        {showBookAppointment && (
          <CreateAppointmentModal
            onAppointmentCreated={() => {
              setShowBookAppointment(false)
            }}
            onClose={() => setShowBookAppointment(false)}
          />
        )}
      </div>
    </div>
  )
}

export default Sidebar