/** Decimal values (quantities, money) are serialised by FastAPI as strings. */
export type DecimalString = string;
export type ISODateTime = string;
export type UUID = string;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type SortOrder = 'asc' | 'desc';
export type LanguageCode = 'en' | 'hi' | 'te';
export type Role = 'owner' | 'inventory_manager' | 'staff';
