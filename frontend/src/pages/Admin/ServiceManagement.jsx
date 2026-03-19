import React, { useState } from 'react'
import { 
  Search, 
  Plus, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Scissors,
  Clock,
  DollarSign,
  Eye,
  Star,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { useServices } from '../../hooks/useServices'
import ServiceEditModal from '../../components/UI/ServiceEditModal'
import ServiceDetailsModal from '../../components/UI/ServiceDetailsModal'
import { useQueryClient } from 'react-query'

const ServiceManagement = () => {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedService, setSelectedService] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch real services data
  const { data: servicesData = { data: [] }, isLoading, error } = useServices({
    page: 1,
    limit: 50
  })

  const services = servicesData.data || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner w-8 h-8"></div>
        <span className="ml-2 text-gray-600">Loading services...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Services</h3>
        <p className="text-gray-500">Please try refreshing the page</p>
      </div>
    )
  }

  const categories = ['All', 'Haircuts', 'Beard Services', 'Premium Services', 'Shave Services', 'Special Services']

  const filteredServices = services.filter(service => {
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'active' && service.is_active) ||
      (selectedFilter === 'inactive' && !service.is_active) ||
      service.category.toLowerCase() === selectedFilter.toLowerCase()
    
    const matchesSearch = searchQuery === '' || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const statusFilters = [
    { key: 'all', label: 'All Services', count: services.length },
    { key: 'active', label: 'Active', count: services.filter(s => s.is_active).length },
    { key: 'inactive', label: 'Inactive', count: services.filter(s => !s.is_active).length }
  ]

  const handleEditService = (service) => {
    setSelectedService(service)
    setShowEditModal(true)
  }

  const handleViewDetails = (service) => {
    setSelectedService(service)
    setShowDetailsModal(true)
  }

  const handleUpdateSuccess = () => {
    // Invalidate all service-related queries to refresh data everywhere
    queryClient.invalidateQueries(['services'])
    queryClient.invalidateQueries(['activeServices'])
    queryClient.invalidateQueries(['service'])
  }

  const handleCloseModals = () => {
    setShowEditModal(false)
    setShowDetailsModal(false)
    setSelectedService(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600 mt-1">Manage services, pricing, and descriptions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button 
            onClick={() => { setSelectedService(null); setShowEditModal(true) }}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Service Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="p-6 text-center">
            <Scissors className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{services.length}</p>
            <p className="text-sm text-gray-600">Total Services</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length)} ETB
            </p>
            <p className="text-sm text-gray-600">Avg. Price</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length)}
            </p>
            <p className="text-sm text-gray-600">Avg. Duration (min)</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {(services.reduce((sum, s) => sum + s.average_rating, 0) / services.length).toFixed(1)}
            </p>
            <p className="text-sm text-gray-600">Avg. Rating</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedFilter === filter.key
                  ? 'bg-primary-100 text-primary-800 border border-primary-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span>{filter.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                selectedFilter === filter.key ? 'bg-primary-200' : 'bg-gray-200'
              }`}>
                {filter.count}
              </span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{service.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {service.category}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => {}}>
                    {service.is_active ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{service.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-600">{service.price} ETB</p>
                  <p className="text-xs text-gray-500">Price</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-red-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-red-600">{service.shop_cut || 0} ETB</p>
                  <p className="text-xs text-gray-500">Shop Cut</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-600">{service.duration}m</p>
                  <p className="text-xs text-gray-500">Duration</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-900">
                    {service.average_rating || 'N/A'}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({service.total_reviews || 0} reviews)
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleEditService(service)}
                  className="flex-1 btn btn-sm btn-secondary flex items-center justify-center space-x-1 hover:bg-gray-200"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </button>
                <button 
                  onClick={() => handleViewDetails(service)}
                  className="flex-1 btn btn-sm btn-primary flex items-center justify-center space-x-1 hover:bg-primary-700"
                >
                  <Eye className="h-3 w-3" />
                  <span>Details</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <ServiceEditModal
        service={selectedService}
        isOpen={showEditModal}
        onClose={handleCloseModals}
        onUpdate={handleUpdateSuccess}
      />

      <ServiceDetailsModal
        service={selectedService}
        isOpen={showDetailsModal}
        onClose={handleCloseModals}
        onEdit={handleEditService}
      />

    </div>
  )
}

export default ServiceManagement