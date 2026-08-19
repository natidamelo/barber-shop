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
    setShowDetailsModal(false)
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
              {services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length) : 0} ETB
            </p>
            <p className="text-sm text-gray-600">Avg. Price</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length) : 0}
            </p>
            <p className="text-sm text-gray-600">Avg. Duration (min)</p>
          </div>
        </div>
        <div className="card">
          <div className="p-6 text-center">
            <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {services.length > 0 ? (services.reduce((sum, s) => sum + s.average_rating, 0) / services.length).toFixed(1) : "0.0"}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 pr-2">
                  <h3 className="text-base font-bold text-gray-900 truncate">{service.name}</h3>
                  <span className="text-xs font-medium text-primary-600 mt-0.5 block truncate">
                    {service.category || 'Uncategorized'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button onClick={() => {}} title={service.is_active ? "Active" : "Inactive"}>
                    {service.is_active ? (
                      <ToggleRight className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {service.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{service.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 leading-none">{service.price} ETB</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-amber-50 text-amber-600 rounded">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 leading-none">{service.shop_cut || 0} ETB</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-blue-50 text-blue-600 rounded">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-900 leading-none">{service.duration}m</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                  <span className="font-medium text-gray-700">{service.average_rating || 'N/A'}</span>
                  <span>({service.total_reviews || 0})</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => handleEditService(service)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Edit Service"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleViewDetails(service)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
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