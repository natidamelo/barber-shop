import React, { useState, useEffect, useRef } from 'react'
import { X, Save, Loader, Upload } from 'lucide-react'
import { userService } from '../../services/userService'
import { authService } from '../../services/authService'
import toast from 'react-hot-toast'

const UserEditModal = ({ user, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
    role: 'customer',
    status: 'active',
    commission_percentage: '',
    profile_image: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const currentUser = authService.getStoredUser()
  const isDeveloper = currentUser?.role === 'developer'

  // Update form data when user prop changes
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        role: user.role || 'customer',
        status: user.status || 'active',
        commission_percentage: user.commission_percentage !== null && user.commission_percentage !== undefined ? user.commission_percentage : '',
        profile_image: user.profile_image || '',
        password: ''
      })
    }
  }, [user, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, WebP or GIF image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.')
      return
    }
    setUploading(true)
    try {
      const result = await userService.uploadProfileImage(file)
      const url = result?.profile_image_url
      if (url) {
        setFormData(prev => ({ ...prev, profile_image: url }))
        toast.success('Photo uploaded. Click Save to update.')
      } else {
        toast.error('Upload failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const userId = user?._id || user?.id
    if (!user || !userId) {
      toast.error('User information is missing')
      return
    }

    setLoading(true)

    try {
      const updateData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role,
        status: formData.status
      }
      if (formData.password?.trim()) {
        updateData.password = formData.password.trim()
      }
      // Optional fields: send value or null so backend can clear them
      updateData.phone = formData.phone != null && formData.phone.trim() !== '' ? formData.phone.trim() : null
      updateData.bio = formData.bio != null && formData.bio.trim() !== '' ? formData.bio.trim() : null
      updateData.profile_image = formData.profile_image != null && formData.profile_image.trim() !== '' ? formData.profile_image.trim() : null
      // Commission for barbers
      if (formData.commission_percentage !== '' && formData.commission_percentage != null) {
        const num = parseFloat(formData.commission_percentage)
        if (!Number.isNaN(num) && num >= 0 && num <= 100) {
          updateData.commission_percentage = num
        }
      } else if (user.role === 'barber') {
        updateData.commission_percentage = null
      }

      await userService.updateUser(userId, updateData)
      toast.success('User updated successfully!')
      onUpdate()
      onClose()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update user'
      toast.error(errorMessage)
      console.error('Error updating user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile picture
              </label>
              <div className="flex flex-wrap items-start gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  {uploading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{uploading ? 'Uploading...' : 'Attach file'}</span>
                </button>
                {formData.profile_image && (
                  <div className="flex items-center gap-2">
                    <img
                      src={formData.profile_image}
                      alt="Preview"
                      className="h-12 w-12 rounded-full object-cover border border-gray-200"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <span className="text-xs text-gray-500">Uploaded</span>
                  </div>
                )}
              </div>
              <input
                type="url"
                name="profile_image"
                value={formData.profile_image}
                onChange={handleChange}
                className="input mt-2"
                placeholder="Or paste image URL"
              />
              <p className="mt-1 text-xs text-gray-500">Attach a file (JPEG, PNG, WebP, GIF, max 5MB) or paste a URL.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="customer">Customer</option>
                <option value="barber">Barber</option>
                <option value="receptionist">Receptionist</option>
                <option value="washer">Washer</option>
                <option value="admin">Admin (Shop Owner)</option>
                {isDeveloper && <option value="developer">Developer</option>}
              </select>
            </div>

            {user.role === 'barber' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Percentage (%)
                  <span className="text-gray-500 text-xs ml-2">(0-100)</span>
                </label>
                <input
                  type="number"
                  name="commission_percentage"
                  value={formData.commission_percentage}
                  onChange={handleChange}
                  className="input"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 60"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Percentage of remaining amount (after shop cut) that the barber receives
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input"
                placeholder="Leave blank to keep current"
              />
              <p className="mt-1 text-xs text-gray-500">Type a new password to change it.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              className="input"
              placeholder="User bio..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserEditModal
