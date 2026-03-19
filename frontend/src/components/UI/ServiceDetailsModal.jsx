import React from 'react'
import { X, Clock, DollarSign, Calendar, Star, Users, ToggleLeft, ToggleRight } from 'lucide-react'

const ServiceDetailsModal = ({ service, isOpen, onClose, onEdit }) => {
  if (!isOpen || !service) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Service Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Service Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{service.name}</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 mt-2">
                  {service.category}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
                {service.is_active ? (
                  <ToggleRight className="h-6 w-6 text-green-500" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </div>
            
            <p className="text-gray-600 text-lg leading-relaxed">
              {service.description}
            </p>
          </div>

          {/* Service Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{service.price} ETB</p>
              <p className="text-sm text-gray-600">Price</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{service.duration}m</p>
              <p className="text-sm text-gray-600">Duration</p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">
                {service.average_rating || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Rating</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {service.total_reviews || 0}
              </p>
              <p className="text-sm text-gray-600">Bookings</p>
            </div>
          </div>

          {/* Service Information */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Service Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Created</span>
                  <p className="text-sm text-gray-900">
                    {new Date(service.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Last Updated</span>
                  <p className="text-sm text-gray-900">
                    {new Date(service.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Sort Order</span>
                  <p className="text-sm text-gray-900">{service.sort_order || 0}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">ID</span>
                  <p className="text-sm text-gray-900 font-mono">{service._id}</p>
                </div>
              </div>
            </div>

            {service.requirements && Object.keys(service.requirements).length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Special Requirements</h4>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(service.requirements, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Close
            </button>
            <button
              onClick={() => {
                onEdit(service)
                onClose()
              }}
              className="btn btn-primary"
            >
              Edit Service
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetailsModal