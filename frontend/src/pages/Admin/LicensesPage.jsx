import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
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
  Shield
} from 'lucide-react'
import { licenseService } from '../../services/licenseService'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  pending_activation: 'bg-blue-100 text-blue-800'
}

const STATUS_ICONS = {
  active: <CheckCircle className="w-4 h-4" />,
  expired: <XCircle className="w-4 h-4" />,
  suspended: <AlertTriangle className="w-4 h-4" />,
  pending_activation: <Clock className="w-4 h-4" />
}

const STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  suspended: 'Suspended',
  pending_activation: 'Pending Activation'
}

const GenerateLicenseModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await licenseService.generate(form)
      toast.success('License generated successfully!')
      onSuccess(result.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate license')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Key className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Generate New License</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input
              className="input"
              placeholder="Full name"
              value={form.customer_name}
              onChange={e => setForm({ ...form, customer_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              className="input"
              placeholder="customer@email.com"
              value={form.customer_email}
              onChange={e => setForm({ ...form, customer_email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              className="input"
              placeholder="+1234567890"
              value={form.customer_phone}
              onChange={e => setForm({ ...form, customer_phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <strong>1-year subscription</strong> will be created starting from today.
          </div>

          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'Generating...' : 'Generate License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const LicenseDetailModal = ({ license, onClose, onRenew, onDelete }) => {
  const [renewLoading, setRenewLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleRenew = async () => {
    if (!window.confirm('Renew this license for 1 more year?')) return
    setRenewLoading(true)
    try {
      await onRenew(license._id)
      onClose()
    } finally {
      setRenewLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this license? This cannot be undone.')) return
    setDeleteLoading(true)
    try {
      await onDelete(license._id)
      onClose()
    } finally {
      setDeleteLoading(false)
    }
  }

  const copyKey = () => {
    navigator.clipboard.writeText(license.license_key)
    toast.success('License key copied!')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">License Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {/* License Key */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">License Key</p>
                <p className="font-mono text-lg font-bold text-gray-900 tracking-widest">{license.license_key}</p>
              </div>
              <button onClick={copyKey} className="p-2 text-gray-500 hover:text-primary-600 transition-colors">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[license.status]}`}>
              {STATUS_ICONS[license.status]}
              <span>{STATUS_LABELS[license.status]}</span>
            </span>
            {license.days_remaining > 0 && license.status === 'active' && (
              <span className={`text-sm ${license.days_remaining <= 30 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {license.days_remaining} days remaining
              </span>
            )}
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start space-x-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Customer</p>
                <p className="text-sm font-medium">{license.customer_name}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium break-all">{license.customer_email}</p>
              </div>
            </div>
            {license.customer_phone && (
              <div className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium">{license.customer_phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Computer ID</p>
                <p className="text-sm font-medium font-mono">{license.computer_id || 'Not activated'}</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start space-x-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium">{new Date(license.start_date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Expire Date</p>
                <p className={`text-sm font-medium ${license.status === 'expired' ? 'text-red-600' : ''}`}>
                  {new Date(license.expire_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {license.notes && (
            <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800">
              <strong>Notes:</strong> {license.notes}
            </div>
          )}

          {/* Renewal History */}
          {license.renewal_history?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Renewal History</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {license.renewal_history.map((r, i) => (
                  <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                    Renewed on {new Date(r.renewed_at).toLocaleDateString()} →
                    New expiry: {new Date(r.new_expire_date).toLocaleDateString()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-3 p-6 border-t">
          <button
            onClick={handleRenew}
            disabled={renewLoading}
            className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{renewLoading ? 'Renewing...' : 'Renew +1 Year'}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center space-x-2 px-4"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleteLoading ? '...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const LicensesPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState(null)
  const [newLicense, setNewLicense] = useState(null)

  const { data, isLoading } = useQuery(
    ['licenses', search, statusFilter],
    () => licenseService.getAll({ search, status: statusFilter }),
    { keepPreviousData: true }
  )

  const licenses = data?.data || []

  const renewMutation = useMutation(licenseService.renew, {
    onSuccess: () => {
      toast.success('License renewed for 1 year!')
      queryClient.invalidateQueries('licenses')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Renewal failed')
  })

  const deleteMutation = useMutation(licenseService.deleteLicense, {
    onSuccess: () => {
      toast.success('License deleted')
      queryClient.invalidateQueries('licenses')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed')
  })

  const copyKey = (key, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(key)
    toast.success('License key copied!')
  }

  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    expired: licenses.filter(l => l.status === 'expired').length,
    pending: licenses.filter(l => l.status === 'pending_activation').length,
    expiringSoon: licenses.filter(l => l.status === 'active' && l.days_remaining <= 30 && l.days_remaining > 0).length
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">License Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage yearly software subscriptions</p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Generate License</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Active', value: stats.active, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Expired', value: stats.expired, color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Pending', value: stats.pending, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Expiring Soon', value: stats.expiringSoon, color: 'text-orange-700', bg: 'bg-orange-50' }
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Newly Generated License Banner */}
      {newLicense && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-green-800 mb-1">New License Generated!</p>
              <p className="text-sm text-green-700">Share this key with the customer:</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className="font-mono text-xl font-bold text-green-900 tracking-widest bg-white px-4 py-2 rounded-lg border border-green-300">
                  {newLicense.license_key}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(newLicense.license_key); toast.success('Copied!') }}
                  className="p-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-700"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Expires: {new Date(newLicense.expire_date).toLocaleDateString()} &bull; Customer: {newLicense.customer_name}
              </p>
            </div>
            <button onClick={() => setNewLicense(null)} className="text-green-500 hover:text-green-700 text-xl">&times;</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, email, or license key..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-full sm:w-48"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="pending_activation">Pending Activation</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="loading-spinner w-8 h-8"></div>
          </div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Key className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No licenses found</p>
            <p className="text-sm mt-1">Generate a license to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">License Key</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Computer ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {licenses.map(license => (
                  <tr
                    key={license._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLicense(license)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-medium text-gray-900">{license.license_key}</span>
                        <button
                          onClick={e => copyKey(license.license_key, e)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{license.customer_name}</p>
                        <p className="text-xs text-gray-500">{license.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[license.status]}`}>
                        {STATUS_ICONS[license.status]}
                        <span>{STATUS_LABELS[license.status]}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-900">{new Date(license.expire_date).toLocaleDateString()}</p>
                        {license.status === 'active' && (
                          <p className={`text-xs ${license.days_remaining <= 30 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {license.days_remaining > 0 ? `${license.days_remaining}d left` : 'Expired'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">
                        {license.computer_id || <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => renewMutation.mutate(license._id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Renew +1 year"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (window.confirm('Delete this license?')) deleteMutation.mutate(license._id) }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGenerate && (
        <GenerateLicenseModal
          onClose={() => setShowGenerate(false)}
          onSuccess={(lic) => { setNewLicense(lic); queryClient.invalidateQueries('licenses') }}
        />
      )}
      {selectedLicense && (
        <LicenseDetailModal
          license={selectedLicense}
          onClose={() => setSelectedLicense(null)}
          onRenew={(id) => renewMutation.mutateAsync(id)}
          onDelete={(id) => deleteMutation.mutateAsync(id)}
        />
      )}
    </div>
  )
}

export default LicensesPage
