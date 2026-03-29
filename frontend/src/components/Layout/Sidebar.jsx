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
  Shield,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { authService } from '../../services/authService'
import { useBusinessName } from '../../hooks/useBusinessName'
import CreateCustomerModal from '../UI/CreateCustomerModal'
import WalkInAppointmentModal from '../UI/WalkInAppointmentModal'
import CreateAppointmentModal from '../UI/CreateAppointmentModal'

const Sidebar = ({ isOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
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
    const roleLower = user?.role?.toLowerCase() || '';
    const isAdminOrDev = roleLower.includes('admin') || roleLower.includes('dev') || user?.first_name === 'Admin';
    
    // Washer: no dashboard access — only Profile
    if (roleLower === 'washer') {
      return [
        { name: 'Profile', href: '/dashboard/profile', icon: User },
      ]
    }

    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
      { name: 'Profile', href: '/dashboard/profile', icon: User },
    ]

    if (isAdminOrDev) {
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

    if (roleLower === 'admin') {
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

    if (roleLower === 'receptionist') {
      return [
        ...baseNavigation,
        { name: 'Customers', href: '/dashboard/customers', icon: Users },
        { name: 'Billing', href: '/dashboard/billing', icon: DollarSign },
      ]
    }

    if (roleLower === 'barber') {
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

  // Close sidebar when navigating on mobile
  React.useEffect(() => {
    if (isOpen) onClose()
  }, [location.pathname])

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div 
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white shadow-2xl lg:shadow-none border-r border-gray-200 transition-all duration-300 ease-in-out transform 
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
        ${isCollapsed ? 'lg:w-20' : 'w-64'}`}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200 justify-between">
          <Link to="/dashboard" className="flex items-center space-x-2 overflow-hidden">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Scissors className="h-6 w-6 text-primary-600" />
            </div>
            <span className={`text-lg font-bold text-gray-900 truncate transition-all duration-300 ${isCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>
              {businessName || 'BarberShop'}
            </span>
          </Link>
          
          <div className="flex items-center">
            {/* Desktop Collapse Toggle */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            
            {/* Mobile Close Button */}
            <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:text-gray-900">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto no-scrollbar">
          {/* User Profile Section */}
          <div className={`px-4 mb-6 flex items-center transition-all duration-300 ${isCollapsed ? 'lg:px-5 lg:justify-center' : ''}`}>
            <div className="flex-shrink-0 relative group">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm border border-primary-50">
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
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden lg:block">
                  {user?.first_name} {user?.last_name}
                </div>
              )}
            </div>
            
            <div className={`ml-3 transition-all duration-300 origin-left ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-primary-600 font-medium capitalize">
                {(user?.role === 'developer' || user?.role === 'superadmin') ? 'Developer' : user?.role}
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
                  className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                  } ${isCollapsed ? 'lg:justify-center' : ''}`}
                  title={isCollapsed ? item.name : ""}
                >
                  <Icon
                    className={`flex-shrink-0 h-5 w-5 transition-colors ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-500'
                    } ${isCollapsed ? '' : 'mr-3'}`}
                  />
                  
                  <span className={`transition-all duration-300 origin-left ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
                    {item.name}
                  </span>
                  
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden lg:block shadow-lg">
                      {item.name}
                    </div>
                  )}
                </Link>
              )
            })}

            {/* Support collapsed menu sections */}
            {(user?.role === 'receptionist' || user?.role === 'admin' || user?.role === 'developer' || user?.role === 'superadmin') && (
              <div className="mt-6">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Operations
                  </p>
                )}
                <div className={`space-y-1 ${isCollapsed ? 'border-t border-gray-100 pt-4' : ''}`}>
                  <button
                    onClick={() => setShowAddCustomer(true)}
                    className={`group relative flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 ${isCollapsed ? 'lg:justify-center' : ''}`}
                    title={isCollapsed ? "Add Customer" : ""}
                  >
                    <UserPlus className={`flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-primary-500 ${isCollapsed ? '' : 'mr-3'}`} />
                    <span className={`transition-all duration-300 origin-left ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
                      Add Customer
                    </span>
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden lg:block">
                        Add Customer
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setShowWalkIn(true)}
                    className={`group relative flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 ${isCollapsed ? 'lg:justify-center' : ''}`}
                    title={isCollapsed ? "Walk-In Appointment" : ""}
                  >
                    <Clock className={`flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-primary-500 ${isCollapsed ? '' : 'mr-3'}`} />
                    <span className={`transition-all duration-300 origin-left ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
                      Walk-In
                    </span>
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden lg:block">
                        Walk-In
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setShowBookAppointment(true)}
                    className={`group relative flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 ${isCollapsed ? 'lg:justify-center' : ''}`}
                    title={isCollapsed ? "Book Appointment" : ""}
                  >
                    <Calendar className={`flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-primary-500 ${isCollapsed ? '' : 'mr-3'}`} />
                    <span className={`transition-all duration-300 origin-left ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
                      Book
                    </span>
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden lg:block">
                        Book
                      </div>
                    )}
                  </button>
                </div>

                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-6">
                    Quick Views
                  </p>
                )}
                <div className={`space-y-1 ${isCollapsed ? 'border-t border-gray-100 pt-4 mt-4' : ''}`}>
                  <button
                    onClick={() => {
                      if (!viewToday) navigate('/dashboard/appointments?view=today')
                      else navigate('/dashboard/appointments')
                    }}
                    className={`group relative flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      viewToday
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                        : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                    } ${isCollapsed ? 'lg:justify-center' : ''}`}
                    title={isCollapsed ? "View Today" : ""}
                  >
                    <div className="flex items-center">
                      <Calendar className={`flex-shrink-0 h-5 w-5 ${viewToday ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-500'} ${isCollapsed ? '' : 'mr-3'}`} />
                      <span className={`transition-all duration-300 origin-left ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
                        Today's View
                      </span>
                    </div>
                    {viewToday && !isCollapsed && (
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden lg:block">
                        Today's View
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (!showBilling) navigate('/dashboard/billing')
                      else navigate('/dashboard')
                    }}
                    className={`group relative flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      showBilling
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                        : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                    } ${isCollapsed ? 'lg:justify-center' : ''}`}
                    title={isCollapsed ? "Billing Overview" : ""}
                  >
                    <div className="flex items-center">
                      <DollarSign className={`flex-shrink-0 h-5 w-5 ${showBilling ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-500'} ${isCollapsed ? '' : 'mr-3'}`} />
                      <span className={`transition-all duration-300 origin-left ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:hidden' : 'w-auto opacity-100'}`}>
                        Billing
                      </span>
                    </div>
                    {showBilling && !isCollapsed && (
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity hidden lg:block">
                        Billing
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}
          </nav>

          {/* Modals remain same */}
          {showAddCustomer && (
            <CreateCustomerModal
              onCustomerCreated={() => setShowAddCustomer(false)}
              onClose={() => setShowAddCustomer(false)}
            />
          )}

          {showWalkIn && (
            <WalkInAppointmentModal
              onAppointmentCreated={() => setShowWalkIn(false)}
              onClose={() => setShowWalkIn(false)}
            />
          )}

          {showBookAppointment && (
            <CreateAppointmentModal
              onAppointmentCreated={() => setShowBookAppointment(false)}
              onClose={() => setShowBookAppointment(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default Sidebar