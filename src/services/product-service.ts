import { apiClient } from '@/lib/api-client';
import type {
  Category, Paginated, Product, ProductCreateRequest, ProductListParams, ProductUnitConversion,
  ProductUpdateRequest, StockMovement, SupplierSummary, Unit,
} from '@/types';

export const productService = {
  list: (params: ProductListParams) => apiClient.get<Paginated<Product>>('/products', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (body: ProductCreateRequest) => apiClient.post<Product>('/products', body).then((r) => r.data),
  update: (id: string, body: ProductUpdateRequest) => apiClient.patch<Product>(`/products/${id}`, body).then((r) => r.data),
  archive: (id: string) => apiClient.post<Product>(`/products/${id}/archive`).then((r) => r.data),
  movements: (id: string, page = 1, page_size = 10) =>
    apiClient.get<Paginated<StockMovement>>(`/products/${id}/movements`, { params: { page, page_size } }).then((r) => r.data),
  conversions: (id: string) => apiClient.get<ProductUnitConversion[]>(`/products/${id}/conversions`).then((r) => r.data),
  categories: () => apiClient.get<Category[]>('/categories').then((r) => r.data),
  units: () => apiClient.get<Unit[]>('/units').then((r) => r.data),
  suppliers: (search = '') => apiClient.get<SupplierSummary[]>('/suppliers', { params: { search, page_size: 50 } }).then((r) => r.data),
};
