import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import {
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  TrendingUp,
  Activity,
  Bell,
  ChevronRight,
  Download,
  Eye,
  MoreVertical,
  Zap,
  ChevronDown,
  X
} from 'lucide-react'
import { licenseService } from '../../services/licenseService'
import { userService } from '../../services/userService'
import toast from 'react-hot-toast'

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  expired: 'bg-red-100 text-red-800 border-red-200',
  suspended: 'bg-amber-100 text-amber-800 border-amber-200',
  pending_activation: 'bg-blue-100 text-blue-800 border-blue-200'
}
const STATUS_DOT = {
  active: 'bg-emerald-500',
  expired: 'bg-red-500',
  suspended: 'bg-amber-500',
  pending_activation: 'bg-blue-500'
}
const STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  suspended: 'Suspended',
  pending_activation: 'Pending'
}

// ─── Customer Search Autocomplete ────────────────────────────────────────────
const CustomerSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedName, setSelectedName] = useState('')
  const wrapperRef = useRef(null)

  // Fetch all users (admin + customers) for the dropdown
  const { data } = useQuery(
    ['users-for-license', query],
    () => userService.getUsers({ search: query, limit: 20 }),
    { keepPreviousData: true, enabled: open }
  )

  const users = data?.data || []

  // Filter to only admin and customer roles (the people who buy licenses)
  const filtered = users.filter(u =>
    ['admin', 'customer'].includes(u.role)
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (user) => {
    setSelectedName(`${user.first_name} ${user.last_name}`)
    setQuery('')
    setOpen(false)
    onSelect({
      customer_name: `${user.first_name} ${user.last_name}`,
      customer_email: user.email || '',
      customer_phone: user.phone || ''
    })
  }

  const handleClear = () => {
    setSelectedName('')
    setQuery('')
    onSelect({ customer_name: '', customer_email: '', customer_phone: '' })
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Search Existing Customer
        <span className="ml-1.5 text-xs text-gray-400 font-normal">(optional — or fill manually below)</span>
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        {selectedName ? (
          <div className="input pl-10 pr-10 flex items-center bg-primary-50 border-primary-200 text-primary-800 font-medium">
            <span className="truncate">{selectedName}</span>
            <button type="button" onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <input
            className="input pl-10 pr-4"
            placeholder="Type name or email to search..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
        )}
      </div>

      {open && !selectedName && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              {query ? 'No customers found' : 'Start typing to search...'}
            </div>
          ) : (
            filtered.map(user => (
              <button
                key={user._id}
                type="button"
                onMouseDown={() => handleSelect(user)}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-primary-50 transition-colors text-left border-b border-gray-50 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user.first_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Generate License Modal ───────────────────────────────────────────────────
const GenerateModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  const [loading, setLoading] = useState(false)

  const handleCustomerSelect = (data) => {
    setForm(prev => ({ ...prev, ...data }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await licenseService.generate(form)
      onSuccess(result.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate license')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Generate License</h2>
              <p className="text-xs text-gray-500">1-year subscription from today</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* ── Customer Search ── */}
          <CustomerSearch onSelect={handleCustomerSelect} />

          <div className="flex items-center space-x-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium px-2">or fill manually</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Manual Fields ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-10"
                placeholder="Full name"
                value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                className="input pl-10"
                placeholder="customer@email.com"
                value={form.customer_email}
                onChange={e => setForm({ ...form, customer_email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-10"
                placeholder="+251..."
                value={form.customer_phone}
                onChange={e => setForm({ ...form, customer_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 flex items-start space-x-3">
            <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              License will be valid for <strong>1 year</strong> from today and start in <strong>pending activation</strong> status.
            </div>
          </div>

          <div className="flex space-x-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1 flex items-center justify-center space-x-2">
              {loading
                ? <><div className="loading-spinner w-4 h-4" /><span>Generating...</span></>
                : <><Zap className="w-4 h-4" /><span>Generate</span></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── License Detail Drawer ────────────────────────────────────────────────────
const LicenseDrawer = ({ license, onClose, onRenew, onDelete, onSuspend }) => {
  const [renewLoading, setRenewLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  if (!license) return null

  const copyKey = () => { navigator.clipboard.writeText(license.license_key); toast.success('Copied!') }

  const handleRenew = async () => {
    if (!window.confirm(`Renew license for ${license.customer_name} for 1 more year?`)) return
    setRenewLoading(true)
    try { await onRenew(license._id); onClose() }
    finally { setRenewLoading(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this license permanently?')) return
    setDeleteLoading(true)
    try { await onDelete(license._id); onClose() }
    finally { setDeleteLoading(false) }
  }

  const daysLeft = license.days_remaining
  const isExpiringSoon = license.status === 'active' && daysLeft <= 30 && daysLeft > 0

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">License Details</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{license.license_key}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Key Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">License Key</span>
              </div>
              <button onClick={copyKey} className="flex items-center space-x-1 text-xs text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-colors">
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <p className="font-mono text-xl font-bold tracking-widest">{license.license_key}</p>
            <div className="mt-3 flex items-center space-x-2">
              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[license.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[license.status]}`} />
                <span>{STATUS_LABELS[license.status]}</span>
              </span>
              {isExpiringSoon && (
                <span className="text-xs text-amber-400 font-medium flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Expiring in {daysLeft}d</span>
                </span>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</p>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{license.customer_name}</p>
                  <p className="text-xs text-gray-500">{license.customer_email}</p>
                </div>
              </div>
              {license.customer_phone && (
                <div className="flex items-center space-x-3 pl-11">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-600">{license.customer_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">Start Date</p>
              <p className="text-sm font-bold text-green-800">{new Date(license.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className={`rounded-xl p-4 ${license.status === 'expired' ? 'bg-red-50' : 'bg-blue-50'}`}>
              <p className={`text-xs font-medium mb-1 ${license.status === 'expired' ? 'text-red-600' : 'text-blue-600'}`}>Expire Date</p>
              <p className={`text-sm font-bold ${license.status === 'expired' ? 'text-red-800' : 'text-blue-800'}`}>
                {new Date(license.expire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Days remaining bar */}
          {license.status === 'active' && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Subscription progress</span>
                <span className={daysLeft <= 30 ? 'text-red-600 font-semibold' : 'text-gray-600'}>{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${daysLeft <= 30 ? 'bg-red-500' : daysLeft <= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, (daysLeft / 365) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Computer ID */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bound Computer</p>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="font-mono text-sm text-gray-700">{license.computer_id || <span className="text-gray-400 font-sans">Not activated yet</span>}</span>
            </div>
            {license.activated_at && (
              <p className="text-xs text-gray-400 mt-1">Activated {new Date(license.activated_at).toLocaleDateString()}</p>
            )}
          </div>

          {/* Notes */}
          {license.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-amber-800">{license.notes}</p>
            </div>
          )}

          {/* Renewal History */}
          {license.renewal_history?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Renewal History</p>
              <div className="space-y-2">
                {[...license.renewal_history].reverse().map((r, i) => (
                  <div key={i} className="flex items-start space-x-3 text-xs">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <RefreshCw className="w-3 h-3 text-green-600" />
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">Renewed on {new Date(r.renewed_at).toLocaleDateString()}</p>
                      <p className="text-gray-400">New expiry: {new Date(r.new_expire_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-100 space-y-3">
          <button onClick={handleRenew} disabled={renewLoading}
            className="w-full btn btn-primary flex items-center justify-center space-x-2">
            <RefreshCw className={`w-4 h-4 ${renewLoading ? 'animate-spin' : ''}`} />
            <span>{renewLoading ? 'Renewing...' : 'Renew +1 Year'}</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSuspend(license)}
              className={`btn flex items-center justify-center space-x-2 ${license.status === 'suspended' ? 'btn-secondary' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{license.status === 'suspended' ? 'Unsuspend' : 'Suspend'}</span>
            </button>
            <button onClick={handleDelete} disabled={deleteLoading}
              className="btn bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center justify-center space-x-2">
              <Trash2 className="w-4 h-4" />
              <span>{deleteLoading ? '...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── New License Banner ───────────────────────────────────────────────────────
const NewLicenseBanner = ({ license, onDismiss }) => {
  const copyKey = () => { navigator.clipboard.writeText(license.license_key); toast.success('License key copied!') }

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg">License Generated!</p>
            <p className="text-emerald-100 text-sm mb-3">Share this key with <strong>{license.customer_name}</strong></p>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <span className="font-mono text-xl font-bold tracking-widest">{license.license_key}</span>
              </div>
              <button onClick={copyKey}
                className="flex items-center space-x-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
            </div>
            <p className="text-emerald-100 text-xs mt-2">
              Valid until {new Date(license.expire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-white/60 hover:text-white text-xl leading-none">&times;</button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const LicenseAdminDashboard = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState(null)
  const [newLicense, setNewLicense] = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  const { data, isLoading } = useQuery(
    ['licenses', search, statusFilter],
    () => licenseService.getAll({ search, status: statusFilter, limit: 200 }),
    { keepPreviousData: true, refetchInterval: 60000 }
  )

  const licenses = data?.data || []

  const stats = useMemo(() => {
    const now = new Date()
    const active = licenses.filter(l => l.status === 'active')
    const expiringSoon = active.filter(l => l.days_remaining <= 30 && l.days_remaining > 0)
    const expiredThisMonth = licenses.filter(l => {
      if (l.status !== 'expired') return false
      const d = new Date(l.expire_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    return {
      total: licenses.length,
      active: active.length,
      expired: licenses.filter(l => l.status === 'expired').length,
      pending: licenses.filter(l => l.status === 'pending_activation').length,
      suspended: licenses.filter(l => l.status === 'suspended').length,
      expiringSoon: expiringSoon.length,
      expiredThisMonth: expiredThisMonth.length,
      renewalsDue: expiringSoon
    }
  }, [licenses])

  const renewMutation = useMutation(licenseService.renew, {
    onSuccess: () => { toast.success('License renewed for 1 year!'); queryClient.invalidateQueries('licenses') },
    onError: (err) => toast.error(err.response?.data?.error || 'Renewal failed')
  })

  const deleteMutation = useMutation(licenseService.deleteLicense, {
    onSuccess: () => { toast.success('License deleted'); queryClient.invalidateQueries('licenses') },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed')
  })

  const statusMutation = useMutation(
    ({ id, status }) => licenseService.updateStatus(id, status),
    {
      onSuccess: () => { toast.success('License status updated'); queryClient.invalidateQueries('licenses') },
      onError: (err) => toast.error(err.response?.data?.error || 'Update failed')
    }
  )

  const handleSuspend = (license) => {
    const newStatus = license.status === 'suspended' ? 'active' : 'suspended'
    const label = newStatus === 'suspended' ? 'Suspend' : 'Unsuspend'
    if (!window.confirm(`${label} license for ${license.customer_name}?`)) return
    statusMutation.mutate({ id: license._id, status: newStatus })
    setSelectedLicense(null)
  }

  const copyKey = (key, e) => {
    e?.stopPropagation()
    navigator.clipboard.writeText(key)
    toast.success('Copied!')
  }

  // Tab-filtered licenses
  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return licenses
    if (activeTab === 'expiring') return licenses.filter(l => l.status === 'active' && l.days_remaining <= 30 && l.days_remaining > 0)
    return licenses.filter(l => l.status === l.status && activeTab === l.status)
  }, [licenses, activeTab])

  const tabs = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'active', label: 'Active', count: stats.active },
    { id: 'expiring', label: 'Expiring Soon', count: stats.expiringSoon },
    { id: 'expired', label: 'Expired', count: stats.expired },
    { id: 'pending_activation', label: 'Pending', count: stats.pending },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow">
                <Key className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">License Dashboard</h1>
            </div>
            <p className="text-gray-500 text-sm ml-12">Manage yearly software subscriptions</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/dashboard/admin" className="btn btn-secondary text-sm flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>System Overview</span>
            </Link>
            <button onClick={() => setShowGenerate(true)}
              className="btn btn-primary flex items-center space-x-2 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Generate License</span>
            </button>
          </div>
        </div>

        {/* ── New License Banner ── */}
        {newLicense && (
          <NewLicenseBanner license={newLicense} onDismiss={() => setNewLicense(null)} />
        )}

        {/* ── Expiry Alerts ── */}
        {stats.expiringSoon > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 text-sm">
                  {stats.expiringSoon} license{stats.expiringSoon > 1 ? 's' : ''} expiring within 30 days
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stats.renewalsDue.slice(0, 5).map(l => (
                    <button key={l._id}
                      onClick={() => setSelectedLicense(l)}
                      className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1">
                      <span>{l.customer_name}</span>
                      <span className="text-amber-500">· {l.days_remaining}d</span>
                    </button>
                  ))}
                  {stats.renewalsDue.length > 5 && (
                    <button onClick={() => setActiveTab('expiring')}
                      className="text-xs text-amber-600 hover:text-amber-800 underline">
                      +{stats.renewalsDue.length - 5} more
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Licenses', value: stats.total, icon: Key, gradient: 'from-slate-500 to-slate-700', light: 'bg-slate-50 text-slate-700' },
            { label: 'Active', value: stats.active, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 text-emerald-700' },
            { label: 'Expiring Soon', value: stats.expiringSoon, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-600', light: 'bg-amber-50 text-amber-700' },
            { label: 'Expired', value: stats.expired, icon: XCircle, gradient: 'from-red-500 to-rose-600', light: 'bg-red-50 text-red-700' },
            { label: 'Pending', value: stats.pending, icon: Clock, gradient: 'from-blue-500 to-indigo-600', light: 'bg-blue-50 text-blue-700' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 bg-gradient-to-br ${s.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-3xl font-bold ${s.light.split(' ')[1]}`}>{s.value}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* ── Main Content ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-10 bg-gray-50 border-gray-200"
                  placeholder="Search by name, email or license key..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="input w-full sm:w-44 bg-gray-50 border-gray-200"
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
                <option value="pending_activation">Pending</option>
              </select>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mt-4 overflow-x-auto pb-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}>
                  <span>{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.id ? 'bg-primary-200 text-primary-800' : 'bg-gray-100 text-gray-500'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="loading-spinner w-8 h-8" />
            </div>
          ) : tabFiltered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No licenses found</p>
              <p className="text-gray-400 text-sm mt-1">
                {search || statusFilter ? 'Try adjusting your filters' : 'Generate your first license to get started'}
              </p>
              {!search && !statusFilter && (
                <button onClick={() => setShowGenerate(true)}
                  className="btn btn-primary mt-4 inline-flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Generate License</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">License Key</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Computer</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tabFiltered.map(license => {
                    const isExpiringSoon = license.status === 'active' && license.days_remaining <= 30 && license.days_remaining > 0
                    return (
                      <tr key={license._id}
                        className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                        onClick={() => setSelectedLicense(license)}>
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                              {license.customer_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{license.customer_name}</p>
                              <p className="text-xs text-gray-400">{license.customer_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                              {license.license_key}
                            </span>
                            <button onClick={e => copyKey(license.license_key, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-all">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[license.status]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[license.status]}`} />
                            <span>{STATUS_LABELS[license.status]}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm text-gray-700">{new Date(license.expire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            {license.status === 'active' && (
                              <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                {license.days_remaining > 0 ? `${license.days_remaining}d left` : 'Expired'}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {license.computer_id ? (
                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {license.computer_id}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">Not bound</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end space-x-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => renewMutation.mutate(license._id)}
                              title="Renew +1 year"
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={() => setSelectedLicense(license)}
                              title="View details"
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Delete this license?')) deleteMutation.mutate(license._id) }}
                              title="Delete"
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {tabFiltered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing <strong>{tabFiltered.length}</strong> of <strong>{stats.total}</strong> licenses
              </p>
              <Link to="/dashboard/admin/licenses" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
                <span>Full License Manager</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Bottom Quick Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent Activity */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Licenses</h3>
              <span className="text-xs text-gray-400">Last 5 created</span>
            </div>
            <div className="space-y-3">
              {[...licenses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).map(l => (
                <div key={l._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-600">
                      {l.customer_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{l.customer_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{l.license_key}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[l.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[l.status]}`} />
                      <span>{STATUS_LABELS[l.status]}</span>
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(l.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {licenses.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No licenses yet</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setShowGenerate(true)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                <span>Generate New License</span>
              </button>
              <button onClick={() => { setActiveTab('expiring'); setStatusFilter('') }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>View Expiring ({stats.expiringSoon})</span>
              </button>
              <button onClick={() => { setActiveTab('expired'); setStatusFilter('') }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors text-sm font-medium">
                <XCircle className="w-4 h-4" />
                <span>View Expired ({stats.expired})</span>
              </button>
              <button onClick={() => { setActiveTab('pending_activation'); setStatusFilter('') }}
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-sm font-medium">
                <Clock className="w-4 h-4" />
                <span>Pending Activation ({stats.pending})</span>
              </button>
              <Link to="/dashboard/admin/licenses"
                className="w-full flex items-center space-x-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors text-sm font-medium">
                <Key className="w-4 h-4" />
                <span>Full License Manager</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals & Drawer ── */}
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onSuccess={(lic) => {
            setNewLicense(lic)
            toast.success('License generated!')
            queryClient.invalidateQueries('licenses')
          }}
        />
      )}

      {selectedLicense && (
        <LicenseDrawer
          license={selectedLicense}
          onClose={() => setSelectedLicense(null)}
          onRenew={(id) => renewMutation.mutateAsync(id)}
          onDelete={(id) => deleteMutation.mutateAsync(id)}
          onSuspend={handleSuspend}
        />
      )}
    </div>
  )
}

export default LicenseAdminDashboard
