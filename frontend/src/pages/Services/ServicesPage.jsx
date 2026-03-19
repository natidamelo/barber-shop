import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Clock, 
  DollarSign, 
  Star,
  Calendar,
  Filter,
  Search
} from 'lucide-react'
import { useActiveServices, useServiceCategories } from '../../hooks/useServices'

const ServicesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch real data
  const { data: servicesData = { data: [] }, isLoading: loadingServices } = useActiveServices()
  const { data: categoriesData = { data: [] }, isLoading: loadingCategories } = useServiceCategories()

  const services = servicesData.data || []
  const categories = ['All', ...(categoriesData.data || [])]

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || selectedCategory === 'All' || 
      service.category?.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = searchQuery === '' || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  if (loadingServices || loadingCategories) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner w-8 h-8"></div>
          <span className="ml-2 text-gray-600">Loading services...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Professional grooming services delivered by our expert barbers
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category || (selectedCategory === 'all' && category === 'All')
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search services..."
            className="input pl-10 w-full lg:w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {filteredServices.map((service) => (
          <div key={service._id} className="card group hover:shadow-lg transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600">
                    {service.name}
                  </h3>
                  {service.category && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mb-3">
                      {service.category}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{service.price} ETB</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6 line-clamp-3">
                {service.description}
              </p>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">{service.duration} minutes</span>
                </div>
                
                {service.average_rating && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span className="text-sm font-medium text-gray-900">
                      {service.average_rating}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      ({service.total_reviews || 0})
                    </span>
                  </div>
                )}
              </div>

              <Link
                to={`/booking?service=${service._id}`}
                className="w-full btn btn-primary flex items-center justify-center space-x-2 group-hover:bg-primary-700"
              >
                <Calendar className="h-4 w-4" />
                <span>Book This Service</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Try adjusting your search criteria.' : 'No services match the selected category.'}
          </p>
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-primary-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Book Your Appointment?
        </h2>
        <p className="text-gray-600 mb-6">
          Choose from our professional services and book your preferred time slot
        </p>
        <Link to="/booking" className="btn btn-primary btn-lg">
          Book Now
        </Link>
      </div>
    </div>
  )
}

export default ServicesPage