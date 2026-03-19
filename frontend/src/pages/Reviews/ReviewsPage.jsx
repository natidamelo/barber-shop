import React, { useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { Star, Filter, Search, Calendar, User, Scissors, TrendingUp, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { authService } from '../../services/authService'
import { reviewService } from '../../services/reviewService'
import { useBarbers } from '../../hooks/useUsers'
import { useActiveServices } from '../../hooks/useServices'
import toast from 'react-hot-toast'

const ReviewsPage = () => {
  const user = authService.getStoredUser()
  const queryClient = useQueryClient()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [showWriteForm, setShowWriteForm] = useState(false)
  const [writeForm, setWriteForm] = useState({ barber_id: '', service_id: '', rating: 5, comment: '' })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // For barbers: get reviews for this barber
  // For customers: get their own reviews
  const isBarber = user?.role === 'barber'
  const isCustomer = user?.role === 'customer'

  const { data: barbersData = { data: [] } } = useBarbers()
  const { data: servicesData = { data: [] } } = useActiveServices()
  const barbers = barbersData.data || []
  const services = servicesData.data || []

  // Fetch reviews based on user role
  const userId = user?._id || user?.id

  const { data: reviewsData = { data: [] }, isLoading: loadingReviews } = useQuery(
    ['reviews', userId, user?.role],
    async () => {
      if (isBarber) {
        return await reviewService.getReviews({ barber_id: userId, limit: 100 })
      } else if (isCustomer) {
        return await reviewService.getMyReviews({ limit: 100 })
      }
      return { data: [] }
    },
    { enabled: !!userId }
  )

  // Fetch barber stats if barber
  const { data: statsData = { data: {} }, isLoading: loadingStats } = useQuery(
    ['barberStats', userId],
    () => reviewService.getBarberStats(userId),
    { enabled: isBarber && !!userId }
  )

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!writeForm.barber_id || !writeForm.service_id) {
      toast.error('Please select a barber and service')
      return
    }
    setIsSubmittingReview(true)
    try {
      await reviewService.createReview({
        barber_id: writeForm.barber_id,
        service_id: writeForm.service_id,
        rating: Number(writeForm.rating),
        comment: writeForm.comment.trim() || undefined
      })
      toast.success('Thank you for your review!')
      setWriteForm({ barber_id: '', service_id: '', rating: 5, comment: '' })
      setShowWriteForm(false)
      queryClient.invalidateQueries(['reviews'])
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit review')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const reviews = reviewsData.data || []
  const stats = statsData.data || {}

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter)
    const customerName = `${review.customer_first_name || ''} ${review.customer_last_name || ''}`.toLowerCase()
    const serviceName = (review.service_name || '').toLowerCase()
    const comment = (review.comment || '').toLowerCase()
    const matchesSearch = searchQuery === '' || 
      customerName.includes(searchQuery.toLowerCase()) ||
      serviceName.includes(searchQuery.toLowerCase()) ||
      comment.includes(searchQuery.toLowerCase())
    
    return matchesRating && matchesSearch
  })

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  if (loadingReviews || (isBarber && loadingStats)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading reviews...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isBarber ? 'My Reviews' : 'My Reviews'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isBarber 
              ? 'View and manage reviews from your customers' 
              : 'View and write reviews for your barbers'}
          </p>
        </div>
        {isCustomer && (
          <button
            onClick={() => setShowWriteForm(!showWriteForm)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>{showWriteForm ? 'Cancel' : 'Write a Review'}</span>
            {showWriteForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Write Review Form (Customers) */}
      {isCustomer && showWriteForm && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-primary-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Write a Review</h3>
          <p className="text-sm text-gray-500 mb-4">You can review a barber after completing an appointment with them.</p>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barber</label>
                <select
                  value={writeForm.barber_id}
                  onChange={(e) => setWriteForm(f => ({ ...f, barber_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select barber</option>
                  {barbers.map((b) => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {b.first_name} {b.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select
                  value={writeForm.service_id}
                  onChange={(e) => setWriteForm(f => ({ ...f, service_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select service</option>
                  {services.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setWriteForm(f => ({ ...f, rating: star }))}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`h-8 w-8 ${star <= writeForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
              <textarea
                value={writeForm.comment}
                onChange={(e) => setWriteForm(f => ({ ...f, comment: e.target.value }))}
                rows={3}
                maxLength={1000}
                placeholder="Share your experience..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{writeForm.comment.length}/1000</p>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics for Barbers */}
      {isBarber && stats.total_reviews !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.total_reviews || 0}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <div className="flex items-center mt-1">
                  <p className="text-2xl font-bold text-gray-900 mr-2">
                    {stats.average_rating || '0.0'}
                  </p>
                  <div className="flex">
                    {renderStars(Math.round(parseFloat(stats.average_rating || 0)))}
                  </div>
                </div>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">5 Star Reviews</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.rating_distribution?.[5] || 0}
                </p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <Star className="h-6 w-6 text-yellow-600 fill-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified Reviews</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {reviews.filter(r => r.is_verified).length}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, service, or comment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Rating Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">
              {isBarber 
                ? 'You haven\'t received any reviews yet.' 
                : 'You haven\'t written any reviews yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        <span className={`text-lg font-semibold ${getRatingColor(review.rating)}`}>
                          {review.rating}.0
                        </span>
                      </div>
                      {review.is_verified && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {isBarber && (
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span className="font-medium">
                            {review.customer_first_name} {review.customer_last_name}
                          </span>
                        </div>
                      )}
                      
                      {isCustomer && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Scissors className="h-4 w-4 mr-2" />
                          <span className="font-medium">
                            {review.barber_first_name} {review.barber_last_name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center text-sm text-gray-600">
                        <Scissors className="h-4 w-4 mr-2" />
                        <span>{review.service_name}</span>
                      </div>

                      {review.comment && (
                        <p className="text-gray-700 mt-2">{review.comment}</p>
                      )}

                      <div className="flex items-center text-xs text-gray-500 mt-3">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewsPage
