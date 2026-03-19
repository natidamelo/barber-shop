import { useQuery } from 'react-query'
import { serviceService } from '../services/serviceService'

export const useServices = (params) => {
  return useQuery(
    ['services', params],
    () => serviceService.getServices(params),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  )
}

export const useActiveServices = () => {
  return useQuery(
    ['activeServices'],
    () => serviceService.getActiveServices(),
    {
      staleTime: 1000 * 60 * 10,
    }
  )
}

export const useService = (id) => {
  return useQuery(
    ['service', id],
    () => serviceService.getService(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export const useServiceCategories = () => {
  return useQuery(
    ['serviceCategories'],
    () => serviceService.getCategories(),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  )
}