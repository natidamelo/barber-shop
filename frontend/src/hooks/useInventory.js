import { useQuery } from 'react-query'
import { inventoryService } from '../services/inventoryService'

export const useInventory = (params) => {
  return useQuery(
    ['inventory', params],
    () => inventoryService.getInventory(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export const useInventoryItem = (id) => {
  return useQuery(
    ['inventoryItem', id],
    () => inventoryService.getInventoryItem(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export const useLowStockItems = () => {
  return useQuery(
    ['lowStockItems'],
    () => inventoryService.getLowStockItems(),
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    }
  )
}

export const useInventoryCategories = () => {
  return useQuery(
    ['inventoryCategories'],
    () => inventoryService.getCategories(),
    {
      staleTime: 1000 * 60 * 30, // 30 minutes
    }
  )
}