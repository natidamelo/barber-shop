import React, { useState } from 'react'
import { X, Star, Gift } from 'lucide-react'
import { barberTipService } from '../../services/barberTipService'
import toast from 'react-hot-toast'

const TipBarberModal = ({ appointment, availablePoints = 0, onClose, onSuccess }) => {
  const [points, setPoints] = useState(() => Math.min(10, availablePoints || 0))
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasNoPoints = (availablePoints || 0) === 0

  const barberId = appointment?.barber_id?._id || appointment?.barber_id
  const appointmentId = appointment?._id || appointment?.id

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!barberId || points < 1) {
      toast.error('Invalid data')
      return
    }
    if (points > availablePoints) {
      toast.error(`You only have ${availablePoints} points available`)
      return
    }
    setIsSubmitting(true)
    try {
      await barberTipService.givePoints({
        barber_id: barberId,
        points,
        appointment_id: appointmentId,
        message: message.trim() || undefined
      })
      toast.success(`You gave ${points} points to your barber!`)
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to give points')
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickAmounts = [5, 10, 20, 50].filter((a) => a <= availablePoints)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Give Points to Barber
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {appointment && (
            <div className="mb-6 p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Showing appreciation for <span className="font-medium">{appointment.barber_id?.first_name} {appointment.barber_id?.last_name}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">{appointment.service_id?.name}</p>
              <p className="text-xs text-gray-500 mt-2">Your barber will see this on their dashboard. The shop may use points for recognition or rewards—check with your shop for details.</p>
            </div>
          )}

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Your available points: <span className="font-bold text-primary-600">{availablePoints}</span></p>
            <p className="text-xs text-gray-500 mt-1">Earn 1 point per 10 ETB on <strong>completed and paid</strong> appointments.</p>
            {hasNoPoints && (
              <p className="text-xs text-amber-700 mt-2">You don’t have points yet. Once your appointment is completed and marked paid by the shop, you’ll earn points and can tip your barber here.</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Points to give</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setPoints(amount)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      points === amount
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                max={availablePoints}
                value={points}
                onChange={(e) => setPoints(Math.max(0, Math.min(availablePoints, parseInt(e.target.value, 10) || 0)))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={hasNoPoints}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Thank you for the great cut!"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{message.length}/200</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || hasNoPoints || points > availablePoints || points < 1}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : hasNoPoints ? 'No points to give' : `Give ${points} Points`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TipBarberModal
