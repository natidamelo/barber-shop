import React, { useState, useRef, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  Shield,
  Eye,
  UserPlus,
  Lock,
  Unlock,
  X
} from 'lucide-react'
import { useUsers } from '../../hooks/useUsers'
import { userService } from '../../services/userService'
import { authService } from '../../services/authService'
import UserEditModal from '../../components/UI/UserEditModal'
import UserViewModal from '../../components/UI/UserViewModal'
import CreateUserModal from '../../components/UI/CreateUserModal'
import toast from 'react-hot-toast'

const UserManagement = () => {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [resettingUserId, setResettingUserId] = useState(null)
  const [resetInfo, setResetInfo] = useState(null)
  const dropdownRefs = useRef({})
  const currentUser = authService.getStoredUser()

  // Fetch real users data
  const { data: usersData = { data: [] }, isLoading, error, refetch } = useUsers({
    page: 1,
    limit: 50
  })

  const users = usersData.data || []

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleCloseModals = () => {
    setShowEditModal(false)
    setSelectedUser(null)
  }

  const handleUpdateSuccess = () => {
    refetch()
  }

  const handleUserCreated = () => {
    refetch()
    setShowAddUser(false)
  }

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleDeleteUser = (user) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
    setOpenDropdownId(null)
  }

  const handleResetPassword = async (user) => {
    const userId = user._id || user.id
    setResettingUserId(userId)
    setOpenDropdownId(null)

    const loadingToastId = toast.loading('Generating temporary password...')

    try {
      const response = await userService.resetPassword(userId)
      if (response.success) {
        if (response.temp_password) {
          setResetInfo({
            user,
            tempPassword: response.temp_password
          })
          toast.success('Temporary password generated')
        } else {
          toast.success(response.message || 'Password reset successfully')
        }
      } else {
        toast.error(response.error || 'Failed to reset password')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    } finally {
      setResettingUserId(null)
      toast.dismiss(loadingToastId)
    }
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    const userId = userToDelete._id || userToDelete.id
    setDeletingUserId(userId)

    try {
      await userService.deleteUser(userId)
      toast.success('User deleted successfully')
      refetch()
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleToggleStatus = async (user, newStatus) => {
    try {
      await userService.updateUser(user._id || user.id, { status: newStatus })
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`)
      refetch()
      setOpenDropdownId(null)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update user status')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.values(dropdownRefs.current).forEach(ref => {
        if (ref && !ref.contains(event.target)) {
          setOpenDropdownId(null)
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Users</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    )
  }

  const roleFilters = [
    { key: 'all', label: 'All Users', count: users.length },
    { key: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin').length },
    { key: 'barber', label: 'Barbers', count: users.filter(u => u.role === 'barber').length },
    { key: 'receptionist', label: 'Receptionists', count: users.filter(u => u.role === 'receptionist').length },
    { key: 'customer', label: 'Customers', count: users.filter(u => u.role === 'customer').length }
  ]

  const filteredUsers = users.filter(user => {
    const matchesFilter = selectedFilter === 'all' || user.role === selectedFilter
    const matchesSearch = searchQuery === '' || 
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      barber: 'bg-green-100 text-green-800',
      receptionist: 'bg-orange-100 text-orange-800',
      customer: 'bg-blue-100 text-blue-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage customers, barbers, and admin accounts</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button 
            onClick={() => setShowAddUser(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="p-6 text-center">
            <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
            <p className="text-sm text-gray-600">Admins</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <User className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'barber').length}</p>
            <p className="text-sm text-gray-600">Barbers</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'customer').length}</p>
            <p className="text-sm text-gray-600">Customers</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <User className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'active').length}</p>
            <p className="text-sm text-gray-600">Active Users</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {roleFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedFilter === filter.key
                  ? 'bg-primary-100 text-primary-800 border border-primary-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{filter.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                selectedFilter === filter.key ? 'bg-primary-200' : 'bg-gray-200'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            className="input pl-10 w-full lg:w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id || user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {user.profile_image ? (
                            <>
                              <img
                                src={user.profile_image}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover bg-gray-100 absolute inset-0"
                                onError={(e) => {
                                  e.target.onerror = null
                                  e.target.style.display = 'none'
                                  const fallback = e.target.nextElementSibling
                                  if (fallback) fallback.style.display = 'flex'
                                }}
                              />
                              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary-100" style={{ display: 'none' }} aria-hidden>
                                <User className="h-5 w-5 text-primary-600" />
                              </div>
                            </>
                          ) : (
                            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary-100">
                              <User className="h-5 w-5 text-primary-600" />
                            </div>
                          )}
                        </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Member since {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                        {user.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.role === 'barber' ? (
                        user.commission_percentage !== null && user.commission_percentage !== undefined ? (
                          <span className="font-medium">{user.commission_percentage}%</span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.appointments_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2 relative">
                        <button 
                          onClick={() => handleViewUser(user)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="View user details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete user"
                            disabled={deletingUserId === (user._id || user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div 
                          className="relative"
                          ref={el => dropdownRefs.current[user._id || user.id] = el}
                        >
                          <button 
                            onClick={() => setOpenDropdownId(openDropdownId === (user._id || user.id) ? null : (user._id || user.id))}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="More options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openDropdownId === (user._id || user.id) && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                              <div className="py-1">
                                {user.status === 'active' ? (
                                  <button
                                    onClick={() => handleToggleStatus(user, 'suspended')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Lock className="h-4 w-4" />
                                    <span>Suspend User</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleStatus(user, 'active')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Unlock className="h-4 w-4" />
                                    <span>Activate User</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleResetPassword(user)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  disabled={resettingUserId === (user._id || user.id)}
                                >
                                  <Lock className="h-4 w-4" />
                                  <span>{resettingUserId === (user._id || user.id) ? 'Resetting...' : 'Reset Password'}</span>
                                </button>
                                {user.status === 'inactive' && (
                                  <button
                                    onClick={() => handleToggleStatus(user, 'active')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Unlock className="h-4 w-4" />
                                    <span>Activate User</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <UserEditModal
        user={selectedUser}
        isOpen={showEditModal}
        onClose={handleCloseModals}
        onUpdate={handleUpdateSuccess}
      />

      {/* Add User Modal */}
      <CreateUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onUserCreated={handleUserCreated}
      />

      {/* View User Modal */}
      <UserViewModal
        user={selectedUser}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setSelectedUser(null)
        }}
      />

      {/* Reset Password Result Modal */}
      {resetInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Temporary Password Generated</h3>
              <button
                onClick={() => setResetInfo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Share this temporary password securely with{' '}
                <span className="font-semibold">
                  {resetInfo.user.first_name} {resetInfo.user.last_name}
                </span>
                . They will be asked to create a new password after logging in.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <input
                  type="text"
                  readOnly
                  value={resetInfo.tempPassword}
                  className="input w-full font-mono"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                Make sure the user changes this password immediately after first login. 
                For security, this password will not be shown again.
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => setResetInfo(null)}
                  className="btn btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{userToDelete.first_name} {userToDelete.last_name}</strong>? 
                This action cannot be undone.
              </p>
              {userToDelete.role === 'barber' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This user has appointments. You may want to suspend the account instead.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setUserToDelete(null)
                  }}
                  className="btn btn-secondary"
                  disabled={deletingUserId === (userToDelete._id || userToDelete.id)}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="btn bg-red-600 hover:bg-red-700 text-white"
                  disabled={deletingUserId === (userToDelete._id || userToDelete.id)}
                >
                  {deletingUserId === (userToDelete._id || userToDelete.id) ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement