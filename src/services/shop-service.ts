import { apiClient } from '@/lib/api-client';
import type { Shop, ShopCreateRequest } from '@/types';

export const shopService = {
  list: () => apiClient.get<Shop[]>('/shops').then((r) => r.data),
  get: (id: string) => apiClient.get<Shop>(`/shops/${id}`).then((r) => r.data),
  create: (body: ShopCreateRequest) => apiClient.post<Shop>('/shops', body).then((r) => r.data),
  update: (id: string, body: Partial<ShopCreateRequest>) => apiClient.patch<Shop>(`/shops/${id}`, body).then((r) => r.data),
};
