import {CurrencyCode, LicenseTier} from '../types/photography';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: CurrencyMeta[] = [
  {code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN', decimals: 0},
  {code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US', decimals: 2},
  {code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', decimals: 2},
  {code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB', decimals: 2},
  {code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', decimals: 0},
  {code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', decimals: 2},
  {code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', decimals: 2},
  {code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', decimals: 2},
  {code: 'AED', name: 'UAE Dirham', symbol: 'AED', locale: 'en-AE', decimals: 2},
];

export const DEFAULT_RATES_FROM_INR: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.0118,
  EUR: 0.0109,
  GBP: 0.0092,
  JPY: 1.81,
  AUD: 0.0181,
  CAD: 0.0165,
  SGD: 0.0158,
  AED: 0.0434,
};

export const LICENSE_TIERS: Record<
  LicenseTier,
  {
    label: string;
    shortLabel: string;
    multiplier: number;
    deliverable: string;
    rights: string;
  }
> = {
  editorial: {
    label: 'Editorial Digital License',
    shortLabel: 'Editorial',
    multiplier: 1,
    deliverable: 'Full-Resolution JPEG / 16-bit TIFF + EXIF Sidecar',
    rights: 'Single-project editorial, travel publication, or personal display',
  },
  commercial: {
    label: 'Commercial Worldwide License',
    shortLabel: 'Commercial',
    multiplier: 2.6,
    deliverable: 'Uncompressed Master RAW/TIFF + Global Model/Property Release',
    rights: 'Unlimited global advertising, brand campaigns, and print runs',
  },
  archival_print: {
    label: 'Museum Archival Giclée Print (24×36 in)',
    shortLabel: 'Archival Print',
    multiplier: 3.4,
    deliverable: 'Hahnemühle Photo Rag 308gsm Signed Print + Digital Master',
    rights: 'Insured worldwide tube courier + Certificate of Authenticity',
  },
};

export function getTierPriceInr(basePriceInr: number, tier: LicenseTier): number {
  return Math.round(basePriceInr * LICENSE_TIERS[tier].multiplier);
}

export function convertFromInr(
  amountInr: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number> = DEFAULT_RATES_FROM_INR
): number {
  const rate = rates[currency] ?? 1;
  const raw = amountInr * rate;
  const meta = CURRENCIES.find((c) => c.code === currency);
  if (!meta || meta.decimals === 0) {
    return Math.round(raw);
  }
  return Math.round(raw * 100) / 100;
}

export function formatCurrency(
  amountInCurrency: number,
  currency: CurrencyCode
): string {
  const meta = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(amountInCurrency);
}

export function formatConvertedFromInr(
  amountInr: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number> = DEFAULT_RATES_FROM_INR
): string {
  return formatCurrency(convertFromInr(amountInr, currency, rates), currency);
}
