import { useQuery, useMutation, useQueryClient } from 'react-query';
import { financialService } from '../services/financialService';

export const useFinancialSummary = (params) => {
  return useQuery(
    ['financialSummary', params],
    () => financialService.getFinancialSummary(params),
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    }
  );
};

export const useOperatingExpenses = (params) => {
  return useQuery(
    ['operatingExpenses', params],
    () => financialService.getOperatingExpenses(params),
    {
      staleTime: 1000 * 60 * 2,
    }
  );
};

export const useCreateOperatingExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (expenseData) => financialService.createOperatingExpense(expenseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('financialSummary');
        queryClient.invalidateQueries('operatingExpenses');
      },
    }
  );
};

export const useUpdateOperatingExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, expenseData }) => financialService.updateOperatingExpense(id, expenseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('financialSummary');
        queryClient.invalidateQueries('operatingExpenses');
      },
    }
  );
};

export const useDeleteOperatingExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (id) => financialService.deleteOperatingExpense(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('financialSummary');
        queryClient.invalidateQueries('operatingExpenses');
      },
    }
  );
};
