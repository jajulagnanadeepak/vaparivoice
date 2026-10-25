import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useArchiveProduct } from '@/features/products/queries';
import { useErrorMessage } from '@/hooks/use-error-message';
import type { Product } from '@/types';

export function ArchiveProductDialog({ product, onOpenChange, onArchived }: { product: Product | null; onOpenChange: (o: boolean) => void; onArchived?: () => void }) {
  const { t } = useI18n();
  const archive = useArchiveProduct();
  const errorMessage = useErrorMessage();
  return (
    <Dialog open={!!product} onOpenChange={(o) => !archive.isPending && onOpenChange(o)}>
      <DialogContent role="alertdialog" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('products.archiveTitle')}</DialogTitle>
          <DialogDescription>{product && t('products.archiveBody', { name: product.name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={archive.isPending}>{t('common.cancel')}</Button>
          <Button
            variant="destructive"
            loading={archive.isPending}
            onClick={() => product && archive.mutate(product.id, {
              onSuccess: () => { toast.success(t('products.archived_ok')); onOpenChange(false); onArchived?.(); },
              onError: (e) => toast.error(errorMessage(e)),
            })}
          >
            {t('common.archive')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
