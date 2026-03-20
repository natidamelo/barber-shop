import React, { useState } from 'react'
import { authService } from '../../services/authService'
import { getStoredLicenseInfo } from '../../services/licenseService'
import { AlertTriangle, Key, Calendar, X } from 'lucide-react'
import AdminDashboard from './AdminDashboard'
import BarberDashboard from './BarberDashboard'
import CustomerDashboard from './CustomerDashboard'
import ReceptionistDashboard from './ReceptionistDashboard'

// ── License Expiry Banner (shown on dashboard when expiring soon) ─────────────
const LicenseExpiryBanner = () => {
  const [dismissed, setDismissed] = useState(false)
  const info = getStoredLicenseInfo()

  if (!info || dismissed) return null
  if (info.days_remaining > 30) return null  // Only show when ≤ 30 days left

  const isUrgent = info.days_remaining <= 7

  return (
    <div className={`rounded-xl p-4 flex items-start justify-between gap-3 ${
      isUrgent
        ? 'bg-red-50 border border-red-200'
        : 'bg-amber-50 border border-amber-200'
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUrgent ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          <AlertTriangle className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <div>
          <p className={`font-semibold text-sm ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
            {isUrgent ? 'License Expiring Very Soon!' : 'License Expiring Soon'}
          </p>
          <div className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
            <span className="flex items-center space-x-1">
              <Key className="w-3 h-3" />
              <span className="font-mono">{info.license_key}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Expires: <strong>{new Date(info.expire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
            </span>
            <span className={`font-bold ${isUrgent ? 'text-red-700' : 'text-amber-800'}`}>
              {info.days_remaining} days remaining
            </span>
          </div>
          <p className={`text-xs mt-1 ${isUrgent ? 'text-red-500' : 'text-amber-600'}`}>
            Contact your administrator to renew your subscription.
          </p>
        </div>
      </div>
      <button onClick={() => setDismissed(true)}
        className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
          isUrgent ? 'text-red-400 hover:bg-red-100' : 'text-amber-400 hover:bg-amber-100'
        }`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

const DashboardPage = () => {
  const user = authService.getStoredUser()

  const renderDashboard = () => {
    const role = user?.role?.toLowerCase()

    // Washer: no dashboard access — only Profile
    if (role === 'washer') {
      return (
        <div className="card max-w-xl mx-auto">
          <div className="card-body text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No dashboard access
            </h2>
            <p className="text-gray-600 mb-4">
              Your account is set up as a washer. You don&apos;t have access to the dashboard. You can update your profile from the sidebar.
            </p>
            <p className="text-sm text-gray-500">
              Contact an admin if you need different access.
            </p>
          </div>
        </div>
      )
    }

    switch (role) {
      case 'admin':
      case 'developer':
      case 'superadmin':
        return <AdminDashboard />
      case 'barber':
        return <BarberDashboard />
      case 'customer':
        return <CustomerDashboard />
      case 'receptionist':
        return <ReceptionistDashboard />
      case 'washer':
        return (
          <div className="card max-w-xl mx-auto">
            <div className="card-body text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No dashboard access
              </h2>
              <p className="text-gray-600 mb-4">
                Your account is set up as a washer. You don&apos;t have access to the dashboard. You can update your profile from the sidebar.
              </p>
              <p className="text-sm text-gray-500">
                Contact an admin if you need different access.
              </p>
            </div>
          </div>
        )
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to BarberPro
            </h2>
            <p className="text-gray-600">
              Please contact support to activate your account.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* License expiry warning — only shows when ≤ 30 days left */}
      <LicenseExpiryBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening at your barber shop today.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {renderDashboard()}
    </div>
  )
}

export default DashboardPage