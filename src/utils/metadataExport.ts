import {CurrencyCode, OrderRecord, TravelPhoto} from '../types/photography';
import {convertFromInr, formatCurrency} from './currency';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number | boolean | undefined): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXml(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportPhotosAsJSON(
  photos: TravelPhoto[],
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number>,
  filenamePrefix = 'terraframe-portfolio-metadata'
) {
  const payload = {
    schema: 'https://terraframe.atlas/schemas/portfolio-metadata-v1.json',
    exportedAt: new Date().toISOString(),
    displayCurrency: currency,
    totalFrames: photos.length,
    frames: photos.map((p) => ({
      id: p.id,
      title: p.title,
      photographer: p.photographer,
      handle: p.photographerHandle,
      location: {
        place: p.location,
        country: p.country,
        region: p.region,
        latitude: p.lat,
        longitude: p.lng,
        elevationMeters: p.elevationMeters ?? null,
      },
      exif: p.exif,
      iptc: {
        headline: p.title,
        caption: p.story,
        keywords: p.tags,
        category: p.category,
        copyrightNotice: p.exif.copyright,
      },
      licensing: {
        forSale: p.forSale,
        basePriceInr: p.basePriceInr,
        convertedPrice: p.forSale
          ? {
              currency,
              amount: convertFromInr(p.basePriceInr, currency, rates),
            }
          : null,
      },
    })),
  };

  triggerDownload(
    `${filenamePrefix}.json`,
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8'
  );
}

export function exportPhotosAsCSV(
  photos: TravelPhoto[],
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number>,
  filenamePrefix = 'terraframe-portfolio-catalog'
) {
  const headers = [
    'ID',
    'Title',
    'Photographer',
    'Handle',
    'Location',
    'Country',
    'Region',
    'Latitude',
    'Longitude',
    'Elevation (m)',
    'Camera',
    'Lens',
    'Focal Length',
    'Aperture',
    'Shutter Speed',
    'ISO',
    'Dimensions',
    'Captured At',
    'For Sale',
    'Base Price (INR)',
    `Converted Price (${currency})`,
    'Copyright',
    'Tags',
  ];

  const rows = photos.map((p) => [
    p.id,
    p.title,
    p.photographer,
    p.photographerHandle,
    p.location,
    p.country,
    p.region,
    p.lat.toFixed(6),
    p.lng.toFixed(6),
    p.elevationMeters ?? '',
    p.exif.camera,
    p.exif.lens,
    p.exif.focalLength,
    p.exif.aperture,
    p.exif.shutterSpeed,
    p.exif.iso,
    p.exif.dimensions,
    p.exif.capturedAt,
    p.forSale ? 'Yes' : 'Showcase Only',
    p.forSale ? p.basePriceInr : 0,
    p.forSale ? convertFromInr(p.basePriceInr, currency, rates) : 0,
    p.exif.copyright,
    p.tags.join('; '),
  ]);

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  triggerDownload(`${filenamePrefix}.csv`, csv, 'text/csv;charset=utf-8');
}

export function exportPhotoAsXMP(photo: TravelPhoto) {
  const safeSlug = photo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Terraframe Portfolio Metadata Exporter">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:aux="http://ns.adobe.com/exif/1.0/aux/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(photo.title)}</rdf:li>
    </rdf:Alt>
   </dc:title>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(photo.story)}</rdf:li>
    </rdf:Alt>
   </dc:description>
   <dc:creator>
    <rdf:Seq>
     <rdf:li>${escapeXml(photo.photographer)}</rdf:li>
    </rdf:Seq>
   </dc:creator>
   <dc:rights>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(photo.exif.copyright)}</rdf:li>
    </rdf:Alt>
   </dc:rights>
   <dc:subject>
    <rdf:Bag>
${photo.tags.map((t) => `     <rdf:li>${escapeXml(t)}</rdf:li>`).join('\n')}
    </rdf:Bag>
   </dc:subject>
   <tiff:Model>${escapeXml(photo.exif.camera)}</tiff:Model>
   <aux:Lens>${escapeXml(photo.exif.lens)}</aux:Lens>
   <exif:FocalLength>${escapeXml(photo.exif.focalLength)}</exif:FocalLength>
   <exif:FNumber>${escapeXml(photo.exif.aperture)}</exif:FNumber>
   <exif:ExposureTime>${escapeXml(photo.exif.shutterSpeed)}</exif:ExposureTime>
   <exif:ISOSpeedRatings>
    <rdf:Seq>
     <rdf:li>${escapeXml(photo.exif.iso)}</rdf:li>
    </rdf:Seq>
   </exif:ISOSpeedRatings>
   <exif:DateTimeOriginal>${escapeXml(photo.exif.capturedAt)}</exif:DateTimeOriginal>
   <exif:GPSLatitude>${escapeXml(photo.lat.toFixed(6))}</exif:GPSLatitude>
   <exif:GPSLongitude>${escapeXml(photo.lng.toFixed(6))}</exif:GPSLongitude>
   <photoshop:City>${escapeXml(photo.location)}</photoshop:City>
   <photoshop:Country>${escapeXml(photo.country)}</photoshop:Country>
   <Iptc4xmpCore:Location>${escapeXml(photo.location)}</Iptc4xmpCore:Location>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  triggerDownload(
    `${safeSlug || photo.id}.xmp`,
    xmp,
    'application/rdf+xml;charset=utf-8'
  );
}

export function exportLicenseInvoice(order: OrderRecord) {
  const lines = [
    '====================================================================',
    'TERRAFRAME FINE-ART & EDITORIAL LICENSING — TAX INVOICE & CERTIFICATE',
    '====================================================================',
    `Order ID:           ${order.orderId}`,
    `Issued At:          ${new Date(order.createdAt).toUTCString()}`,
    `Payment Rail:       ${order.paymentMethod.toUpperCase()}`,
    `Gateway Reference:  ${order.paymentReference}`,
    `Buyer:              ${order.buyerName} <${order.buyerEmail}>`,
    `Settlement:         INR ${order.totalInr.toLocaleString('en-IN')} (FX 1 INR = ${order.fxRateUsed} ${order.currency})`,
    `Charged Total:      ${formatCurrency(order.totalDisplay, order.currency)}`,
    '--------------------------------------------------------------------',
    'LICENSED WORKS:',
    ...order.items.map(
      (item, idx) =>
        `${idx + 1}. ${item.title} (${item.photographer})\n` +
        `   Tier: ${item.tierLabel} | Qty: ${item.quantity}\n` +
        `   License Key: ${item.licenseCode}\n` +
        `   Amount: ${formatCurrency(item.unitPriceDisplay * item.quantity, order.currency)} (INR ${
          item.unitPriceInr * item.quantity
        })`
    ),
    '--------------------------------------------------------------------',
    `Subtotal (INR):     ₹${order.subtotalInr.toLocaleString('en-IN')}`,
    `GST (18% HSN 9973): ₹${order.gstInr.toLocaleString('en-IN')}`,
    `Total Paid (INR):   ₹${order.totalInr.toLocaleString('en-IN')}`,
    '====================================================================',
    '85% net creator royalty credited directly to the photographer.',
  ].join('\n');

  triggerDownload(
    `terraframe-license-${order.orderId}.txt`,
    lines,
    'text/plain;charset=utf-8'
  );
}
