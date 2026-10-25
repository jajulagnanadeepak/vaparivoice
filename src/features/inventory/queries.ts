import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product-service';

export const useProductConversions = (productId: string | undefined) =>
  useQuery({
    queryKey: ['products', 'conversions', productId],
    queryFn: () => productService.conversions(productId!),
    enabled: !!productId,
    staleTime: 10 * 60_000,
    retry: 1,
  });
