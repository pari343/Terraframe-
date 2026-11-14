import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const INTENT_SECRET =
  process.env.PAYMENT_SIGNING_SECRET || 'terraframe-escrow-signing-key-2026';

fs.mkdirSync(UPLOADS_DIR, {recursive: true});

type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'AUD'
  | 'CAD'
  | 'SGD'
  | 'AED';

type LicenseTier = 'editorial' | 'commercial' | 'archival_print';

interface PhotoExif {
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

interface StoredPhoto {
  id: string;
  title: string;
  story: string;
  location: string;
  country: string;
  region: 'India' | 'Asia' | 'Europe' | 'Americas' | 'Africa';
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
  exif: PhotoExif;
  comments?: Array<{
    id: string;
    author: string;
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
  isUserUploaded?: boolean;
}

interface OrderItemReceipt {
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

interface StoredOrder {
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

interface StoredPayout {
  id: string;
  photographerHandle: string;
  amountInr: number;
  destination: string;
  method: 'UPI Instant' | 'NEFT Bank Transfer';
  status: 'settled' | 'processing';
  reference: string;
  createdAt: string;
}

interface PendingIntent {
  intentId: string;
  currency: CurrencyCode;
  fxRateUsed: number;
  paymentMethod: 'upi' | 'netbanking' | 'card_inr' | 'card_intl';
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
  totalDisplay: number;
  items: Array<{
    photoId: string;
    tier: LicenseTier;
    quantity: number;
    unitPriceInr: number;
  }>;
  signature: string;
  createdAt: number;
}

interface DatabaseSchema {
  photos: StoredPhoto[];
  orders: StoredOrder[];
  payouts: StoredPayout[];
  pendingIntents: Record<string, PendingIntent>;
}

const RATES_FROM_INR: Record<CurrencyCode, number> = {
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

const TIER_MULTIPLIERS: Record<LicenseTier, {label: string; multiplier: number}> = {
  editorial: {label: 'Editorial Digital License', multiplier: 1},
  commercial: {label: 'Commercial Worldwide License', multiplier: 2.6},
  archival_print: {
    label: 'Museum Archival Giclée Print (24×36 in)',
    multiplier: 3.4,
  },
};

function convertInr(amountInr: number, currency: CurrencyCode): number {
  const rate = RATES_FROM_INR[currency] ?? 1;
  const raw = amountInr * rate;
  if (currency === 'INR' || currency === 'JPY') {
    return Math.round(raw);
  }
  return Math.round(raw * 100) / 100;
}

const SEED_PHOTOS: StoredPhoto[] = [
  {
    id: 'tf-ladakh-01',
    title: 'First Light Over Thiksey Gompa',
    story:
      'Captured from an east-facing ridge above the Indus River valley at 3,600m as morning mist drifted past the whitewashed monastery walls.',
    location: 'Thiksey, Ladakh',
    country: 'India',
    region: 'India',
    lat: 34.0561,
    lng: 77.6667,
    elevationMeters: 3600,
    photographer: 'Aarav Kulkarni',
    photographerHandle: '@aarav.frames',
    photographerLocation: 'Leh / Mumbai, India',
    category: 'Alpine',
    assetKey: 'ladakh',
    aspectRatio: '16:9',
    forSale: true,
    basePriceInr: 4800,
    likes: 342,
    saves: 128,
    salesCount: 9,
    tags: ['Ladakh', 'Himalayas', 'Monastery', 'Golden Hour', 'India'],
    exif: {
      camera: 'Leica M11',
      lens: 'Summilux-M 35mm f/1.4 ASPH',
      focalLength: '35 mm',
      aperture: 'f/8.0',
      shutterSpeed: '1/250 s',
      iso: 100,
      dimensions: '9528 × 5360 px',
      fileSizeMb: '41.8 MB',
      colorSpace: 'Adobe RGB (1998)',
      capturedAt: '2026-09-18T06:14:22+05:30',
      copyright: '© 2026 Aarav Kulkarni / Terraframe Archive',
    },
    comments: [
      {
        id: 'cmt-101',
        author: 'Vikramaditya Rao',
        text: 'The separation between the monastery walls and the valley mist at f/8 is remarkable.',
        createdAt: '2026-10-12T08:15:00.000Z',
      },
      {
        id: 'cmt-102',
        author: 'Nadia Lind',
        text: 'Ordered the 24×36 archival print for our studio in Stockholm — tonal range on the snow ridges is spotless.',
        createdAt: '2026-10-29T14:40:00.000Z',
      },
    ],
    createdAt: '2026-09-20T09:00:00.000Z',
  },
  {
    id: 'tf-varanasi-02',
    title: 'Amber Mist at Dashashwamedh Ghat',
    story:
      'Moored wooden rowboats along the ancient sandstone steps of the Ganges just as dawn haze turned the river surface to liquid brass.',
    location: 'Varanasi, Uttar Pradesh',
    country: 'India',
    region: 'India',
    lat: 25.3069,
    lng: 83.0104,
    elevationMeters: 81,
    photographer: 'Meera Deshmukh',
    photographerHandle: '@meeradesh',
    photographerLocation: 'Pune, India',
    category: 'Heritage',
    assetKey: 'varanasi',
    aspectRatio: '4:3',
    forSale: true,
    basePriceInr: 4200,
    likes: 289,
    saves: 104,
    salesCount: 7,
    tags: ['Varanasi', 'Ganges', 'Boats', 'Heritage', 'India'],
    exif: {
      camera: 'Fujifilm GFX 100S',
      lens: 'GF 45mm f/2.8 R WR',
      focalLength: '45 mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/320 s',
      iso: 200,
      dimensions: '11648 × 8736 px',
      fileSizeMb: '58.2 MB',
      colorSpace: 'ProPhoto RGB',
      capturedAt: '2026-10-04T06:02:11+05:30',
      copyright: '© 2026 Meera Deshmukh / Terraframe Archive',
    },
    createdAt: '2026-10-05T11:30:00.000Z',
  },
  {
    id: 'tf-hampi-03',
    title: 'Granite Monoliths of Vijayanagara',
    story:
      'Post-monsoon sunset washing over a 15th-century carved stone mandapa balanced amid giant weathered granite tors in Hampi.',
    location: 'Hampi, Karnataka',
    country: 'India',
    region: 'India',
    lat: 15.335,
    lng: 76.46,
    elevationMeters: 467,
    photographer: 'Rohan Subramanian',
    photographerHandle: '@rohan.fieldnotes',
    photographerLocation: 'Bengaluru, India',
    category: 'Heritage',
    assetKey: 'hampi',
    aspectRatio: '4:3',
    forSale: true,
    basePriceInr: 3900,
    likes: 214,
    saves: 87,
    salesCount: 5,
    tags: ['Hampi', 'Karnataka', 'Temple', 'Boulders', 'India'],
    exif: {
      camera: 'Sony A7R V',
      lens: 'FE 24-70mm f/2.8 GM II',
      focalLength: '38 mm',
      aperture: 'f/9.0',
      shutterSpeed: '1/160 s',
      iso: 125,
      dimensions: '9504 × 6336 px',
      fileSizeMb: '39.4 MB',
      colorSpace: 'Adobe RGB (1998)',
      capturedAt: '2026-08-29T18:09:44+05:30',
      copyright: '© 2026 Rohan Subramanian / Terraframe Archive',
    },
    createdAt: '2026-09-01T14:20:00.000Z',
  },
  {
    id: 'tf-kyoto-04',
    title: 'Sunbeams Through Sagano Bamboo',
    story:
      'Twenty minutes after sunrise in Arashiyama before the footpaths stir, diagonal light columns cut through wet emerald stalks.',
    location: 'Arashiyama, Kyoto',
    country: 'Japan',
    region: 'Asia',
    lat: 35.0168,
    lng: 135.6713,
    elevationMeters: 62,
    photographer: 'Kenji Takahashi',
    photographerHandle: '@kenji.light',
    photographerLocation: 'Kyoto, Japan',
    category: 'Forest',
    assetKey: 'kyoto',
    aspectRatio: '4:3',
    forSale: true,
    basePriceInr: 5200,
    likes: 418,
    saves: 192,
    salesCount: 11,
    tags: ['Kyoto', 'Japan', 'Bamboo', 'Morning Light', 'Forest'],
    exif: {
      camera: 'Hasselblad X2D 100C',
      lens: 'XCD 38mm f/2.5V',
      focalLength: '38 mm',
      aperture: 'f/6.3',
      shutterSpeed: '1/80 s',
      iso: 160,
      dimensions: '11656 × 8742 px',
      fileSizeMb: '64.0 MB',
      colorSpace: 'Display P3',
      capturedAt: '2026-05-12T05:54:08+09:00',
      copyright: '© 2026 Kenji Takahashi / Terraframe Archive',
    },
    createdAt: '2026-05-15T08:15:00.000Z',
  },
  {
    id: 'tf-patagonia-05',
    title: 'Alpenglow on Cuernos del Paine',
    story:
      'Rare windless morning at Lago Pehoé allowing a mirror reflection of Patagonia’s granite horns glowing crimson at daybreak.',
    location: 'Torres del Paine',
    country: 'Chile',
    region: 'Americas',
    lat: -51.057,
    lng: -73.053,
    elevationMeters: 210,
    photographer: 'Elena Valdivia',
    photographerHandle: '@elena.south',
    photographerLocation: 'Santiago, Chile',
    category: 'Alpine',
    assetKey: 'patagonia',
    aspectRatio: '16:9',
    forSale: true,
    basePriceInr: 6400,
    likes: 512,
    saves: 245,
    salesCount: 14,
    tags: ['Patagonia', 'Chile', 'Glacial Lake', 'Alpenglow', 'Andes'],
    exif: {
      camera: 'Nikon Z8',
      lens: 'NIKKOR Z 24-120mm f/4 S',
      focalLength: '28 mm',
      aperture: 'f/11',
      shutterSpeed: '1/15 s',
      iso: 64,
      dimensions: '8256 × 4644 px',
      fileSizeMb: '35.1 MB',
      colorSpace: 'Adobe RGB (1998)',
      capturedAt: '2026-03-21T07:28:15-03:00',
      copyright: '© 2026 Elena Valdivia / Terraframe Archive',
    },
    createdAt: '2026-03-24T17:45:00.000Z',
  },
  {
    id: 'tf-lofoten-06',
    title: 'Blue Hour Over Reinefjord',
    story:
      'Long exposure across the Arctic harbor of Reine as crimson rorbuer cabins flicker awake beneath snow-covered Olstinden peak.',
    location: 'Reine, Lofoten',
    country: 'Norway',
    region: 'Europe',
    lat: 67.9325,
    lng: 13.0886,
    elevationMeters: 18,
    photographer: 'Soren Lindqvist',
    photographerHandle: '@soren.arctic',
    photographerLocation: 'Tromsø, Norway',
    category: 'Coastal',
    assetKey: 'lofoten',
    aspectRatio: '4:3',
    forSale: true,
    basePriceInr: 5800,
    likes: 376,
    saves: 164,
    salesCount: 8,
    tags: ['Norway', 'Lofoten', 'Arctic', 'Fjord', 'Blue Hour'],
    exif: {
      camera: 'Canon EOS R5',
      lens: 'RF 28-70mm f/2 L USM',
      focalLength: '35 mm',
      aperture: 'f/8.0',
      shutterSpeed: '4.0 s',
      iso: 100,
      dimensions: '8192 × 5464 px',
      fileSizeMb: '32.7 MB',
      colorSpace: 'Adobe RGB (1998)',
      capturedAt: '2026-02-14T16:40:00+01:00',
      copyright: '© 2026 Soren Lindqvist / Terraframe Archive',
    },
    createdAt: '2026-02-18T10:10:00.000Z',
  },
  {
    id: 'tf-sahara-07',
    title: 'Knife-Edge Crest at Erg Chebbi',
    story:
      'Late afternoon crosswinds sculpting a razor-sharp divide between sunlit ochre sand and deep obsidian shadow in southeastern Morocco.',
    location: 'Merzouga, Sahara',
    country: 'Morocco',
    region: 'Africa',
    lat: 31.1499,
    lng: -4.0134,
    elevationMeters: 720,
    photographer: 'Youssef Benali',
    photographerHandle: '@youssef.dunes',
    photographerLocation: 'Marrakesh, Morocco',
    category: 'Desert',
    assetKey: 'sahara',
    aspectRatio: '4:3',
    forSale: true,
    basePriceInr: 4500,
    likes: 294,
    saves: 118,
    salesCount: 6,
    tags: ['Sahara', 'Morocco', 'Dunes', 'Minimalism', 'Desert'],
    exif: {
      camera: 'Leica SL2-S',
      lens: 'APO-Summicron-SL 75mm f/2',
      focalLength: '75 mm',
      aperture: 'f/9.5',
      shutterSpeed: '1/500 s',
      iso: 100,
      dimensions: '6000 × 4000 px',
      fileSizeMb: '28.9 MB',
      colorSpace: 'sRGB IEC61966-2.1',
      capturedAt: '2026-04-08T17:51:30+01:00',
      copyright: '© 2026 Youssef Benali / Terraframe Archive',
    },
    createdAt: '2026-04-11T12:00:00.000Z',
  },
  {
    id: 'tf-dolomites-08',
    title: 'Seceda Ridges Above Val Gardena',
    story:
      'Vertical study of the tilted Odle limestone spires where alpine wildflowers meet a thousand-meter sheer drop into cloud-filled valleys.',
    location: 'Seceda, Dolomites',
    country: 'Italy',
    region: 'Europe',
    lat: 46.6003,
    lng: 11.7244,
    elevationMeters: 2519,
    photographer: 'Clara Bellini',
    photographerHandle: '@clara.alpine',
    photographerLocation: 'Bolzano, Italy',
    category: 'Alpine',
    assetKey: 'dolomites',
    aspectRatio: '3:4',
    forSale: true,
    basePriceInr: 5100,
    likes: 367,
    saves: 159,
    salesCount: 10,
    tags: ['Dolomites', 'Italy', 'Alps', 'Seceda', 'Hiking'],
    exif: {
      camera: 'Phase One IQ4 150MP',
      lens: 'Schneider Kreuznach 55mm LS',
      focalLength: '55 mm',
      aperture: 'f/11',
      shutterSpeed: '1/200 s',
      iso: 50,
      dimensions: '10654 × 14204 px',
      fileSizeMb: '92.4 MB',
      colorSpace: 'ProPhoto RGB',
      capturedAt: '2026-07-19T08:42:10+02:00',
      copyright: '© 2026 Clara Bellini / Terraframe Archive',
    },
    createdAt: '2026-07-22T15:10:00.000Z',
  },
];

const INITIAL_PAYOUTS: StoredPayout[] = [
  {
    id: 'pay-9041',
    photographerHandle: '@aarav.frames',
    amountInr: 18450,
    destination: 'aarav.k@okicici',
    method: 'UPI Instant',
    status: 'settled',
    reference: 'UPI/628910443182',
    createdAt: '2026-10-28T10:15:00.000Z',
  },
  {
    id: 'pay-9042',
    photographerHandle: '@meeradesh',
    amountInr: 12240,
    destination: 'HDFC •••• 4821',
    method: 'NEFT Bank Transfer',
    status: 'settled',
    reference: 'NEFT/IN2610319822',
    createdAt: '2026-11-02T14:30:00.000Z',
  },
];

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    const initial: DatabaseSchema = {
      photos: SEED_PHOTOS,
      orders: [],
      payouts: INITIAL_PAYOUTS,
      pendingIntents: {},
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!Array.isArray(parsed.photos) || parsed.photos.length === 0) {
      parsed.photos = SEED_PHOTOS;
    }
    parsed.photos = parsed.photos.map((p) => {
      if (Array.isArray(p.comments)) return p;
      const seedMatch = SEED_PHOTOS.find((sp) => sp.id === p.id);
      return {...p, comments: seedMatch?.comments ?? []};
    });
    parsed.orders = parsed.orders || [];
    parsed.payouts = parsed.payouts || INITIAL_PAYOUTS;
    parsed.pendingIntents = parsed.pendingIntents || {};
    return parsed;
  } catch {
    const fallback: DatabaseSchema = {
      photos: SEED_PHOTOS,
      orders: [],
      payouts: INITIAL_PAYOUTS,
      pendingIntents: {},
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function saveDb(db: DatabaseSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function signIntentPayload(intent: Omit<PendingIntent, 'signature'>): string {
  const canonical = JSON.stringify({
    intentId: intent.intentId,
    currency: intent.currency,
    totalInr: intent.totalInr,
    totalDisplay: intent.totalDisplay,
    items: intent.items,
  });
  return crypto.createHmac('sha256', INTENT_SECRET).update(canonical).digest('hex');
}

async function startServer() {
  const app = express();
  app.use(express.json({limit: '25mb'}));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/config', (_req, res) => {
    const googleMapsApiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({
      googleMapsApiKey,
      supportedCurrencies: Object.keys(RATES_FROM_INR),
    });
  });

  app.get('/api/rates', (_req, res) => {
    res.json({
      base: 'INR',
      updatedAt: new Date().toISOString(),
      rates: RATES_FROM_INR,
    });
  });

  app.get('/api/photos', (_req, res) => {
    const db = loadDb();
    res.json({photos: db.photos});
  });

  app.post('/api/photos', (req, res) => {
    const body = req.body as {
      title?: string;
      story?: string;
      location?: string;
      country?: string;
      region?: StoredPhoto['region'];
      lat?: number;
      lng?: number;
      elevationMeters?: number;
      photographer?: string;
      photographerHandle?: string;
      photographerLocation?: string;
      category?: StoredPhoto['category'];
      forSale?: boolean;
      basePriceInr?: number;
      tags?: string[];
      aspectRatio?: StoredPhoto['aspectRatio'];
      imageDataUrl?: string;
      exif?: Partial<PhotoExif>;
    };

    if (!body.title?.trim() || !body.location?.trim() || !body.imageDataUrl) {
      res.status(400).json({error: 'Title, location, and image file are required.'});
      return;
    }

    const match = body.imageDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!match) {
      res.status(400).json({error: 'Unsupported image format. Upload JPEG, PNG, or WebP.'});
      return;
    }

    const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    const buffer = Buffer.from(match[2], 'base64');
    const id = `tf-up-${crypto.randomBytes(4).toString('hex')}`;
    const fileName = `${id}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer);

    const photographer = body.photographer?.trim() || 'Independent Traveller';
    const handle =
      body.photographerHandle?.trim() ||
      `@${photographer.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

    const newPhoto: StoredPhoto = {
      id,
      title: body.title.trim(),
      story:
        body.story?.trim() ||
        'Field photograph contributed directly to the Terraframe global atlas.',
      location: body.location.trim(),
      country: body.country?.trim() || 'India',
      region: body.region || 'India',
      lat: Number.isFinite(Number(body.lat)) ? Number(body.lat) : 28.6139,
      lng: Number.isFinite(Number(body.lng)) ? Number(body.lng) : 77.209,
      elevationMeters: body.elevationMeters ? Number(body.elevationMeters) : undefined,
      photographer,
      photographerHandle: handle,
      photographerLocation: body.photographerLocation?.trim() || body.country?.trim() || 'India',
      category: body.category || 'Heritage',
      imageUrl: `/uploads/${fileName}`,
      aspectRatio: body.aspectRatio || '4:3',
      forSale: Boolean(body.forSale),
      basePriceInr: body.forSale ? Math.max(500, Math.round(Number(body.basePriceInr) || 3500)) : 0,
      likes: 1,
      saves: 0,
      salesCount: 0,
      tags:
        Array.isArray(body.tags) && body.tags.length > 0
          ? body.tags
          : [body.country?.trim() || 'Travel', body.category || 'Editorial'],
      exif: {
        camera: body.exif?.camera || 'Digital Camera',
        lens: body.exif?.lens || 'Prime 35mm',
        focalLength: body.exif?.focalLength || '35 mm',
        aperture: body.exif?.aperture || 'f/5.6',
        shutterSpeed: body.exif?.shutterSpeed || '1/250 s',
        iso: Number(body.exif?.iso) || 100,
        dimensions: body.exif?.dimensions || '4096 × 3072 px',
        fileSizeMb: `${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB`,
        colorSpace: body.exif?.colorSpace || 'sRGB IEC61966-2.1',
        capturedAt: body.exif?.capturedAt || new Date().toISOString(),
        copyright: body.exif?.copyright || `© 2026 ${photographer} / Terraframe`,
      },
      createdAt: new Date().toISOString(),
      isUserUploaded: true,
    };

    const db = loadDb();
    db.photos.unshift(newPhoto);
    saveDb(db);

    res.status(201).json({photo: newPhoto});
  });

  app.post('/api/photos/:id/like', (req, res) => {
    const db = loadDb();
    const photo = db.photos.find((p) => p.id === req.params.id);
    if (!photo) {
      res.status(404).json({error: 'Photo not found.'});
      return;
    }
    const delta = req.body?.action === 'unlike' ? -1 : 1;
    photo.likes = Math.max(0, photo.likes + delta);
    saveDb(db);
    res.json({id: photo.id, likes: photo.likes});
  });

  app.post('/api/photos/:id/save', (req, res) => {
    const db = loadDb();
    const photo = db.photos.find((p) => p.id === req.params.id);
    if (!photo) {
      res.status(404).json({error: 'Photo not found.'});
      return;
    }
    const delta = req.body?.action === 'unsave' ? -1 : 1;
    photo.saves = Math.max(0, photo.saves + delta);
    saveDb(db);
    res.json({id: photo.id, saves: photo.saves});
  });

  app.post('/api/photos/:id/comments', (req, res) => {
    const db = loadDb();
    const photo = db.photos.find((p) => p.id === req.params.id);
    if (!photo) {
      res.status(404).json({error: 'Photo not found.'});
      return;
    }
    const author =
      typeof req.body?.author === 'string' && req.body.author.trim()
        ? req.body.author.trim().slice(0, 60)
        : 'Field Traveller';
    const text =
      typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 600) : '';
    if (!text) {
      res.status(400).json({error: 'Comment text is required.'});
      return;
    }

    const comment = {
      id: `cmt-${crypto.randomBytes(4).toString('hex')}`,
      author,
      text,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(photo.comments)) {
      photo.comments = [];
    }
    photo.comments.unshift(comment);
    saveDb(db);

    res.status(201).json({comment});
  });

  app.post('/api/checkout/create-intent', (req, res) => {
    const {items, currency, paymentMethod} = req.body as {
      items?: Array<{photoId: string; tier: LicenseTier; quantity: number}>;
      currency?: CurrencyCode;
      paymentMethod?: 'upi' | 'netbanking' | 'card_inr' | 'card_intl';
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({error: 'Cart is empty.'});
      return;
    }

    const db = loadDb();
    const resolvedCurrency: CurrencyCode =
      currency && RATES_FROM_INR[currency] ? currency : 'INR';
    const resolvedMethod = paymentMethod || (resolvedCurrency === 'INR' ? 'upi' : 'card_intl');

    let subtotalInr = 0;
    const verifiedItems: PendingIntent['items'] = [];

    for (const item of items) {
      const photo = db.photos.find((p) => p.id === item.photoId);
      if (!photo || !photo.forSale) {
        res.status(400).json({error: `Photo ${item.photoId} is not available for licensing.`});
        return;
      }
      const tierCfg = TIER_MULTIPLIERS[item.tier];
      if (!tierCfg) {
        res.status(400).json({error: 'Invalid license tier.'});
        return;
      }
      const qty = Math.max(1, Math.min(20, Math.round(Number(item.quantity) || 1)));
      const unitPriceInr = Math.round(photo.basePriceInr * tierCfg.multiplier);
      subtotalInr += unitPriceInr * qty;
      verifiedItems.push({
        photoId: photo.id,
        tier: item.tier,
        quantity: qty,
        unitPriceInr,
      });
    }

    // 18% GST applies to domestic INR payment rails; international exports are 0% zero-rated
    const isInrRail = resolvedMethod !== 'card_intl';
    const gstInr = isInrRail ? Math.round(subtotalInr * 0.18) : 0;
    const totalInr = subtotalInr + gstInr;
    const fxRateUsed = RATES_FROM_INR[resolvedCurrency];
    const totalDisplay = convertInr(totalInr, resolvedCurrency);

    const intentId = `pi_tf_${crypto.randomBytes(6).toString('hex')}`;
    const unsigned: Omit<PendingIntent, 'signature'> = {
      intentId,
      currency: resolvedCurrency,
      fxRateUsed,
      paymentMethod: resolvedMethod,
      subtotalInr,
      gstInr,
      totalInr,
      totalDisplay,
      items: verifiedItems,
      createdAt: Date.now(),
    };

    const signature = signIntentPayload(unsigned);
    const intent: PendingIntent = {...unsigned, signature};

    db.pendingIntents[intentId] = intent;
    saveDb(db);

    const upiUri = `upi://pay?pa=terraframe.escrow@icici&pn=Terraframe%20Atlas&tr=${intentId}&am=${totalInr.toFixed(
      2
    )}&cu=INR&tn=Fine%20Art%20License%20${intentId}`;

    res.json({
      intentId,
      signature,
      currency: resolvedCurrency,
      fxRateUsed,
      subtotalInr,
      gstInr,
      totalInr,
      totalDisplay,
      upiUri,
    });
  });

  app.post('/api/checkout/confirm', (req, res) => {
    const {
      intentId,
      signature,
      buyerName,
      buyerEmail,
      paymentMethod,
      upiId,
      bankName,
      cardLast4,
    } = req.body as {
      intentId?: string;
      signature?: string;
      buyerName?: string;
      buyerEmail?: string;
      paymentMethod?: 'upi' | 'netbanking' | 'card_inr' | 'card_intl';
      upiId?: string;
      bankName?: string;
      cardLast4?: string;
    };

    if (!intentId || !signature || !buyerName?.trim() || !buyerEmail?.trim()) {
      res.status(400).json({error: 'Missing payment verification details or buyer contact.'});
      return;
    }

    const db = loadDb();
    const intent = db.pendingIntents[intentId];
    if (!intent) {
      res.status(404).json({error: 'Payment session expired or not found.'});
      return;
    }

    const expectedSig = signIntentPayload({
      intentId: intent.intentId,
      currency: intent.currency,
      fxRateUsed: intent.fxRateUsed,
      paymentMethod: intent.paymentMethod,
      subtotalInr: intent.subtotalInr,
      gstInr: intent.gstInr,
      totalInr: intent.totalInr,
      totalDisplay: intent.totalDisplay,
      items: intent.items,
      createdAt: intent.createdAt,
    });

    if (signature !== expectedSig) {
      res.status(403).json({error: 'Payment signature verification failed.'});
      return;
    }

    const method = paymentMethod || intent.paymentMethod;
    let paymentReference = `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    if (method === 'upi') {
      paymentReference = `UPI/${upiId || 'verified@upi'}/${crypto
        .randomInt(100000, 999999)
        .toString()}`;
    } else if (method === 'netbanking') {
      paymentReference = `NB/${(bankName || 'HDFC').toUpperCase()}/${crypto
        .randomInt(100000, 999999)
        .toString()}`;
    } else {
      paymentReference = `CARD/****${cardLast4 || '4242'}/${crypto
        .randomInt(100000, 999999)
        .toString()}`;
    }

    const orderId = `TF-${new Date().getFullYear()}-${crypto
      .randomInt(10000, 99999)
      .toString()}`;

    const orderItems: OrderItemReceipt[] = intent.items.map((item) => {
      const photo = db.photos.find((p) => p.id === item.photoId);
      if (photo) {
        photo.salesCount += item.quantity;
      }
      const tierCfg = TIER_MULTIPLIERS[item.tier];
      return {
        photoId: item.photoId,
        title: photo?.title || 'Licensed Photograph',
        photographer: photo?.photographer || 'Terraframe Contributor',
        tier: item.tier,
        tierLabel: tierCfg.label,
        quantity: item.quantity,
        unitPriceInr: item.unitPriceInr,
        unitPriceDisplay: convertInr(item.unitPriceInr, intent.currency),
        downloadUrl: photo?.imageUrl || '',
        licenseCode: `LIC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      };
    });

    const order: StoredOrder = {
      orderId,
      paymentMethod: method,
      paymentReference,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim(),
      currency: intent.currency,
      fxRateUsed: intent.fxRateUsed,
      subtotalInr: intent.subtotalInr,
      gstInr: intent.gstInr,
      totalInr: intent.totalInr,
      totalDisplay: intent.totalDisplay,
      items: orderItems,
      status: 'paid',
      createdAt: new Date().toISOString(),
    };

    db.orders.unshift(order);
    delete db.pendingIntents[intentId];
    saveDb(db);

    res.json({order});
  });

  app.get('/api/orders', (_req, res) => {
    const db = loadDb();
    res.json({orders: db.orders});
  });

  app.get('/api/payouts', (_req, res) => {
    const db = loadDb();
    // Calculate photographer gross & 85% net share across all catalog sales + new orders
    const baseGrossFromOrders = db.orders.reduce((sum, o) => sum + o.subtotalInr, 0);
    const catalogGrossInr = db.photos.reduce(
      (sum, p) => sum + (p.forSale ? p.basePriceInr * p.salesCount : 0),
      0
    );
    const grossRevenueInr = Math.max(catalogGrossInr, baseGrossFromOrders);
    const netCreatorShareInr = Math.round(grossRevenueInr * 0.85);
    const totalWithdrawnInr = db.payouts.reduce((sum, p) => sum + p.amountInr, 0);
    const availableBalanceInr = Math.max(0, netCreatorShareInr - totalWithdrawnInr);

    res.json({
      summary: {
        grossRevenueInr,
        platformFeeInr: grossRevenueInr - netCreatorShareInr,
        netCreatorShareInr,
        totalWithdrawnInr,
        availableBalanceInr,
      },
      payouts: db.payouts,
    });
  });

  app.post('/api/payouts/withdraw', (req, res) => {
    const {amountInr, destination, method, photographerHandle} = req.body as {
      amountInr?: number;
      destination?: string;
      method?: 'UPI Instant' | 'NEFT Bank Transfer';
      photographerHandle?: string;
    };

    const amount = Math.round(Number(amountInr) || 0);
    if (amount < 500 || !destination?.trim()) {
      res
        .status(400)
        .json({error: 'Minimum withdrawal is ₹500 and a valid UPI ID or bank account is required.'});
      return;
    }

    const db = loadDb();
    const payout: StoredPayout = {
      id: `pay-${crypto.randomInt(1000, 9999)}`,
      photographerHandle: photographerHandle?.trim() || '@terraframe.creator',
      amountInr: amount,
      destination: destination.trim(),
      method: method || 'UPI Instant',
      status: 'settled',
      reference:
        method === 'NEFT Bank Transfer'
          ? `NEFT/IN${crypto.randomInt(10000000, 99999999)}`
          : `UPI/${crypto.randomInt(100000000000, 999999999999)}`,
      createdAt: new Date().toISOString(),
    };

    db.payouts.unshift(payout);
    saveDb(db);

    res.status(201).json({payout});
  });

  if (process.env.NODE_ENV !== 'production') {
    const {createServer} = await import('vite');
    const vite = await createServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Terraframe server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Terraframe server:', err);
  process.exit(1);
});
