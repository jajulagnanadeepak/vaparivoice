import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/features/i18n/i18n-provider';
import { LANGUAGE_REGISTRY, SUPPORTED_LANGUAGES } from '@/locales';
import type { LanguageCode } from '@/types';

export function LanguageMenu() {
  const { t, lang, setLang } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Labelled with the language's own name so it can be found without reading English. */}
        <Button variant="outline" size="sm" className="h-10 gap-1.5 px-2.5" aria-label={`${t('top.language')}: ${LANGUAGE_REGISTRY[lang].nativeName}`}>
          <Languages aria-hidden />
          <span className="text-sm font-semibold">{LANGUAGE_REGISTRY[lang].nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('top.language')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as LanguageCode)}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l} className="min-h-12 text-base">{LANGUAGE_REGISTRY[l].nativeName}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
