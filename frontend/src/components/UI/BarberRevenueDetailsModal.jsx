import React from 'react'
import { X, DollarSign, Calendar, Scissors, TrendingUp, Calculator } from 'lucide-react'

const BarberRevenueDetailsModal = ({ barber, appointments, isOpen, onClose }) => {
  if (!isOpen || !barber) return null

  // Helper function to get barber ID from appointment
  const getAppointmentBarberId = (apt) => {
    if (!apt.barber_id) return null
    return apt.barber_id._id || apt.barber_id.toString()
  }

  // Helper function to get barber commission
  const getBarberCommission = (apt) => {
    if (apt.status !== 'completed') return 0
    return apt.barber_commission !== undefined && apt.barber_commission !== null 
      ? apt.barber_commission 
      : 0
  }

  const barberId = barber._id || barber.id
  const barberAppointments = appointments.filter(a => 
    getAppointmentBarberId(a) === barberId.toString() && a.status === 'completed'
  )

  // Calculate totals
  const totalRevenue = barberAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
  const totalShopCut = barberAppointments.reduce((sum, apt) => sum + (apt.shop_cut || 0), 0)
  const totalBarberCommission = barberAppointments.reduce((sum, apt) => sum + getBarberCommission(apt), 0)

  // Group by period
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const biWeekAgo = new Date(today)
  biWeekAgo.setDate(biWeekAgo.getDate() - 14)
  
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const todayAppointments = barberAppointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date)
    return aptDate >= today
  })

  const weekAppointments = barberAppointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date)
    return aptDate >= weekAgo
  })

  const biWeekAppointments = barberAppointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date)
    return aptDate >= biWeekAgo
  })

  const monthAppointments = barberAppointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date)
    return aptDate >= monthAgo
  })

  const calculatePeriodRevenue = (apts) => {
    return apts.reduce((sum, apt) => sum + getBarberCommission(apt), 0)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Revenue Breakdown - {barber.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Detailed calculation of barber commission</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Daily Revenue</span>
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {calculatePeriodRevenue(todayAppointments).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ETB
              </p>
              <p className="text-xs text-gray-500 mt-1">{todayAppointments.length} appointment(s)</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Weekly Revenue</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {calculatePeriodRevenue(weekAppointments).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ETB
              </p>
              <p className="text-xs text-gray-500 mt-1">{weekAppointments.length} appointment(s)</p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Bi-Weekly Revenue</span>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {calculatePeriodRevenue(biWeekAppointments).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ETB
              </p>
              <p className="text-xs text-gray-500 mt-1">{biWeekAppointments.length} appointment(s)</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Monthly Revenue</span>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {calculatePeriodRevenue(monthAppointments).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ETB
              </p>
              <p className="text-xs text-gray-500 mt-1">{monthAppointments.length} appointment(s)</p>
            </div>
          </div>

          {/* Overall Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-gray-600" />
              Overall Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Service Revenue:</span>
                <p className="font-semibold text-gray-900">{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
              </div>
              <div>
                <span className="text-gray-600">Total Shop Cut:</span>
                <p className="font-semibold text-red-600">-{totalShopCut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
              </div>
              <div>
                <span className="text-gray-600">Total Barber Commission:</span>
                <p className="font-semibold text-green-600">{totalBarberCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
              </div>
            </div>
          </div>

          {/* Detailed Appointment List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Service Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shop Cut</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Barber Earns</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {barberAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">
                        No completed appointments found
                      </td>
                    </tr>
                  ) : (
                    barberAppointments
                      .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
                      .map((apt, index) => {
                        const servicePrice = apt.price || 0
                        const shopCut = apt.shop_cut || 0
                        const remaining = Math.max(0, servicePrice - shopCut)
                        const commission = getBarberCommission(apt)
                        const commissionPercent = servicePrice > 0 && remaining > 0 
                          ? ((commission / remaining) * 100).toFixed(1)
                          : '0.0'
                        
                        const serviceName = apt.service_id?.name || 'Unknown Service'
                        const appointmentDate = new Date(apt.appointment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })

                        return (
                          <tr key={apt._id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {appointmentDate}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="flex items-center">
                                <Scissors className="h-4 w-4 text-gray-400 mr-2" />
                                {serviceName}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {servicePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">
                              -{shopCut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                              {remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                              {commissionPercent}%
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                              {commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
                {barberAppointments.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-sm font-semibold text-gray-900">
                        Total ({barberAppointments.length} appointments)
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                        {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-red-600">
                        -{totalShopCut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-600">
                        {(totalRevenue - totalShopCut).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-600">
                        {totalRevenue > 0 && (totalRevenue - totalShopCut) > 0
                          ? ((totalBarberCommission / (totalRevenue - totalShopCut)) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-green-600">
                        {totalBarberCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Calculation Formula */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Calculation Formula</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Step 1:</strong> Service Price - Shop Cut = Remaining Amount</p>
              <p><strong>Step 2:</strong> Remaining Amount × Commission % = Barber Commission</p>
              <p className="mt-2 text-xs text-blue-700">
                Example: Service (1200 ETB) - Shop Cut (400 ETB) = 800 ETB remaining. 
                800 ETB × 60% = 480 ETB barber commission
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberRevenueDetailsModal
