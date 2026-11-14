export type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'AUD'
  | 'CAD'
  | 'SGD'
  | 'AED';

export type LicenseTier = 'editorial' | 'commercial' | 'archival_print';

export type RegionFilter =
  | 'All'
  | 'India'
  | 'Asia'
  | 'Europe'
  | 'Americas'
  | 'Africa';

export interface ExchangeRatesResponse {
  base: 'INR';
  updatedAt: string;
  rates: Record<CurrencyCode, number>;
}

export interface PhotoExifMetadata {
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: number;
  dimensions: string;
  fileSizeMb: string;
  colorSpace: string;
  capturedAt: string;
  copyright: string;
}

export interface PhotoComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  pending?: boolean;
}

export interface TravelPhoto {
  id: string;
  title: string;
  story: string;
  location: string;
  country: string;
  region: Exclude<RegionFilter, 'All'>;
  lat: number;
  lng: number;
  elevationMeters?: number;
  photographer: string;
  photographerHandle: string;
  photographerLocation: string;
  category: 'Alpine' | 'Heritage' | 'Coastal' | 'Desert' | 'Forest' | 'Urban';
  assetKey?: string;
  imageUrl?: string;
  aspectRatio: '16:9' | '4:3' | '3:4';
  forSale: boolean;
  basePriceInr: number;
  likes: number;
  saves: number;
  salesCount: number;
  tags: string[];
  exif: PhotoExifMetadata;
  comments?: PhotoComment[];
  createdAt: string;
  isUserUploaded?: boolean;
}

export interface CartItem {
  photoId: string;
  tier: LicenseTier;
  quantity: number;
}

export interface OrderItemReceipt {
  photoId: string;
  title: string;
  photographer: string;
  tier: LicenseTier;
  tierLabel: string;
  quantity: number;
  unitPriceInr: number;
  unitPriceDisplay: number;
  downloadUrl: string;
  licenseCode: string;
}

export interface OrderRecord {
  orderId: string;
  paymentMethod: 'upi' | 'netbanking' | 'card_inr' | 'card_intl';
  paymentReference: string;
  buyerName: string;
  buyerEmail: string;
  currency: CurrencyCode;
  fxRateUsed: number;
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
  totalDisplay: number;
  items: OrderItemReceipt[];
  status: 'paid';
  createdAt: string;
}

export interface PayoutRecord {
  id: string;
  photographerHandle: string;
  amountInr: number;
  destination: string;
  method: 'UPI Instant' | 'NEFT Bank Transfer';
  status: 'settled' | 'processing';
  reference: string;
  createdAt: string;
}
