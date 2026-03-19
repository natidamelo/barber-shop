import { useQuery } from 'react-query'
import { appointmentService } from '../services/appointmentService'

export const useAppointments = (params) => {
  return useQuery(
    ['appointments', params],
    () => appointmentService.getAppointments(params),
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    }
  )
}

export const useAppointment = (id) => {
  return useQuery(
    ['appointment', id],
    () => appointmentService.getAppointment(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 2,
    }
  )
}

export const useAvailableSlots = (barberId, date, serviceId) => {
  return useQuery(
    ['availableSlots', barberId, date, serviceId],
    () => appointmentService.getAvailableSlots(barberId, date, serviceId),
    {
      enabled: !!(barberId && date),
      staleTime: 1000 * 60 * 1, // 1 minute
    }
  )
}

export const useAppointmentsByDateRange = (startDate, endDate, options = {}) => {
  const { limit = 500 } = options
  return useQuery(
    ['appointmentsByDateRange', startDate, endDate, limit],
    () => appointmentService.getAppointmentsByDateRange(startDate, endDate, limit),
    {
      enabled: !!(startDate && endDate),
      staleTime: 1000 * 60 * 5,
    }
  )
}