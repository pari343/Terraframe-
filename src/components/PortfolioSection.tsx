import React from 'react';
import {
  Bookmark,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Trash2,
} from 'lucide-react';
import {resolvePhotoUrl} from '../data/seedAssets';
import {CurrencyCode, OrderRecord, TravelPhoto} from '../types/photography';
import {formatCurrency} from '../utils/currency';
import {
  exportLicenseInvoice,
  exportPhotoAsXMP,
  exportPhotosAsCSV,
  exportPhotosAsJSON,
} from '../utils/metadataExport';

interface PortfolioSectionProps {
  savedPhotos: TravelPhoto[];
  orders: OrderRecord[];
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onInspectPhoto: (photo: TravelPhoto) => void;
  onRemoveSaved: (photo: TravelPhoto) => void;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  savedPhotos,
  orders,
  currency,
  rates,
  onInspectPhoto,
  onRemoveSaved,
}) => {
  return (
    <section
      id="portfolio"
      className="py-12 border-t border-zinc-800 bg-black"
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-zinc-400">
              Curated Lightbox &amp; Metadata Exporter
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white mt-1">
              Saved Portfolio &amp; Licensed Archive
            </h2>
          </div>

          {savedPhotos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportPhotosAsJSON(
                    savedPhotos,
                    currency,
                    rates,
                    'terraframe-saved-portfolio'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-700 hover:border-white text-xs font-semibold text-white bg-zinc-950 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-300" />
                <span>Export Saved JSON</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportPhotosAsCSV(
                    savedPhotos,
                    currency,
                    rates,
                    'terraframe-saved-catalog'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-700 hover:border-white text-xs font-semibold text-white bg-zinc-950 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-300" />
                <span>Export CSV Catalog</span>
              </button>
            </div>
          )}
        </div>

        {savedPhotos.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <Bookmark className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">
              No saved frames in your portfolio yet
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Bookmark any photograph from the Atlas or Gallery to curate shots and batch-export EXIF/XMP metadata.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex gap-4 items-start"
              >
                <button
                  type="button"
                  onClick={() => onInspectPhoto(photo)}
                  className="w-24 h-20 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                >
                  <img
                    src={resolvePhotoUrl(photo)}
                    alt={photo.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {photo.title}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {photo.location} · {photo.exif.camera}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500 tabular-nums mt-1">
                    {photo.lat.toFixed(3)}°, {photo.lng.toFixed(3)}° · ISO{' '}
                    {photo.exif.iso}
                  </p>
                  <div className="flex items-center gap-3 mt-2.5">
                    <button
                      type="button"
                      onClick={() => exportPhotoAsXMP(photo)}
                      className="text-[11px] font-mono font-semibold text-white hover:underline cursor-pointer"
                    >
                      .XMP Sidecar
                    </button>
                    <button
                      type="button"
                      onClick={() => onInspectPhoto(photo)}
                      className="text-[11px] font-medium text-zinc-400 hover:text-white inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSaved(photo)}
                      aria-label={`Remove ${photo.title}`}
                      className="ml-auto text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {orders.length > 0 && (
          <div className="mt-10 pt-8 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-4">
              Verified Purchase Receipts &amp; Active Licenses ({orders.length})
            </h3>
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.orderId}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Order {order.orderId} · {order.items.length} licensed frame(s)
                    </p>
                    <p className="text-xs font-mono text-zinc-400 tabular-nums mt-0.5">
                      {order.paymentReference} ·{' '}
                      {formatCurrency(order.totalDisplay, order.currency)} (₹
                      {order.totalInr.toLocaleString('en-IN')})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportLicenseInvoice(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-white text-xs font-semibold text-white cursor-pointer shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Invoice &amp; Certificate</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
