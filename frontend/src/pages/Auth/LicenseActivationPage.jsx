import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Monitor, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { licenseService, getComputerId, getStoredLicenseKey } from '../../services/licenseService'
import toast from 'react-hot-toast'

const LicenseActivationPage = () => {
  const [licenseKey, setLicenseKey] = useState('')
  const [computerId, setComputerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [activated, setActivated] = useState(false)
  const [licenseInfo, setLicenseInfo] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const id = getComputerId()
    setComputerId(id)
    const stored = getStoredLicenseKey()
    if (stored) setLicenseKey(stored)
  }, [])

  const formatKey = (value) => {
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16)
    const parts = clean.match(/.{1,4}/g) || []
    return parts.join('-')
  }

  const handleKeyChange = (e) => {
    setLicenseKey(formatKey(e.target.value))
  }

  const handleActivate = async (e) => {
    e.preventDefault()
    if (licenseKey.replace(/-/g, '').length !== 16) {
      toast.error('Please enter a complete license key (XXXX-XXXX-XXXX-XXXX)')
      return
    }
    setLoading(true)
    try {
      const result = await licenseService.activate(licenseKey)
      setLicenseInfo(result.data)
      setActivated(true)
      toast.success('License activated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Activation failed. Please check your license key.')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Barber Pro</h1>
          <p className="text-gray-400 mt-2">Software License Activation</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {!activated ? (
            <>
              <div className="bg-primary-600 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">Activate Your License</h2>
                <p className="text-primary-200 text-sm mt-1">Enter the license key provided after purchase</p>
              </div>

              <form onSubmit={handleActivate} className="p-6 space-y-5">
                {/* License Key Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Key
                  </label>
                  <input
                    type="text"
                    className="input font-mono text-center text-xl tracking-widest uppercase"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={licenseKey}
                    onChange={handleKeyChange}
                    maxLength={19}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: XXXX-XXXX-XXXX-XXXX</p>
                </div>

                {/* Computer ID Display */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <Monitor className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Your Computer ID</p>
                      <p className="font-mono text-sm font-bold text-gray-800 truncate">{computerId}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This license will be permanently bound to this computer.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || licenseKey.replace(/-/g, '').length !== 16}
                  className="btn btn-primary btn-lg w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner w-5 h-5"></div>
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      <span>Activate License</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Already activated? Go to Login
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Activated!</h2>
              <p className="text-gray-500 mb-6">Your license has been successfully activated on this computer.</p>

              {licenseInfo && (
                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium text-gray-900">{licenseInfo.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">License Key</span>
                    <span className="font-mono font-medium text-gray-900">{licenseInfo.license_key}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expires</span>
                    <span className="font-medium text-gray-900">
                      {new Date(licenseInfo.expire_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Days Remaining</span>
                    <span className="font-medium text-green-600">{licenseInfo.days_remaining} days</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleContinue}
                className="btn btn-primary btn-lg w-full flex items-center justify-center space-x-2"
              >
                <span>Continue to Login</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Need a license? Contact your administrator.
        </p>
      </div>
    </div>
  )
}

export default LicenseActivationPage
