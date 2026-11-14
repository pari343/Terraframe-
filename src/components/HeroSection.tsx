import React from 'react';
import {ArrowDownRight, Compass, Upload} from 'lucide-react';
import {TravelPhoto} from '../types/photography';
import {resolvePhotoUrl} from '../data/seedAssets';
import {CurrencyCode} from '../types/photography';
import {formatConvertedFromInr} from '../utils/currency';

interface HeroSectionProps {
  featuredPhoto: TravelPhoto | undefined;
  totalPhotos: number;
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onExploreAtlas: () => void;
  onOpenUpload: () => void;
  onInspectFeatured: (photo: TravelPhoto) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredPhoto,
  totalPhotos,
  currency,
  rates,
  onExploreAtlas,
  onOpenUpload,
  onInspectFeatured,
}) => {
  return (
    <section id="top" className="bg-black border-b border-zinc-800">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium text-zinc-400 tracking-wide mb-4">
                Geotagged Travel Archive · EXIF &amp; XMP Ready · Global Print Licensing
              </p>
              <h1 className="font-serif text-[clamp(2.25rem,3.6vw,3.4rem)] leading-[1.08] font-semibold tracking-tight text-white mb-5">
                Field photography mapped to exact coordinates.
              </h1>
              <p className="text-base leading-relaxed text-zinc-400 max-w-xl mb-8">
                Discover high-resolution expeditions across an interactive world atlas,
                publish your own geotagged frames with automatic EXIF extraction, export
                Lightroom-ready metadata, and license archival prints in Indian Rupees or
                eight international currencies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreAtlas}
                className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Live Atlas</span>
              </button>
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-950 text-white text-sm font-semibold hover:border-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Upload className="w-4 h-4" />
                <span>Publish &amp; Sell Work</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 flex">
            {featuredPhoto && (
              <button
                type="button"
                onClick={() => onInspectFeatured(featuredPhoto)}
                className="group relative w-full min-h-[300px] lg:h-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <img
                  src={resolvePhotoUrl(featuredPhoto)}
                  alt={featuredPhoto.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover aspect-video lg:aspect-auto transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
                  <div>
                    <p className="text-xs text-zinc-300 font-mono tabular-nums mb-1.5">
                      {featuredPhoto.location}, {featuredPhoto.country} ·{' '}
                      {featuredPhoto.lat.toFixed(4)}° N, {featuredPhoto.lng.toFixed(4)}° E
                    </p>
                    <h2 className="font-serif text-xl sm:text-2xl font-medium text-white">
                      {featuredPhoto.title}
                    </h2>
                    <p className="text-xs text-zinc-300 mt-1">
                      By {featuredPhoto.photographer} · {featuredPhoto.exif.camera} ·{' '}
                      {featuredPhoto.exif.focalLength}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-mono tabular-nums font-medium text-white">
                      From{' '}
                      {formatConvertedFromInr(
                        featuredPhoto.basePriceInr,
                        currency,
                        rates
                      )}
                    </span>
                    <span className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                      <ArrowDownRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-zinc-800 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-semibold text-white tabular-nums">
              {totalPhotos} Frames
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Geotagged works with full EXIF &amp; XMP export
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white tabular-nums">
              INR + 8 FX
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              UPI, NetBanking &amp; international multi-currency cards
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white tabular-nums">
              85% Royalty
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Net creator payout settled via instant UPI or NEFT
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white tabular-nums">
              3 Formats
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              JSON, CSV catalog &amp; Adobe Lightroom .XMP sidecars
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
