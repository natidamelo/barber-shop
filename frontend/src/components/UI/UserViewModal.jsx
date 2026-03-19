import React, { useState, useEffect } from 'react'
import { X, User, Mail, Phone, Shield, Calendar, Clock, DollarSign, Star, TrendingUp, Droplets, Scissors } from 'lucide-react'
import { userService } from '../../services/userService'

const UserViewModal = ({ user, isOpen, onClose }) => {
  const [userDetails, setUserDetails] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && isOpen) {
      fetchUserDetails()
    }
  }, [user, isOpen])

  const fetchUserDetails = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const userId = user._id || user.id
      const [userResponse, statsResponse] = await Promise.all([
        userService.getUser(userId),
        userService.getUserStats(userId).catch(() => null)
      ])
      
      setUserDetails(userResponse.data)
      if (statsResponse?.data) {
        setStats(statsResponse.data)
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  const displayUser = userDetails || user

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') return 'Never'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Never'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner w-8 h-8"></div>
            <span className="ml-2 text-gray-600">Loading user details...</span>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-start space-x-4">
              <div className="h-20 w-20 rounded-full flex-shrink-0 overflow-hidden bg-primary-100 flex items-center justify-center relative">
                {displayUser.profile_image ? (
                  <>
                    <img
                      src={displayUser.profile_image}
                      alt=""
                      className="h-20 w-20 object-cover absolute inset-0"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.style.display = 'none'
                        const fallback = e.target.nextElementSibling
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div className="h-20 w-20 rounded-full flex items-center justify-center bg-primary-100" style={{ display: 'none' }} aria-hidden>
                      <User className="h-10 w-10 text-primary-600" />
                    </div>
                  </>
                ) : (
                  <User className="h-10 w-10 text-primary-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">
                  {displayUser.first_name} {displayUser.last_name}
                </h3>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    displayUser.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    displayUser.role === 'barber' ? 'bg-green-100 text-green-800' :
                    displayUser.role === 'receptionist' ? 'bg-blue-100 text-blue-800' :
                    displayUser.role === 'washer' ? 'bg-sky-100 text-sky-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {displayUser.role?.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    displayUser.status === 'active' ? 'bg-green-100 text-green-800' :
                    displayUser.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {displayUser.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{displayUser.email}</p>
                    </div>
                  </div>
                  {displayUser.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-900">{displayUser.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Account Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(displayUser.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Last Login</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(displayUser.last_login)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer: Barber (who cuts), Wash after cut & Washer */}
            {displayUser.role === 'customer' && (
              <>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Scissors className="h-5 w-5 text-green-600" />
                    <span>Barber (who cuts this customer)</span>
                  </h4>
                  <p className="text-sm font-medium text-gray-900">
                    {displayUser.barber_name || '—'}
                  </p>
                </div>
                <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Droplets className="h-5 w-5 text-sky-600" />
                    <span>Wash preference</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Wash after cut</p>
                      <p className="text-sm font-medium text-gray-900">
                        {displayUser.wash_after_cut ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {displayUser.wash_after_cut && (
                      <div>
                        <p className="text-sm text-gray-500">Washer</p>
                        <p className="text-sm font-medium text-gray-900">
                          {displayUser.washer_name || '—'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Bio */}
            {displayUser.bio && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Bio</h4>
                <p className="text-sm text-gray-700">{displayUser.bio}</p>
              </div>
            )}

            {/* Barber-specific info */}
            {displayUser.role === 'barber' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Barber Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Commission Percentage</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {displayUser.commission_percentage !== null && displayUser.commission_percentage !== undefined
                        ? `${displayUser.commission_percentage}%`
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            {stats && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.total_appointments !== undefined && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <p className="text-sm text-gray-600">Total Appointments</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_appointments}</p>
                    </div>
                  )}
                  {stats.completed_appointments !== undefined && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <p className="text-sm text-gray-600">Completed</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.completed_appointments}</p>
                    </div>
                  )}
                  {stats.total_earnings !== undefined && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="h-5 w-5 text-yellow-600" />
                        <p className="text-sm text-gray-600">Total Earnings</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_earnings.toFixed(2)} ETB</p>
                    </div>
                  )}
                  {stats.average_rating !== undefined && stats.average_rating !== null && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="h-5 w-5 text-purple-600" />
                        <p className="text-sm text-gray-600">Average Rating</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.average_rating}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserViewModal
