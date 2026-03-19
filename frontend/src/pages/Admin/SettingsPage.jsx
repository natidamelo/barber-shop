import React, { useState, useEffect } from 'react'
import { Settings, Save, Building2, Loader2 } from 'lucide-react'
import { settingsService } from '../../services/settingsService'
import toast from 'react-hot-toast'

const SettingsPage = () => {
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await settingsService.getSetting('business_name')
      if (response.success && response.data?.value) {
        setBusinessName(response.data.value)
      } else {
        // Default value if setting doesn't exist
        setBusinessName('BarberPro')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      // If setting doesn't exist, use default
      setBusinessName('BarberPro')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (!businessName.trim()) {
      toast.error('Business name cannot be empty')
      return
    }

    try {
      setSaving(true)
      await settingsService.updateBusinessName(businessName.trim())
      toast.success('Business name updated successfully!')
      // Trigger a page reload to update all components
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error(error.response?.data?.error || 'Failed to update business name')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600 mt-1">Manage your business configuration</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Settings className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
            <p className="text-sm text-gray-500">Configure basic business information</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>Business Name</span>
              </div>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              This name will be displayed throughout the application (sidebar, navbar, etc.)
            </p>
            <input
              type="text"
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="Enter business name"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {businessName.length}/100 characters
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setBusinessName('BarberPro')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to Default
            </button>
            <button
              type="submit"
              disabled={saving || !businessName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">About Settings</h4>
            <p className="text-sm text-blue-700">
              Changes to the business name will be reflected immediately across the entire application. 
              You may need to refresh the page to see the changes in all components.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
