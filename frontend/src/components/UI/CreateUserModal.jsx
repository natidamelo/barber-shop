import React, { useMemo, useState, useRef } from 'react'
import { X, UserPlus, Mail, Phone, Shield, Copy, Scissors, Upload, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import { userService } from '../../services/userService'

const CreateUserModal = ({ isOpen, onClose, onUserCreated }) => {
  const currentUser = authService.getStoredUser()
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'developer'
  const isPrivileged = currentUser?.role === 'admin' || isSuperAdmin
  const canCreateBarber = isPrivileged
  const canCreateReceptionist = isPrivileged
  const canCreateWasher = isPrivileged

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'customer',
    password: '',
    commission_percentage: '',
    profile_image: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [createdTempPassword, setCreatedTempPassword] = useState('')
  const fileInputRef = useRef(null)

  const roleOptions = useMemo(() => {
    const base = [{ value: 'customer', label: 'Customer' }]
    if (canCreateBarber) base.push({ value: 'barber', label: 'Barber' })
    if (canCreateReceptionist) base.push({ value: 'receptionist', label: 'Receptionist' })
    if (canCreateWasher) base.push({ value: 'washer', label: 'Washer (no dashboard)' })
    if (isSuperAdmin) base.push({ value: 'admin', label: 'Admin (Shop Owner)' })
    return base
  }, [canCreateBarber, canCreateReceptionist, canCreateWasher, isSuperAdmin])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        toast.success('Photo uploaded. Create user to save.')
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

  const handleCopyTempPassword = async () => {
    if (!createdTempPassword) return
    try {
      await navigator.clipboard.writeText(createdTempPassword)
      toast.success('Temporary password copied')
    } catch {
      toast.error('Could not copy password')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setCreatedTempPassword('')

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || undefined,
        role: formData.role
      }

      if (formData.password?.trim()) {
        payload.password = formData.password.trim()
      }
      if (formData.profile_image?.trim()) {
        payload.profile_image = formData.profile_image.trim()
      }

      if (payload.role === 'barber' && canCreateBarber) {
        if (formData.commission_percentage !== '') {
          const commission = parseFloat(formData.commission_percentage)
          if (Number.isNaN(commission) || commission < 0 || commission > 100) {
            toast.error('Commission percentage must be between 0 and 100')
            setIsSubmitting(false)
            return
          }
          payload.commission_percentage = commission
        }
      }

      const response = await userService.createUser(payload)
      const created = response?.data

      if (created?.temp_password) {
        setCreatedTempPassword(created.temp_password)
        toast.success('User created with temporary password', { duration: 4000 })
      } else {
        toast.success('User created successfully!')
      }

      onUserCreated?.(created)

      // reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'customer',
        password: '',
        commission_percentage: '',
        profile_image: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add User</h2>
              <p className="text-sm text-gray-600">Create a new customer, barber, receptionist, or washer account</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="input w-full"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-1" />
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input w-full"
              placeholder="+2519..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile picture <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <div className="flex flex-wrap items-center gap-3 mb-2">
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
                <img
                  src={formData.profile_image}
                  alt="Preview"
                  className="h-10 w-10 rounded-full object-cover border border-gray-200"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
            </div>
            <input
              type="url"
              name="profile_image"
              value={formData.profile_image}
              onChange={handleChange}
              className="input w-full"
              placeholder="Or paste image URL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="h-4 w-4 inline mr-1" />
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input w-full"
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {!canCreateBarber && (
              <p className="text-xs text-gray-500 mt-1">
                Only admin accounts can create barber, receptionist, or washer accounts.
              </p>
            )}
          </div>

          {formData.role === 'barber' && canCreateBarber && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Scissors className="h-4 w-4 text-gray-600" />
                <p className="text-sm font-medium text-gray-900">Barber options</p>
              </div>
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
                  className="input w-full"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 60"
                />
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> If you leave password blank, the system will generate a temporary password.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password (optional)
            </label>
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input w-full"
              placeholder="Leave blank to auto-generate"
            />
          </div>

          {createdTempPassword && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-green-900">Temporary password</p>
                <p className="text-sm text-green-800 mt-1 font-mono break-all">{createdTempPassword}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyTempPassword}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateUserModal

