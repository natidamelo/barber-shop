import { useQuery } from 'react-query'
import { userService } from '../services/userService'

export const useUsers = (params) => {
  return useQuery(
    ['users', params],
    () => userService.getUsers(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export const useBarbers = () => {
  return useQuery(
    ['barbers'],
    () => userService.getBarbers(),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  )
}

export const useWashers = () => {
  return useQuery(
    ['users', { role: 'washer' }],
    () => userService.getUsers({ role: 'washer', limit: 100 }),
    {
      staleTime: 1000 * 60 * 5,
    }
  )
}

export const useUser = (id) => {
  return useQuery(
    ['user', id],
    () => userService.getUser(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export const useUserStats = (id) => {
  return useQuery(
    ['userStats', id],
    () => userService.getUserStats(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export const useCustomers = (params = {}) => {
  return useQuery(
    ['customers', params],
    () => userService.getCustomers(params),
    {
      staleTime: 1000 * 60 * 5,
    }
  )
}