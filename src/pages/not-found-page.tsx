import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/states';
import { useI18n } from '@/features/i18n/i18n-provider';

export default function NotFoundPage() {
  const { t } = useI18n();
  return <EmptyState className="mt-10" title="404" body={t('products.notFound').replace(/product/i, 'page')} action={<Button asChild><Link to="/">{t('nav.home')}</Link></Button>} />;
}
