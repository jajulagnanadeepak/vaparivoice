import { allKeys, LANGUAGE_REGISTRY, SUPPORTED_LANGUAGES, translate } from '@/locales';

describe('translations', () => {
  it('Telugu covers every English key with a non-empty string', () => {
    const te = LANGUAGE_REGISTRY.te.dictionary;
    const missing = allKeys().filter((k) => {
      const v = k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], te);
      return typeof v !== 'string' || !v.trim();
    });
    expect(missing).toEqual([]);
  });
  it('keeps the same {placeholders} in Telugu as in English', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of allKeys()) {
      expect([k, vars(translate('te', k as never))]).toEqual([k, vars(translate('en', k as never))]);
    }
  });
  it('only offers reviewed languages; Hindi stays registered for later', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['te', 'en']);
    expect(LANGUAGE_REGISTRY.hi.enabled).toBe(false);
  });
  it('falls back to English for a partial language', () => {
    expect(translate('hi', 'stock.unknownTitle')).toBe(translate('en', 'stock.unknownTitle'));
  });
  it('interpolates variables', () => {
    expect(translate('en', 'common.pageOf', { page: 2, pages: 5 })).toBe('Page 2 of 5');
    expect(translate('te', 'common.pageOf', { page: 2, pages: 5 })).toBe('పేజీ 2 / 5');
  });
});
