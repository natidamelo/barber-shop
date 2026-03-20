import React from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../../services/authService'

const ProtectedRoute = ({ children, roles = [] }) => {
  const isAuthenticated = authService.isAuthenticated()
  const user = authService.getStoredUser()

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If user must change password, force them to profile page
  const mustChangePassword = user?.must_change_password
  const currentPath = window.location.pathname
  if (mustChangePassword && currentPath !== '/dashboard/profile') {
    return <Navigate to="/dashboard/profile" replace />
  }

  // developer passes all role checks
  const isDeveloper = user?.role === 'developer'

  // If roles are specified, check if user has required role
  if (roles.length > 0 && !isDeveloper && (!user || !roles.includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute