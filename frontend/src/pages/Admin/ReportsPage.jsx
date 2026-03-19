import React, { useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Scissors,
  Star,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  LineChart,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Calculator
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts'
import { useUsers } from '../../hooks/useUsers'
import { useServices } from '../../hooks/useServices'
import { useAppointments, useAppointmentsByDateRange } from '../../hooks/useAppointments'
import { useInventory } from '../../hooks/useInventory'
import { useFinancialSummary, useOperatingExpenses, useDeleteOperatingExpense } from '../../hooks/useFinancial'
import BarberRevenueDetailsModal from '../../components/UI/BarberRevenueDetailsModal'
import AddOperatingExpenseModal from '../../components/UI/AddOperatingExpenseModal'
import EditOperatingExpenseModal from '../../components/UI/EditOperatingExpenseModal'

const ReportsPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReport, setSelectedReport] = useState('overview')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [showBarberDetails, setShowBarberDetails] = useState(false)
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)

  // Calculate date ranges
  const today = new Date().toISOString().split('T')[0]
  
  // Week start (7 days ago)
  const weekStartDate = new Date()
  weekStartDate.setDate(weekStartDate.getDate() - 7)
  const weekStart = weekStartDate.toISOString().split('T')[0]
  
  // Bi-weekly start (14 days ago)
  const biWeekStartDate = new Date()
  biWeekStartDate.setDate(biWeekStartDate.getDate() - 14)
  const biWeekStart = biWeekStartDate.toISOString().split('T')[0]
  
  // Month start (30 days ago)
  const monthStartDate = new Date()
  monthStartDate.setDate(monthStartDate.getDate() - 30)
  const monthStart = monthStartDate.toISOString().split('T')[0]

  // Calculate date range based on selected period
  const getDateRangeForPeriod = () => {
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    let startDate
    
    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'quarter':
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 3)
        break
      case 'year':
        startDate = new Date(today)
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default: // month
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 30)
    }
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate
    }
  }

  const periodDateRange = getDateRangeForPeriod()

  // Fetch real data
  const { data: usersData = { data: [] }, isLoading: loadingUsers } = useUsers({ limit: 100 })
  const { data: servicesData = { data: [] }, isLoading: loadingServices } = useServices({ limit: 50 })
  const { data: appointmentsData = { data: [] }, isLoading: loadingAppointments } = useAppointments({ limit: 500 })
  const { data: todayAppointmentsData = { data: [] }, isLoading: loadingTodayAppointments } = useAppointments({ date: today, limit: 500 })
  const { data: weekAppointmentsData = { data: [] }, isLoading: loadingWeekAppointments } = useAppointmentsByDateRange(weekStart, today)
  const { data: biWeekAppointmentsData = { data: [] }, isLoading: loadingBiWeekAppointments } = useAppointmentsByDateRange(biWeekStart, today)
  const { data: monthAppointmentsData = { data: [] }, isLoading: loadingMonthAppointments } = useAppointmentsByDateRange(monthStart, today)
  
  // Fetch appointments for the selected period dynamically
  const { data: periodAppointmentsData = { data: [] }, isLoading: loadingPeriodAppointments } = useAppointmentsByDateRange(
    periodDateRange.start_date, 
    periodDateRange.end_date
  )
  
  const { data: inventoryData = { data: [] }, isLoading: loadingInventory } = useInventory({ limit: 100 })

  // Calculate date range for financial summary based on selected period
  const financialDateRange = periodDateRange
  const { data: financialData = { data: {} }, isLoading: loadingFinancial } = useFinancialSummary(financialDateRange)
  const { data: expensesData = { data: [] }, isLoading: loadingExpenses } = useOperatingExpenses({
    ...financialDateRange,
    page: 1,
    limit: 50
  })
  const deleteExpenseMutation = useDeleteOperatingExpense()

  const users = usersData.data || []
  const services = servicesData.data || []
  const appointments = appointmentsData.data || []
  const todayAppointments = todayAppointmentsData.data || []
  const weekAppointments = weekAppointmentsData.data || []
  const biWeekAppointments = biWeekAppointmentsData.data || []
  const monthAppointments = monthAppointmentsData.data || []
  const periodAppointments = periodAppointmentsData.data || []
  const inventory = inventoryData.data || []

  // Calculate real report data - count completed appointments for revenue
  // Include paid and partially_paid appointments, or all completed if payment status is not set
  const completedAppointments = periodAppointments.filter(apt => {
    if (apt.status !== 'completed') return false
    // Include if paid, partially_paid, or if payment_status is not set (legacy data)
    return !apt.payment_status || 
           apt.payment_status === 'paid' || 
           apt.payment_status === 'partially_paid'
  })

  // Calculate new customers for the selected period
  const getNewCustomersForPeriod = () => {
    const periodStartDate = new Date(periodDateRange.start_date)
    return users.filter(u => {
      if (u.role !== 'customer') return false
      const userCreatedDate = new Date(u.createdAt)
      return userCreatedDate >= periodStartDate
    }).length
  }

  // Get revenue from financial summary (calculated on backend) for accuracy
  const financial = financialData.data || {}
  const revenue = financial.revenue || {}
  const totalRevenueFromFinancial = revenue.total_revenue || 0

  // Build revenue trend data from period appointments (paid only - matches backend financial summary)
  const getRevenueTrendData = () => {
    const start = new Date(periodDateRange.start_date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(periodDateRange.end_date)
    end.setHours(23, 59, 59, 999)
    const paidInPeriod = periodAppointments.filter(a => a.payment_status === 'paid')

    const buckets = []

    if (selectedPeriod === 'year') {
      // Monthly buckets for year
      const current = new Date(start.getFullYear(), start.getMonth(), 1)
      while (current <= end) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
        const rev = paidInPeriod
          .filter(a => {
            const d = a.appointment_date ? new Date(a.appointment_date) : null
            return d && d >= current && d <= monthEnd
          })
          .reduce((sum, a) => sum + (a.price || 0), 0)
        buckets.push({
          label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          date: current.toISOString().split('T')[0],
          revenue: Math.round(rev * 100) / 100
        })
        current.setMonth(current.getMonth() + 1)
      }
    } else if (selectedPeriod === 'quarter') {
      // Weekly buckets for quarter
      const current = new Date(start)
      current.setDate(current.getDate() - current.getDay())
      while (current <= end) {
        const weekEnd = new Date(current)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const rev = paidInPeriod
          .filter(a => {
            const d = a.appointment_date ? new Date(a.appointment_date) : null
            return d && d >= current && d <= weekEnd
          })
          .reduce((sum, a) => sum + (a.price || 0), 0)
        buckets.push({
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: current.toISOString().split('T')[0],
          revenue: Math.round(rev * 100) / 100
        })
        current.setDate(current.getDate() + 7)
      }
    } else {
      // Daily buckets for week or month
      const current = new Date(start)
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        const rev = paidInPeriod
          .filter(a => {
            const aptDate = a.appointment_date ? new Date(a.appointment_date).toISOString().split('T')[0] : ''
            return aptDate === dateStr
          })
          .reduce((sum, a) => sum + (a.price || 0), 0)
        buckets.push({
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: dateStr,
          revenue: Math.round(rev * 100) / 100
        })
        current.setDate(current.getDate() + 1)
      }
    }

    return buckets
  }

  const revenueTrendData = getRevenueTrendData()

  const reportData = {
    overview: {
      // Always use revenue from financial summary (backend calculation) for accuracy
      // The backend calculates revenue from all paid appointments in the date range
      totalRevenue: totalRevenueFromFinancial,
      totalAppointments: periodAppointments.length,
      averageRating: periodAppointments.length > 0 ? 4.8 : 0, // Would need reviews API
      newCustomers: getNewCustomersForPeriod(),
      trends: {
        revenue: { value: 15.3, direction: 'up' },
        appointments: { value: 8.2, direction: 'up' },
        customers: { value: 12.1, direction: 'up' }
      }
    },
    barberPerformance: users
      .filter(u => u.role === 'barber')
      .map(barber => {
        const barberId = barber._id || barber.id
        
        // Helper function to get barber ID from appointment
        const getAppointmentBarberId = (apt) => {
          if (!apt.barber_id) return null
          return apt.barber_id._id || apt.barber_id.toString()
        }
        
        // Helper function to get barber commission (only from completed appointments)
        const getBarberCommission = (apt) => {
          if (apt.status !== 'completed') return 0
          // Use barber_commission if available, otherwise fallback to 0
          const commission = apt.barber_commission !== undefined && apt.barber_commission !== null 
            ? apt.barber_commission 
            : 0
          return commission
        }
        
        // Today's completed appointments
        const todayBarberAppointments = todayAppointments.filter(a => 
          getAppointmentBarberId(a) === barberId.toString() && a.status === 'completed'
        )
        const dailyRevenue = todayBarberAppointments.reduce((sum, apt) => sum + getBarberCommission(apt), 0)
        
        // Week's completed appointments
        const weekBarberAppointments = weekAppointments.filter(a => 
          getAppointmentBarberId(a) === barberId.toString() && a.status === 'completed'
        )
        const weeklyRevenue = weekBarberAppointments.reduce((sum, apt) => sum + getBarberCommission(apt), 0)
        
        // Bi-weekly completed appointments
        const biWeekBarberAppointments = biWeekAppointments.filter(a => 
          getAppointmentBarberId(a) === barberId.toString() && a.status === 'completed'
        )
        const biWeeklyRevenue = biWeekBarberAppointments.reduce((sum, apt) => sum + getBarberCommission(apt), 0)
        
        // Month's completed appointments
        const monthBarberAppointments = monthAppointments.filter(a => 
          getAppointmentBarberId(a) === barberId.toString() && a.status === 'completed'
        )
        const monthlyRevenue = monthBarberAppointments.reduce((sum, apt) => sum + getBarberCommission(apt), 0)
        
        // All completed appointments for total stats
        const barberAppointments = appointments.filter(a => 
          getAppointmentBarberId(a) === barberId.toString() && a.status === 'completed'
        )
        
        return {
          name: `${barber.first_name} ${barber.last_name}`,
          dailyRevenue: dailyRevenue,
          weeklyRevenue: weeklyRevenue,
          biWeeklyRevenue: biWeeklyRevenue,
          monthlyRevenue: monthlyRevenue,
          totalRevenue: barberAppointments.reduce((sum, apt) => sum + getBarberCommission(apt), 0),
          appointments: barberAppointments.length,
          rating: barber.average_rating || 4.8,
          efficiency: Math.min(95, barberAppointments.length * 2) // Estimate
        }
      }),
    servicePopularity: services.map(service => {
      // Handle both populated service_id objects and direct ID references
      const serviceAppointments = appointments.filter(a => {
        if (!a.service_id) return false
        // If service_id is populated (object), check _id
        if (typeof a.service_id === 'object' && a.service_id._id) {
          return a.service_id._id.toString() === service._id.toString()
        }
        // If service_id is a direct ID (string or ObjectId)
        return a.service_id.toString() === service._id.toString()
      })
      const revenue = serviceAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
      return {
        name: service.name,
        bookings: serviceAppointments.length,
        revenue: revenue,
        percentage: Math.round((serviceAppointments.length / Math.max(appointments.length, 1)) * 100)
      }
    }),
    inventoryInsights: {
      totalItems: inventory.length,
      totalValue: inventory.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.cost_price || 0)), 0),
      lowStockItems: inventory.filter(item => item.current_stock <= item.minimum_stock && item.is_active !== false),
      outOfStockItems: inventory.filter(item => (item.current_stock || 0) <= 0 && item.is_active !== false),
      itemsByCategory: inventory.reduce((acc, item) => {
        const category = item.category || 'Uncategorized'
        if (!acc[category]) {
          acc[category] = {
            count: 0,
            totalValue: 0,
            totalStock: 0
          }
        }
        acc[category].count++
        acc[category].totalValue += (item.current_stock || 0) * (item.cost_price || 0)
        acc[category].totalStock += (item.current_stock || 0)
        return acc
      }, {}),
      topItemsByValue: inventory
        .map(item => ({
          name: item.name,
          category: item.category || 'Uncategorized',
          currentStock: item.current_stock || 0,
          minimumStock: item.minimum_stock || 0,
          costPrice: item.cost_price || 0,
          totalValue: (item.current_stock || 0) * (item.cost_price || 0),
          status: (item.current_stock || 0) <= 0 ? 'out_of_stock' : 
                  (item.current_stock || 0) <= (item.minimum_stock || 0) ? 'low_stock' : 'in_stock',
          unit: item.unit || 'piece'
        }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10)
    }
  }

  if (loadingUsers || loadingServices || loadingAppointments || loadingTodayAppointments || loadingWeekAppointments || loadingBiWeekAppointments || loadingMonthAppointments || loadingPeriodAppointments || loadingInventory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading reports...</span>
      </div>
    )
  }

  const periods = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' }
  ]

  const reportTypes = [
    { key: 'overview', label: 'Business Overview', icon: BarChart3 },
    { key: 'financial', label: 'Financial Report', icon: Calculator },
    { key: 'barbers', label: 'Barber Performance', icon: Users },
    { key: 'services', label: 'Service Analytics', icon: Scissors },
    { key: 'inventory', label: 'Inventory Reports', icon: PieChart }
  ]

  const renderOverviewReport = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.overview.totalRevenue.toLocaleString()} ETB</p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+{reportData.overview.trends.revenue.value}%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.overview.totalAppointments}</p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+{reportData.overview.trends.appointments.value}%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.overview.averageRating}</p>
                <div className="flex items-center mt-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">Excellent</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Customers</p>
                <p className="text-3xl font-bold text-gray-900">{reportData.overview.newCustomers}</p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+{reportData.overview.trends.customers.value}%</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
          <p className="text-sm text-gray-500 mt-1">
            Revenue over time (paid appointments) — {periods.find(p => p.key === selectedPeriod)?.label || 'This Month'}
          </p>
        </div>
        <div className="card-body">
          {revenueTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={revenueTrendData}
                margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
              >
                <defs>
                  <linearGradient id="revenueTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  interval={selectedPeriod === 'month' || selectedPeriod === 'week' ? Math.max(0, Math.floor(revenueTrendData.length / 10)) : 0}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value.toLocaleString()} ETB`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString()} ETB`, 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#revenueTrendGradient)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <LineChart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No revenue data for this period</p>
                <p className="text-xs mt-1">Revenue appears when paid appointments exist in the selected range</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderBarberReport = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Barber Performance & Revenue</h3>
          <p className="text-sm text-gray-500 mt-1">Revenue breakdown by day, week, and month</p>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barber</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bi-Weekly Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Appointments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.barberPerformance.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-sm text-gray-500">
                      No barbers found
                    </td>
                  </tr>
                ) : (
                  reportData.barberPerformance.map((barber, index) => {
                    // Find the full barber object from users array
                    const fullBarber = users.find(u => 
                      `${u.first_name} ${u.last_name}` === barber.name
                    )
                    
                    return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBarber(fullBarber || { name: barber.name })
                            setShowBarberDetails(true)
                          }}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                        >
                          {barber.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">{barber.dailyRevenue.toLocaleString()} ETB</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600">{barber.weeklyRevenue.toLocaleString()} ETB</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-indigo-600">{barber.biWeeklyRevenue.toLocaleString()} ETB</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-purple-600">{barber.monthlyRevenue.toLocaleString()} ETB</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{barber.appointments}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                          <span className="text-sm text-gray-900">{barber.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${barber.efficiency}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{barber.efficiency}%</span>
                        </div>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Barber Revenue Details Modal */}
      <BarberRevenueDetailsModal
        barber={selectedBarber}
        appointments={appointments}
        isOpen={showBarberDetails}
        onClose={() => {
          setShowBarberDetails(false)
          setSelectedBarber(null)
        }}
      />
    </div>
  )

  const renderServiceReport = () => (
    <div className="space-y-6">
      {/* Service Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Services</p>
                <p className="text-3xl font-bold text-gray-900">{services.length}</p>
                <p className="text-xs text-gray-500 mt-1">Active services</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Scissors className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">
                  {reportData.servicePopularity.reduce((sum, s) => sum + s.bookings, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">All-time bookings</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Service Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  {reportData.servicePopularity.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()} ETB
                </p>
                <p className="text-xs text-gray-500 mt-1">Total revenue</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Performance Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Service Performance Analytics</h3>
          <p className="text-sm text-gray-500 mt-1">Detailed breakdown of service bookings, revenue, and popularity</p>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Popularity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Revenue/Booking</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.servicePopularity.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                      No service data available
                    </td>
                  </tr>
                ) : (
                  reportData.servicePopularity
                    .sort((a, b) => b.bookings - a.bookings)
                    .map((service, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Scissors className="h-4 w-4 text-primary-600 mr-2" />
                            <div className="text-sm font-medium text-gray-900">{service.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{service.bookings}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            {service.revenue.toLocaleString()} ETB
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full" 
                                style={{ width: `${service.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-900">{service.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {service.bookings > 0 
                              ? (service.revenue / service.bookings).toLocaleString('en-US', { 
                                  minimumFractionDigits: 0, 
                                  maximumFractionDigits: 0 
                                }) 
                              : 0
                            } ETB
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Service Analytics Charts Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Analytics & Visualizations</h2>
          <p className="text-gray-600">Interactive charts and graphs showing service performance metrics</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Bookings Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Service Bookings Comparison</h3>
            <p className="text-sm text-gray-500 mt-1">Total bookings per service</p>
          </div>
          <div className="card-body">
            {reportData.servicePopularity.filter(s => s.bookings > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={reportData.servicePopularity
                    .sort((a, b) => b.bookings - a.bookings)
                    .slice(0, 8)
                    .map(service => ({
                      name: service.name.length > 15 ? service.name.substring(0, 15) + '...' : service.name,
                      bookings: service.bookings,
                      revenue: service.revenue
                    }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => [value, 'Bookings']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="bookings" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]}
                    name="Total Bookings"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
                <BarChart3 className="h-12 w-12 mb-3 text-gray-400" />
                <p className="text-sm">No booking data available yet</p>
                <p className="text-xs mt-1">Charts will appear once appointments are created</p>
              </div>
            )}
          </div>
        </div>

        {/* Service Revenue Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Revenue Distribution</h3>
            <p className="text-sm text-gray-500 mt-1">Revenue share by service</p>
          </div>
          <div className="card-body">
            {reportData.servicePopularity.filter(s => s.revenue > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={reportData.servicePopularity
                      .filter(s => s.revenue > 0)
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 6)
                      .map(service => ({
                        name: service.name.length > 20 ? service.name.substring(0, 20) + '...' : service.name,
                        value: service.revenue
                      }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportData.servicePopularity
                      .filter(s => s.revenue > 0)
                      .slice(0, 6)
                      .map((entry, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => [`${value.toLocaleString()} ETB`, 'Revenue']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
                <PieChart className="h-12 w-12 mb-3 text-gray-400" />
                <p className="text-sm">No revenue data available yet</p>
                <p className="text-xs mt-1">Charts will appear once appointments generate revenue</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Revenue Trend Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Service Revenue Comparison</h3>
          <p className="text-sm text-gray-500 mt-1">Revenue generated by each service</p>
        </div>
        <div className="card-body">
          {reportData.servicePopularity.filter(s => s.revenue > 0 || s.bookings > 0).length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart
                data={reportData.servicePopularity
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 10)
                  .map(service => ({
                    name: service.name.length > 12 ? service.name.substring(0, 12) + '...' : service.name,
                    revenue: service.revenue,
                    bookings: service.bookings
                  }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value, name) => {
                    if (name === 'revenue') {
                      return [`${value.toLocaleString()} ETB`, 'Revenue']
                    }
                    return [value, 'Bookings']
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  name="Revenue (ETB)"
                />
                <Bar 
                  yAxisId="right"
                  dataKey="bookings" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  name="Bookings"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex flex-col items-center justify-center text-gray-500">
              <LineChart className="h-12 w-12 mb-3 text-gray-400" />
              <p className="text-sm">No service data available yet</p>
              <p className="text-xs mt-1">Charts will appear once appointments are created</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Service Trends & Insights */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Service Trends & Insights</h3>
              <p className="text-sm text-gray-500 mt-1">Historical performance and growth metrics</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Coming Soon
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-50 via-blue-50 to-purple-50 border border-primary-100">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative px-8 py-12">
              <div className="max-w-3xl mx-auto">
                {/* Main Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary-200 rounded-full blur-xl opacity-50"></div>
                    <div className="relative bg-white p-6 rounded-2xl shadow-lg border border-primary-100">
                      <LineChart className="h-12 w-12 text-primary-600" />
                    </div>
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-6">
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">
                    Advanced Analytics Dashboard
                  </h4>
                  <p className="text-gray-600 text-base">
                    Comprehensive insights and predictive analytics are being developed to help you make data-driven decisions
                  </p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900">Trend Analysis</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Track service performance over time with interactive charts and trend indicators
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-green-100 rounded-lg mr-3">
                        <Calendar className="h-5 w-5 text-green-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900">Seasonal Patterns</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Identify peak seasons and optimize service offerings based on historical data
                    </p>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg mr-3">
                        <PieChart className="h-5 w-5 text-purple-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900">Predictive Insights</h5>
                    </div>
                    <p className="text-sm text-gray-600">
                      Forecast future demand and revenue with AI-powered predictive analytics
                    </p>
                  </div>
                </div>

                {/* Additional Features List */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2"></div>
                      Revenue Forecasting
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2"></div>
                      Customer Behavior Analysis
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2"></div>
                      Performance Benchmarking
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2"></div>
                      Custom Report Builder
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderInventoryReport = () => {
    const inventoryData = reportData.inventoryInsights
    const categoryData = Object.entries(inventoryData.itemsByCategory).map(([category, data]) => ({
      name: category,
      value: data.totalValue,
      count: data.count,
      stock: data.totalStock
    }))

    const stockStatusData = [
      { name: 'In Stock', value: inventoryData.topItemsByValue.filter(i => i.status === 'in_stock').length, color: '#10b981' },
      { name: 'Low Stock', value: inventoryData.lowStockItems.length, color: '#f59e0b' },
      { name: 'Out of Stock', value: inventoryData.outOfStockItems.length, color: '#ef4444' }
    ]

    return (
      <div className="space-y-6">
        {/* Inventory Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900">{inventoryData.totalItems}</p>
                  <p className="text-xs text-gray-500 mt-1">Active inventory items</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {inventoryData.totalValue.toLocaleString()} ETB
                  </p>
                  <p className="text-xs text-gray-500 mt-1">At cost price</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-3xl font-bold text-gray-900">{inventoryData.lowStockItems.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Need restocking</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="text-3xl font-bold text-gray-900">{inventoryData.outOfStockItems.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Urgent restock needed</p>
                </div>
                <div className="p-3 rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Status Distribution */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Stock Status Distribution</h3>
              <p className="text-sm text-gray-500 mt-1">Inventory items by stock status</p>
            </div>
            <div className="card-body">
              {stockStatusData.filter(s => s.value > 0).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={stockStatusData.filter(s => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stockStatusData.filter(s => s.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value) => [value, 'Items']}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
                  <PieChart className="h-12 w-12 mb-3 text-gray-400" />
                  <p className="text-sm">No inventory data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Value by Category */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Inventory Value by Category</h3>
              <p className="text-sm text-gray-500 mt-1">Total value distribution across categories</p>
            </div>
            <div className="card-body">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={categoryData
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 8)
                      .map(cat => ({
                        name: cat.name.length > 12 ? cat.name.substring(0, 12) + '...' : cat.name,
                        value: cat.value,
                        count: cat.count
                      }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value) => [`${value.toLocaleString()} ETB`, 'Value']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      fill="#8b5cf6" 
                      radius={[8, 8, 0, 0]}
                      name="Value (ETB)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mb-3 text-gray-400" />
                  <p className="text-sm">No category data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Items Table */}
        {inventoryData.lowStockItems.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Low Stock Alert</h3>
              <p className="text-sm text-gray-500 mt-1">Items that need immediate restocking</p>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minimum Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryData.lowStockItems.slice(0, 10).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{item.category || 'Uncategorized'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-yellow-600">{item.current_stock || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.minimum_stock || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{item.unit || 'piece'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (item.current_stock || 0) <= 0 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(item.current_stock || 0) <= 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Top Items by Value */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Top Inventory Items by Value</h3>
            <p className="text-sm text-gray-500 mt-1">Highest value items in inventory</p>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryData.topItemsByValue.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                        No inventory items found
                      </td>
                    </tr>
                  ) : (
                    inventoryData.topItemsByValue.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-primary-600 mr-2" />
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{item.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.currentStock} {item.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.costPrice.toLocaleString()} ETB
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            {item.totalValue.toLocaleString()} ETB
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'out_of_stock' 
                              ? 'bg-red-100 text-red-800' 
                              : item.status === 'low_stock'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.status === 'out_of_stock' ? (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Out of Stock
                              </>
                            ) : item.status === 'low_stock' ? (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Stock
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                In Stock
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderFinancialReport = () => {
    const financial = financialData.data || {}
    const revenue = financial.revenue || {}
    const expenses = financial.expenses || {}
    const profit = financial.profit || {}

    const totalRevenue = revenue.total_revenue || 0
    const costOfGoodsSold = revenue.cost_of_goods_sold || 0
    const grossProfit = revenue.gross_profit || 0
    const grossMargin = revenue.gross_margin || 0
    const operatingExpenses = expenses.operating_expenses || 0
    const netProfit = profit.net_profit || 0
    const netMargin = profit.net_margin || 0
    const operatingExpensesList = expensesData.data || []

    if (loadingFinancial) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
          <span className="ml-2 text-gray-600">Loading financial report...</span>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Header with Add Expense Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Financial Report - Cost & Profit Analysis</h2>
            <p className="text-gray-600 mt-1">Revenue breakdown and profit margins</p>
          </div>
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Operating Expense</span>
          </button>
        </div>

        {/* Revenue Breakdown Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Revenue Breakdown</h3>
          </div>
          <div className="card-body space-y-2">
            {/* Total Revenue */}
            <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded">
              <p className="text-sm font-medium text-gray-600">Total Revenue:</p>
              <p className="text-base font-semibold text-green-600">
                {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </p>
            </div>

            {/* Cost of Goods Sold */}
            <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded">
              <p className="text-sm font-medium text-gray-600">Cost of Goods Sold:</p>
              <p className="text-base font-semibold text-red-600">
                -{costOfGoodsSold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </p>
            </div>

            {/* Gross Profit */}
            <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded">
              <p className="text-sm font-medium text-gray-600">Gross Profit:</p>
              <div className="text-right">
                <p className="text-base font-semibold text-blue-600">
                  {grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </p>
                <p className="text-xs text-gray-500">({grossMargin.toFixed(1)}%)</p>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded">
              <p className="text-sm font-medium text-gray-600">Operating Expenses:</p>
              <p className="text-base font-semibold text-orange-600">
                -{operatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </p>
            </div>

            {/* Net Profit */}
            <div className="flex items-center justify-between py-2 px-3 bg-purple-50 rounded border border-purple-200">
              <p className="text-sm font-medium text-gray-600">Net Profit:</p>
              <div className="text-right">
                <p className={`text-base font-semibold ${netProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </p>
                <p className="text-xs text-gray-500">({netMargin.toFixed(1)}%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Margins Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Profit Margins</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Gross Margin</p>
                    <p className="text-2xl font-bold text-blue-600">{grossMargin.toFixed(1)}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${Math.min(grossMargin, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Net Margin</p>
                    <p className={`text-2xl font-bold ${netMargin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {netMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${netMargin >= 0 ? 'bg-purple-600' : 'bg-red-600'}`}
                      style={{ width: `${Math.min(Math.abs(netMargin), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Summary</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="font-semibold text-gray-900">
                    {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Costs</span>
                  <span className="font-semibold text-red-600">
                    {(costOfGoodsSold + operatingExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Net Profit</span>
                    <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operating Expenses List */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Operating Expenses</h3>
              <p className="text-sm text-gray-500 mt-1">Detailed list of recorded operating expenses</p>
            </div>
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
          </div>
          <div className="card-body p-0">
            {loadingExpenses ? (
              <div className="flex items-center justify-center h-40">
                <div className="loading-spinner w-6 h-6"></div>
                <span className="ml-2 text-gray-600 text-sm">Loading expenses...</span>
              </div>
            ) : operatingExpensesList.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No operating expenses recorded for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (ETB)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {operatingExpensesList.map((exp) => (
                      <tr key={exp._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {exp.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exp.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-900">
                          {exp.amount != null
                            ? exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exp.created_by
                            ? `${exp.created_by.first_name || ''} ${exp.created_by.last_name || ''}`.trim() || exp.created_by.email || '-'
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedExpense(exp)
                                setShowEditExpenseModal(true)
                              }}
                              className="px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to delete this expense?')) {
                                  return
                                }
                                try {
                                  await deleteExpenseMutation.mutateAsync(exp._id)
                                } catch (error) {
                                  // Optional: surface error via toast/UI
                                  console.error('Error deleting expense:', error)
                                }
                              }}
                              className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                              disabled={deleteExpenseMutation.isLoading}
                            >
                              Delete
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
        </div>

        {/* Add Operating Expense Modal */}
        <AddOperatingExpenseModal
          isOpen={showAddExpenseModal}
          onClose={() => setShowAddExpenseModal(false)}
          onSuccess={() => {
            // Modal will handle query invalidation
          }}
        />
        <EditOperatingExpenseModal
          isOpen={showEditExpenseModal}
          onClose={() => {
            setShowEditExpenseModal(false)
            setSelectedExpense(null)
          }}
          expense={selectedExpense}
          onSuccess={() => {
            // Queries are invalidated by hooks
          }}
        />
      </div>
    )
  }

  const renderReport = () => {
    switch (selectedReport) {
      case 'financial':
        return renderFinancialReport()
      case 'barbers':
        return renderBarberReport()
      case 'services':
        return renderServiceReport()
      case 'inventory':
        return renderInventoryReport()
      default:
        return renderOverviewReport()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <button
                key={report.key}
                onClick={() => setSelectedReport(report.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedReport === report.key
                    ? 'bg-primary-100 text-primary-800 border border-primary-200'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{report.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center space-x-2">
          {periods.map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedPeriod === period.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      {renderReport()}
    </div>
  )
}

export default ReportsPage