import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { getStoredLicenseKey, getComputerId, getStoredLicenseInfo } from '../../services/licenseService'
import { Key, CheckCircle, AlertTriangle, Calendar, Monitor, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

// ── License Expiry Welcome Banner ─────────────────────────────────────────────
const LicenseWelcomeBanner = ({ info, userName, onContinue }) => {
  const expireDate = new Date(info.expire_date)
  const isExpiringSoon = info.days_remaining <= 30

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Top gradient bar */}
        <div className={`h-2 w-full ${isExpiringSoon ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} />

        <div className="p-7 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isExpiringSoon ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            {isExpiringSoon
              ? <AlertTriangle className="w-8 h-8 text-amber-600" />
              : <CheckCircle className="w-8 h-8 text-emerald-600" />
            }
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Welcome back{userName ? `, ${userName}` : ''}!
          </h2>
          <p className="text-sm text-gray-500 mb-6">Your license is active and verified.</p>

          {/* License Info Card */}
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-500">
                <Key className="w-4 h-4" />
                <span className="text-xs font-medium">License Key</span>
              </div>
              <span className="font-mono text-xs font-bold text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-200">
                {info.license_key}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-500">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Expires On</span>
              </div>
              <span className={`text-xs font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-gray-700'}`}>
                {expireDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-500">
                <Monitor className="w-4 h-4" />
                <span className="text-xs font-medium">Days Remaining</span>
              </div>
              <span className={`text-sm font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'}`}>
                {info.days_remaining} days
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all ${isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.max(2, Math.min(100, (info.days_remaining / 365) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {isExpiringSoon && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 text-left">
              <strong>Warning:</strong> Your license expires in {info.days_remaining} days. Contact your administrator to renew.
            </div>
          )}

          <button
            onClick={onContinue}
            className="btn btn-primary w-full"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Login Page ────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [licenseKey, setLicenseKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLicenseField, setShowLicenseField] = useState(false)
  const [licenseWelcome, setLicenseWelcome] = useState(null)
  const [loginUserName, setLoginUserName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const stored = getStoredLicenseKey()
    if (stored) {
      setLicenseKey(stored)
      // License key already saved — hide the field by default
      setShowLicenseField(false)
    } else {
      setShowLicenseField(true)
    }
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const computer_id = getComputerId()
      const result = await authService.login({ ...formData, license_key: licenseKey, computer_id })

      // If license info returned, show the welcome banner
      if (result.license_info) {
        setLoginUserName(result.user?.first_name || '')
        setLicenseWelcome(result.license_info)
      } else {
        // superadmin — go straight to dashboard
        toast.success('Login successful!')
        navigate('/dashboard')
      }
    } catch (error) {
      const data = error.response?.data
      const message = data?.error || 'Login failed'
      toast.error(message)
      if (data?.require_license) {
        setShowLicenseField(true)
        setTimeout(() => navigate('/activate'), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleWelcomeContinue = () => {
    setLicenseWelcome(null)
    toast.success('Login successful!')
    navigate('/dashboard')
  }

  const storedKey = getStoredLicenseKey()
  const maskedKey = storedKey
    ? storedKey.slice(0, 4) + '-****-****-' + storedKey.slice(-4)
    : ''

  const demoAccounts = [
    { label: 'Super Admin', email: 'admin@barbershop.com', password: 'Admin123', badge: 'No license needed', badgeColor: 'bg-purple-100 text-purple-700' },
    { label: 'Barber', email: 'john.smith@barbershop.com', password: 'barber123', badge: 'Needs license', badgeColor: 'bg-blue-100 text-blue-700' },
    { label: 'Customer', email: 'david.wilson@example.com', password: 'customer123', badge: 'Needs license', badgeColor: 'bg-gray-100 text-gray-600' }
  ]

  return (
    <>
      {/* License Welcome Banner */}
      {licenseWelcome && (
        <LicenseWelcomeBanner
          info={licenseWelcome}
          userName={loginUserName}
          onContinue={handleWelcomeContinue}
        />
      )}

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                create a new account
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  className="input" placeholder="your@email.com"
                  value={formData.email} onChange={handleChange}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password" name="password" type="password" autoComplete="current-password" required
                  className="input" placeholder="Your password"
                  value={formData.password} onChange={handleChange}
                />
              </div>

              {/* License Key — only for shop admins */}
              <div>
                {storedKey && !showLicenseField ? (
                  /* Saved license chip */
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-700">Shop License Key Saved</p>
                        <p className="font-mono text-xs text-emerald-600">{maskedKey}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLicenseField(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-800 underline flex items-center space-x-1"
                    >
                      <span>Change</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="license_key" className="block text-sm font-medium text-gray-700">
                        License Key
                        <span className="ml-1 text-xs text-gray-400">(shop admin only)</span>
                      </label>
                      {storedKey && (
                        <button
                          type="button"
                          onClick={() => setShowLicenseField(false)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center space-x-1"
                        >
                          <ChevronUp className="w-3 h-3" />
                          <span>Hide</span>
                        </button>
                      )}
                    </div>
                    <input
                      id="license_key" name="license_key" type="text"
                      className="input font-mono tracking-widest uppercase"
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      value={licenseKey}
                      onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                      maxLength={19}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Staff (barbers, receptionists, customers) do not need a license key —
                      your shop's license covers everyone.{' '}
                      <Link to="/activate" className="text-primary-600 hover:underline">Activate a license</Link>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className={`btn btn-primary btn-lg w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-spinner w-4 h-4" />
                  <span>Signing in...</span>
                </div>
              ) : 'Sign In'}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">Sign up</Link>
              </p>
            </div>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Demo Accounts:</h3>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => setFormData({ email: account.email, password: account.password })}
                  className="w-full text-left p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{account.label}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${account.badgeColor}`}>{account.badge}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{account.email}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Click any demo account to auto-fill the form</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default LoginPage
