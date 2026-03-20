import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Settings, User } from 'lucide-react'
import { authService } from '../../services/authService'
import toast from 'react-hot-toast'

const DashboardHeader = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => authService.getStoredUser())

  useEffect(() => {
    const handleUserUpdated = () => setUser(authService.getStoredUser())
    window.addEventListener('user-updated', handleUserUpdated)
    return () => window.removeEventListener('user-updated', handleUserUpdated)
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {getPageTitle()} 
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-primary-600" />
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role === 'developer' ? 'Developer' : user?.role}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="h-4 w-4" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

const getPageTitle = () => {
  const path = window.location.pathname
  const titles = {
    '/dashboard': 'Dashboard',
    '/dashboard/appointments': 'Appointments',
    '/dashboard/profile': 'Profile',
    '/dashboard/admin': 'Admin Panel', 
    '/dashboard/admin/users': 'User Management',
    '/dashboard/admin/services': 'Service Management',
    '/dashboard/admin/inventory': 'Inventory Management',
    '/dashboard/admin/reports': 'Reports',
    '/dashboard/schedule': 'My Schedule',
    '/dashboard/reviews': 'Reviews'
  }
  return titles[path] || 'Dashboard'
}

export default DashboardHeader