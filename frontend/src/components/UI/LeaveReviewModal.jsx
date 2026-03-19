import React, { useState } from 'react'
import { X, Star, Scissors } from 'lucide-react'
import { reviewService } from '../../services/reviewService'
import toast from 'react-hot-toast'

const LeaveReviewModal = ({ appointment, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const barberId = appointment?.barber_id?._id || appointment?.barber_id
  const serviceId = appointment?.service_id?._id || appointment?.service_id
  const appointmentId = appointment?._id || appointment?.id

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!barberId || !serviceId) {
      toast.error('Invalid appointment data')
      return
    }
    setIsSubmitting(true)
    try {
      await reviewService.createReview({
        barber_id: barberId,
        service_id: serviceId,
        appointment_id: appointmentId || undefined,
        rating: Number(rating),
        comment: comment.trim() || undefined
      })
      toast.success('Thank you for your review!')
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Leave a Review</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {appointment && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Scissors className="h-4 w-4 text-primary-500" />
                <span className="font-medium">{appointment.service_id?.name || 'Service'}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                with {appointment.barber_id?.first_name} {appointment.barber_id?.last_name}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{rating} out of 5 stars</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Share your experience..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{comment.length}/1000 characters</p>
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
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LeaveReviewModal
