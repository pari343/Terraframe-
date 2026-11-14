import React, {useEffect, useState} from 'react';
import {
  Bookmark,
  Camera,
  Check,
  Download,
  Heart,
  MapPin,
  MessageSquare,
  Send,
  Share2,
  ShoppingBag,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {resolvePhotoUrl} from '../data/seedAssets';
import {CurrencyCode, LicenseTier, TravelPhoto} from '../types/photography';
import {
  formatConvertedFromInr,
  getTierPriceInr,
  LICENSE_TIERS,
} from '../utils/currency';
import {
  exportPhotoAsXMP,
  exportPhotosAsCSV,
  exportPhotosAsJSON,
} from '../utils/metadataExport';

interface PhotoLightboxModalProps {
  photo: TravelPhoto | null;
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  isLiked: boolean;
  isSaved: boolean;
  onClose: () => void;
  onToggleLike: (photo: TravelPhoto) => void;
  onToggleSave: (photo: TravelPhoto) => void;
  onLocateOnMap: (photo: TravelPhoto) => void;
  onShare: (photo: TravelPhoto) => void;
  onAddToCart: (photo: TravelPhoto, tier: LicenseTier) => void;
  onInstantBuy: (photo: TravelPhoto, tier: LicenseTier) => void;
  onAddComment: (photoId: string, author: string, text: string) => Promise<void>;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  photo,
  currency,
  rates,
  isLiked,
  isSaved,
  onClose,
  onToggleLike,
  onToggleSave,
  onLocateOnMap,
  onShare,
  onAddToCart,
  onInstantBuy,
  onAddComment,
}) => {
  const [selectedTier, setSelectedTier] = useState<LicenseTier>('editorial');
  const [zoomed, setZoomed] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('Ananya Kaushik');
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    setZoomed(false);
    setSelectedTier('editorial');
    setExportedFormat(null);
    setCommentError(null);
  }, [photo?.id]);

  useEffect(() => {
    if (!photo) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photo, onClose]);

  if (!photo) return null;

  const tierPriceInr = getTierPriceInr(photo.basePriceInr, selectedTier);

  const handleExport = (format: 'json' | 'csv' | 'xmp') => {
    const slug = photo.id;
    if (format === 'json') {
      exportPhotosAsJSON([photo], currency, rates, `${slug}-metadata`);
    } else if (format === 'csv') {
      exportPhotosAsCSV([photo], currency, rates, `${slug}-metadata`);
    } else {
      exportPhotoAsXMP(photo);
    }
    setExportedFormat(format.toUpperCase());
    window.setTimeout(() => setExportedFormat(null), 2200);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) {
      setCommentError('Please enter feedback before posting.');
      return;
    }
    setCommentError(null);
    setCommentText('');
    try {
      await onAddComment(photo.id, commentAuthor.trim() || 'Field Traveller', trimmed);
    } catch (err) {
      setCommentText(trimmed);
      setCommentError(
        err instanceof Error ? err.message : 'Unable to save comment.'
      );
    }
  };

  const comments = photo.comments ?? [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
    >
      <div className="relative w-full max-w-[1240px] bg-black text-white rounded-2xl border border-zinc-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lightbox"
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-lg bg-black/80 text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center cursor-pointer border border-zinc-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: High-Resolution Frame */}
        <div className="lg:col-span-7 bg-black relative flex items-center justify-center min-h-[320px] lg:min-h-[600px] overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800">
          <img
            src={resolvePhotoUrl(photo)}
            alt={photo.title}
            referrerPolicy="no-referrer"
            onClick={() => setZoomed((z) => !z)}
            className={`max-h-[78vh] w-auto object-contain transition-transform duration-300 cursor-zoom-in ${
              zoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'
            }`}
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-xs font-mono text-white/85 tabular-nums">
              {photo.exif.dimensions} · {photo.exif.fileSizeMb} · {photo.exif.colorSpace}
            </span>
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              className="pointer-events-auto w-9 h-9 rounded-lg bg-black/75 text-white hover:bg-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
              aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
            >
              {zoomed ? (
                <ZoomOut className="w-4 h-4" />
              ) : (
                <ZoomIn className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Right: Metadata, Export, Licensing & Comments Panel */}
        <div className="lg:col-span-5 p-6 sm:p-7 overflow-y-auto space-y-6 bg-black">
          <div>
            <p className="text-xs font-mono text-zinc-400 tabular-nums">
              {photo.location}, {photo.country} · {photo.lat.toFixed(4)}°,{' '}
              {photo.lng.toFixed(4)}°
              {photo.elevationMeters ? ` · ${photo.elevationMeters}m` : ''}
            </p>
            <h2 className="font-serif text-2xl font-semibold text-white mt-1.5 leading-tight pr-8">
              {photo.title}
            </h2>
            <p className="text-sm text-zinc-300 mt-1">
              {photo.photographer} ({photo.photographerHandle}) ·{' '}
              {photo.photographerLocation}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed mt-3">
              {photo.story}
            </p>
          </div>

          {/* Interactive Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => onToggleLike(photo)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="tabular-nums font-mono">{photo.likes}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(photo)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-white border-white text-black'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved in Portfolio' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLocateOnMap(photo);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>View on Atlas</span>
            </button>

            <button
              type="button"
              onClick={() => onShare(photo)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>

          {/* Optical EXIF Telemetry */}
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white inline-flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-zinc-300" />
                Camera &amp; Optical EXIF
              </span>
              <span className="text-[11px] font-mono text-white/55">
                {new Date(photo.exif.capturedAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <dt className="text-white/50">Body</dt>
                <dd className="text-white font-medium mt-0.5">{photo.exif.camera}</dd>
              </div>
              <div>
                <dt className="text-white/50">Lens</dt>
                <dd className="text-white font-medium mt-0.5 truncate" title={photo.exif.lens}>
                  {photo.exif.lens}
                </dd>
              </div>
              <div>
                <dt className="text-white/50">Exposure</dt>
                <dd className="text-white font-mono tabular-nums mt-0.5">
                  {photo.exif.focalLength} · {photo.exif.aperture} · {photo.exif.shutterSpeed}
                </dd>
              </div>
              <div>
                <dt className="text-white/50">Sensitivity</dt>
                <dd className="text-white font-mono tabular-nums mt-0.5">
                  ISO {photo.exif.iso}
                </dd>
              </div>
            </dl>

            {/* Export Metadata Bar */}
            <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-zinc-400">Export Metadata</span>
              <div className="flex items-center gap-1.5">
                {(['json', 'csv', 'xmp'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleExport(fmt)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-white hover:text-black text-[11px] font-mono uppercase text-white transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>{fmt}</span>
                  </button>
                ))}
              </div>
            </div>
            {exportedFormat && (
              <p className="text-[11px] text-emerald-400 mt-1.5 inline-flex items-center gap-1">
                <Check className="w-3 h-3" />
                Downloaded {exportedFormat} portfolio metadata sidecar.
              </p>
            )}
          </div>

          {/* Contiguous Purchase Module */}
          {photo.forSale ? (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Acquire License or Fine-Art Print
                </span>
                <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
                  {photo.salesCount} licensed
                </span>
              </div>

              <div className="space-y-2">
                {(Object.keys(LICENSE_TIERS) as LicenseTier[]).map((tierKey) => {
                  const tier = LICENSE_TIERS[tierKey];
                  const priceInr = getTierPriceInr(photo.basePriceInr, tierKey);
                  const active = selectedTier === tierKey;
                  return (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() => setSelectedTier(tierKey)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        active
                          ? 'bg-zinc-900 border-white'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">
                          {tier.label}
                        </span>
                        <span className="text-xs font-mono font-semibold text-white tabular-nums">
                          {formatConvertedFromInr(priceInr, currency, rates)}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {tier.deliverable}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
                <span>INR Base Settlement</span>
                <span className="font-mono tabular-nums text-white">
                  ₹{tierPriceInr.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onAddToCart(photo, selectedTier)}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Bag</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInstantBuy(photo, selectedTier)}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Pay {formatConvertedFromInr(tierPriceInr, currency, rates)}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-400">
                Published under Editorial Atlas Showcase. Metadata export is open for
                research &amp; attribution.
              </p>
            </div>
          )}

          {/* Field Notes & Comments Section */}
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white inline-flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
                Field Feedback ({comments.length})
              </span>
            </div>

            <form onSubmit={handleCommentSubmit} className="space-y-2">
              {commentError && (
                <p className="text-[11px] text-rose-400">{commentError}</p>
              )}
              <input
                type="text"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="Your name"
                aria-label="Your name"
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave feedback on composition, light, or print..."
                  aria-label="Write a comment"
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </div>
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-zinc-500 py-1">
                No feedback yet. Share the first critique on this frame.
              </p>
            ) : (
              <ul className="space-y-2.5 pt-1">
                {comments.map((cmt) => (
                  <li
                    key={cmt.id}
                    className={`p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1 ${
                      cmt.pending ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-white">
                        {cmt.author}
                      </span>
                      <span className="font-mono text-zinc-500 tabular-nums">
                        {cmt.pending
                          ? 'Posting...'
                          : new Date(cmt.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {cmt.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
