import { useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function OfflineBanner() {
  const { t } = useI18n();
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) { wasOffline.current = false; toast.success(t('offline.back')); }
  }, [online, t]);

  if (online) return null;
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-foreground px-3 py-2 text-center text-sm font-medium text-background">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      {t('offline.banner')}
    </div>
  );
}
