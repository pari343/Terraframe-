import React from 'react';
import {
  Bookmark,
  Heart,
  MapPin,
  Share2,
  ShoppingBag,
} from 'lucide-react';
import {resolvePhotoUrl} from '../data/seedAssets';
import {CurrencyCode, TravelPhoto} from '../types/photography';
import {formatConvertedFromInr} from '../utils/currency';

interface GalleryGridProps {
  photos: TravelPhoto[];
  selectedPhotoId: string | null;
  likedIds: string[];
  savedIds: string[];
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onInspect: (photo: TravelPhoto) => void;
  onLocateOnMap: (photo: TravelPhoto) => void;
  onToggleLike: (photo: TravelPhoto) => void;
  onToggleSave: (photo: TravelPhoto) => void;
  onShare: (photo: TravelPhoto) => void;
  onQuickAddCart: (photo: TravelPhoto) => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  photos,
  selectedPhotoId,
  likedIds,
  savedIds,
  currency,
  rates,
  onInspect,
  onLocateOnMap,
  onToggleLike,
  onToggleSave,
  onShare,
  onQuickAddCart,
}) => {
  if (photos.length === 0) {
    return (
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 py-16 px-6 text-center">
        <p className="font-serif text-xl text-white">
          No frames match your current filter.
        </p>
        <p className="text-sm text-zinc-400 mt-1.5">
          Try clearing the search query or switching to All Regions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {photos.map((photo) => {
        const isSelected = selectedPhotoId === photo.id;
        const isLiked = likedIds.includes(photo.id);
        const isSaved = savedIds.includes(photo.id);

        return (
          <article
            key={photo.id}
            id={`photo-card-${photo.id}`}
            className={`group bg-zinc-950 rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col ${
              isSelected
                ? 'border-white ring-1 ring-white/30'
                : 'border-zinc-800 hover:-translate-y-0.5 hover:border-zinc-600'
            }`}
          >
            <div className="relative aspect-[4/3] bg-black overflow-hidden">
              <button
                type="button"
                onClick={() => onInspect(photo)}
                className="w-full h-full block cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                aria-label={`Inspect ${photo.title}`}
              >
                <img
                  src={resolvePhotoUrl(photo)}
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              </button>

              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onLocateOnMap(photo)}
                  title="Locate on Atlas"
                  aria-label={`Locate ${photo.title} on map`}
                  className="w-9 h-9 rounded-lg bg-black/80 backdrop-blur-sm text-white border border-white/15 hover:bg-white hover:text-black transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSave(photo)}
                  title={isSaved ? 'Remove from Portfolio' : 'Save to Portfolio'}
                  aria-label={
                    isSaved
                      ? `Remove ${photo.title} from portfolio`
                      : `Save ${photo.title} to portfolio`
                  }
                  className={`w-9 h-9 rounded-lg backdrop-blur-sm border transition-colors flex items-center justify-center shadow-sm cursor-pointer ${
                    isSaved
                      ? 'bg-white border-white text-black'
                      : 'bg-black/80 border-white/15 text-white hover:bg-white hover:text-black'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`}
                  />
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5 truncate">
                  <span className="font-medium text-zinc-200 truncate">
                    {photo.location}, {photo.country}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums shrink-0">
                    {photo.exif.focalLength}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">{photo.category}</span>
                </div>

                <h3 className="font-serif text-lg font-semibold text-white leading-snug">
                  <button
                    type="button"
                    onClick={() => onInspect(photo)}
                    className="text-left hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {photo.title}
                  </button>
                </h3>

                <p className="text-xs text-zinc-400 mt-1">
                  By {photo.photographer} · {photo.exif.camera}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleLike(photo)}
                    aria-label={`Like ${photo.title}`}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium min-h-[36px] px-1.5 rounded transition-colors cursor-pointer ${
                      isLiked
                        ? 'text-rose-400'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
                    />
                    <span className="tabular-nums font-mono">{photo.likes}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onShare(photo)}
                    aria-label={`Share ${photo.title}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white min-h-[36px] px-1.5 rounded transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                </div>

                {photo.forSale ? (
                  <button
                    type="button"
                    onClick={() => onQuickAddCart(photo)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-white hover:border-white text-white hover:text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="tabular-nums font-mono">
                      {formatConvertedFromInr(photo.basePriceInr, currency, rates)}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onInspect(photo)}
                    className="text-xs font-medium text-zinc-400 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    View Metadata
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
