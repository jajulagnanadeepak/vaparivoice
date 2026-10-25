import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { productService } from '@/services/product-service';
import type { ProductCreateRequest, ProductListParams, ProductUpdateRequest } from '@/types';

export const useProducts = (params: ProductListParams) =>
  useQuery({ queryKey: queryKeys.products.list(params), queryFn: () => productService.list(params), placeholderData: keepPreviousData });
export const useProduct = (id: string) => useQuery({ queryKey: queryKeys.products.detail(id), queryFn: () => productService.get(id), enabled: !!id });
export const useProductMovements = (id: string, page: number) =>
  useQuery({ queryKey: queryKeys.products.movements(id, page), queryFn: () => productService.movements(id, page), placeholderData: keepPreviousData });
export const useCategories = () => useQuery({ queryKey: queryKeys.categories, queryFn: productService.categories, staleTime: 5 * 60_000 });
export const useUnits = () => useQuery({ queryKey: queryKeys.units, queryFn: productService.units, staleTime: 30 * 60_000 });
export const useSuppliers = () => useQuery({ queryKey: queryKeys.suppliers(), queryFn: () => productService.suppliers(), staleTime: 5 * 60_000 });

function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.products.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    void qc.invalidateQueries({ queryKey: queryKeys.alerts.all });
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({ mutationFn: (b: ProductCreateRequest) => productService.create(b), onSuccess: invalidate });
}
export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (b: ProductUpdateRequest) => productService.update(id, b),
    onSuccess: (p) => { qc.setQueryData(queryKeys.products.detail(id), p); invalidate(); },
  });
}
export function useArchiveProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({ mutationFn: (id: string) => productService.archive(id), onSuccess: invalidate });
}
