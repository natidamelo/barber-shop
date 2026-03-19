import { useQuery } from 'react-query'
import { settingsService } from '../services/settingsService'

export const useBusinessName = () => {
  const { data: businessName = 'BarberPro', isLoading, refetch } = useQuery(
    'businessName',
    () => settingsService.getBusinessName(),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes - business name rarely changes
      retry: 1,
      refetchOnWindowFocus: false
    }
  )

  return { businessName, loading: isLoading, refresh: refetch }
}
