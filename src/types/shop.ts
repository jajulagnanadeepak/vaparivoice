import type { LanguageCode, UUID } from './common';

export interface Shop {
  id: UUID;
  name: string;
  owner_name: string | null;
  ui_language: LanguageCode;
  voice_language: LanguageCode;
  currency: 'INR';
  timezone: string;
  default_min_stock: string | null;
  created_at: string;
}

export interface ShopCreateRequest {
  name: string;
  owner_name?: string;
  ui_language: LanguageCode;
  voice_language: LanguageCode;
  currency: 'INR';
  timezone: string;
  default_min_stock?: string;
  default_unit_code?: string;
}
