import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Check,
  Download,
  Globe,
  Search,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import {AtlasMap} from './components/AtlasMap';
import {CheckoutModal} from './components/CheckoutModal';
import {CreatorStudioSection} from './components/CreatorStudioSection';
import {GalleryGrid} from './components/GalleryGrid';
import {ActiveSection, Header} from './components/Header';
import {HeroSection} from './components/HeroSection';
import {PhotoLightboxModal} from './components/PhotoLightboxModal';
import {PortfolioSection} from './components/PortfolioSection';
import {UploadPhotoModal} from './components/UploadPhotoModal';
import {
  CartItem,
  CurrencyCode,
  LicenseTier,
  OrderRecord,
  PayoutRecord,
  PhotoComment,
  RegionFilter,
  TravelPhoto,
} from './types/photography';
import {CURRENCIES, DEFAULT_RATES_FROM_INR} from './utils/currency';
import {exportPhotosAsCSV, exportPhotosAsJSON} from './utils/metadataExport';

const REGIONS: RegionFilter[] = [
  'All',
  'India',
  'Asia',
  'Europe',
  'Americas',
  'Africa',
];

export default function App() {
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(
    DEFAULT_RATES_FROM_INR
  );

  const [activeSection, setActiveSection] = useState<ActiveSection>('atlas');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('All');
  const [onlyForSale, setOnlyForSale] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<TravelPhoto | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tf_liked_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tf_saved_ids') || '[]');
    } catch {
      return [];
    }
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tf_cart') || '[]');
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [payoutSummary, setPayoutSummary] = useState({
    grossRevenueInr: 0,
    platformFeeInr: 0,
    netCreatorShareInr: 0,
    totalWithdrawnInr: 0,
    availableBalanceInr: 0,
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  const refreshMarketplaceData = useCallback(async () => {
    try {
      const [ordersRes, payoutsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/payouts'),
      ]);
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.orders || []);
      }
      if (payoutsRes.ok) {
        const pData = await payoutsRes.json();
        if (pData.summary) setPayoutSummary(pData.summary);
        if (pData.payouts) setPayouts(pData.payouts);
      }
    } catch {
      // Non-blocking background sync
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [cfgRes, ratesRes, photosRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/rates'),
          fetch('/api/photos'),
        ]);

        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (cfg.googleMapsApiKey) {
            setGoogleMapsApiKey(cfg.googleMapsApiKey);
          }
        }
        if (ratesRes.ok) {
          const rData = await ratesRes.json();
          if (rData.rates) setRates(rData.rates);
        }
        if (photosRes.ok) {
          const pData = await photosRes.json();
          const loaded: TravelPhoto[] = pData.photos || [];
          setPhotos(loaded);
          if (loaded.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const sharedId = params.get('photo');
            const match = sharedId
              ? loaded.find((p) => p.id === sharedId)
              : undefined;
            if (match) {
              setSelectedPhotoId(match.id);
              setLightboxPhoto(match);
            } else {
              setSelectedPhotoId(loaded[0].id);
            }
          }
        }
      } finally {
        setLoadingPhotos(false);
      }
    };

    loadAll();
    refreshMarketplaceData();
  }, [refreshMarketplaceData]);

  useEffect(() => {
    localStorage.setItem('tf_liked_ids', JSON.stringify(likedIds));
  }, [likedIds]);

  useEffect(() => {
    localStorage.setItem('tf_saved_ids', JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    localStorage.setItem('tf_cart', JSON.stringify(cart));
  }, [cart]);

  const filteredPhotos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return photos.filter((photo) => {
      if (regionFilter !== 'All' && photo.region !== regionFilter) {
        return false;
      }
      if (onlyForSale && !photo.forSale) {
        return false;
      }
      if (!q) return true;
      return (
        photo.title.toLowerCase().includes(q) ||
        photo.location.toLowerCase().includes(q) ||
        photo.country.toLowerCase().includes(q) ||
        photo.photographer.toLowerCase().includes(q) ||
        photo.exif.camera.toLowerCase().includes(q) ||
        photo.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [photos, regionFilter, onlyForSale, searchQuery]);

  const savedPhotos = useMemo(
    () => photos.filter((p) => savedIds.includes(p.id)),
    [photos, savedIds]
  );

  const handleNavigate = (section: ActiveSection) => {
    setActiveSection(section);
    if (section === 'marketplace') {
      setOnlyForSale(true);
      document
        .getElementById('gallery-section')
        ?.scrollIntoView({behavior: 'smooth'});
    } else if (section === 'gallery') {
      setOnlyForSale(false);
      document
        .getElementById('gallery-section')
        ?.scrollIntoView({behavior: 'smooth'});
    } else if (section === 'atlas') {
      document
        .getElementById('atlas-section')
        ?.scrollIntoView({behavior: 'smooth'});
    } else if (section === 'portfolio') {
      document
        .getElementById('portfolio')
        ?.scrollIntoView({behavior: 'smooth'});
    } else if (section === 'studio') {
      document
        .getElementById('studio')
        ?.scrollIntoView({behavior: 'smooth'});
    }
  };

  const handleToggleLike = async (photo: TravelPhoto) => {
    const currentlyLiked = likedIds.includes(photo.id);
    const action = currentlyLiked ? 'unlike' : 'like';
    setLikedIds((prev) =>
      currentlyLiked ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]
    );
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photo.id
          ? {...p, likes: Math.max(0, p.likes + (currentlyLiked ? -1 : 1))}
          : p
      )
    );
    setLightboxPhoto((prev) =>
      prev && prev.id === photo.id
        ? {...prev, likes: Math.max(0, prev.likes + (currentlyLiked ? -1 : 1))}
        : prev
    );

    try {
      await fetch(`/api/photos/${photo.id}/like`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action}),
      });
    } catch {
      // Optimistic state retained
    }
  };

  const handleToggleSave = async (photo: TravelPhoto) => {
    const currentlySaved = savedIds.includes(photo.id);
    const action = currentlySaved ? 'unsave' : 'save';
    setSavedIds((prev) =>
      currentlySaved ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]
    );
    showToast(
      currentlySaved
        ? `Removed "${photo.title}" from Portfolio`
        : `Saved "${photo.title}" to Portfolio`
    );

    try {
      await fetch(`/api/photos/${photo.id}/save`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action}),
      });
    } catch {
      // Optimistic state retained
    }
  };

  const handleShare = async (photo: TravelPhoto) => {
    const shareUrl = `${window.location.origin}/?photo=${encodeURIComponent(
      photo.id
    )}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${photo.title} — Terraframe`,
          text: `${photo.location}, ${photo.country} by ${photo.photographer}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share unsupported in iframe -> fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Shareable frame link copied to clipboard');
    } catch {
      showToast(`Link ready: ?photo=${photo.id}`);
    }
  };

  const handleAddToCart = (photo: TravelPhoto, tier: LicenseTier = 'editorial') => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.photoId === photo.id && item.tier === tier
      );
      if (existing) {
        return prev.map((item) =>
          item.photoId === photo.id && item.tier === tier
            ? {...item, quantity: item.quantity + 1}
            : item
        );
      }
      return [...prev, {photoId: photo.id, tier, quantity: 1}];
    });
    showToast(`Added "${photo.title}" to Licensing Bag`);
  };

  const handleInstantBuy = (photo: TravelPhoto, tier: LicenseTier) => {
    handleAddToCart(photo, tier);
    setLightboxPhoto(null);
    setIsCheckoutOpen(true);
  };

  const handleUpdateCartQty = (
    photoId: string,
    tier: LicenseTier,
    delta: number
  ) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.photoId === photoId && item.tier === tier
            ? {...item, quantity: item.quantity + delta}
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (photoId: string, tier: LicenseTier) => {
    setCart((prev) =>
      prev.filter((item) => !(item.photoId === photoId && item.tier === tier))
    );
  };

  const handleLocateOnMap = (photo: TravelPhoto) => {
    setSelectedPhotoId(photo.id);
    document
      .getElementById('atlas-section')
      ?.scrollIntoView({behavior: 'smooth'});
  };

  const handleUploadedPhoto = (photo: TravelPhoto) => {
    setPhotos((prev) => [photo, ...prev]);
    setSelectedPhotoId(photo.id);
    setRegionFilter('All');
    setOnlyForSale(false);
    showToast(`Published "${photo.title}" to the live Atlas`);
  };

  const handleAddComment = async (
    photoId: string,
    author: string,
    text: string
  ) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: PhotoComment = {
      id: tempId,
      author,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    const prependOptimistic = (list?: PhotoComment[]) => [
      optimisticComment,
      ...(list ?? []),
    ];

    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId ? {...p, comments: prependOptimistic(p.comments)} : p
      )
    );
    setLightboxPhoto((prev) =>
      prev && prev.id === photoId
        ? {...prev, comments: prependOptimistic(prev.comments)}
        : prev
    );

    try {
      const res = await fetch(
        `/api/photos/${encodeURIComponent(photoId)}/comments`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({author, text}),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.comment) {
        throw new Error(data.error || 'Unable to post feedback.');
      }

      const confirmed = data.comment as PhotoComment;
      const replaceTemp = (list?: PhotoComment[]) =>
        (list ?? []).map((c) => (c.id === tempId ? confirmed : c));

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? {...p, comments: replaceTemp(p.comments)} : p
        )
      );
      setLightboxPhoto((prev) =>
        prev && prev.id === photoId
          ? {...prev, comments: replaceTemp(prev.comments)}
          : prev
      );
      showToast('Feedback posted');
    } catch (err) {
      const rollbackTemp = (list?: PhotoComment[]) =>
        (list ?? []).filter((c) => c.id !== tempId);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? {...p, comments: rollbackTemp(p.comments)} : p
        )
      );
      setLightboxPhoto((prev) =>
        prev && prev.id === photoId
          ? {...prev, comments: rollbackTemp(prev.comments)}
          : prev
      );
      throw err instanceof Error ? err : new Error('Unable to save comment.');
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {quotaExceeded && (
        <div className="bg-amber-950/90 border-b border-amber-800 text-amber-200 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-white hover:text-amber-100"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      <main className="flex-1">
        <HeroSection
          featuredPhoto={photos[0]}
          totalPhotos={photos.length}
          currency={currency}
          rates={rates}
          onExploreAtlas={() => handleNavigate('atlas')}
          onOpenUpload={() => setIsUploadOpen(true)}
          onInspectFeatured={(p) => setLightboxPhoto(p)}
        />

        {/* Workspace Toolbar: Region Filter, Search, Currency FX Converter, Metadata Export, Bag */}
        <section
          id="atlas-section"
          className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6"
        >
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {REGIONS.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setRegionFilter(region)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      regionFilter === region
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {region}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setOnlyForSale((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ml-1 ${
                    onlyForSale
                      ? 'bg-white border-white text-black'
                      : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Licensable Only</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Place, camera, or tag..."
                    aria-label="Filter gallery and map"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
                  />
                </div>

                {/* Live Multi-Currency Converter */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-black">
                  <Globe className="w-3.5 h-3.5 text-zinc-300" />
                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value as CurrencyCode)
                    }
                    aria-label="Select display currency"
                    className="text-xs font-mono font-medium bg-black text-white focus:outline-none cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-black text-white">
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Export Catalog */}
                <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-black overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      exportPhotosAsJSON(filteredPhotos, currency, rates)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-white hover:bg-zinc-900 border-r border-zinc-800 cursor-pointer whitespace-nowrap"
                    title="Export visible frames metadata as JSON"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportPhotosAsCSV(filteredPhotos, currency, rates)
                    }
                    className="px-2.5 py-2 text-xs font-medium text-white hover:bg-zinc-900 cursor-pointer whitespace-nowrap"
                    title="Export visible frames catalog as CSV"
                  >
                    CSV
                  </button>
                </div>

                {/* Licensing Bag Button */}
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-mono">
                    Bag ({cartCount})
                  </span>
                </button>
              </div>
            </div>

            {currency !== 'INR' && (
              <p className="text-[11px] font-mono text-zinc-400 tabular-nums">
                Multi-Currency FX active: 1 INR = {rates[currency]} {currency}{' '}
                · Payments settle seamlessly in INR or {currency} at checkout.
              </p>
            )}
          </div>

          {/* Interactive World Map */}
          <div className="mt-6">
            <AtlasMap
              apiKey={googleMapsApiKey}
              photos={filteredPhotos}
              selectedPhotoId={selectedPhotoId}
              currency={currency}
              rates={rates}
              onSelectPhoto={(photo) => setSelectedPhotoId(photo.id)}
              onInspectPhoto={(photo) => setLightboxPhoto(photo)}
              isExpanded={isMapExpanded}
              onToggleExpand={() => setIsMapExpanded((v) => !v)}
            />
          </div>
        </section>

        {/* Curated Gallery & Print Marketplace */}
        <section
          id="gallery-section"
          className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-14"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <p className="text-xs font-medium text-zinc-400">
                {onlyForSale
                  ? 'Commercial & Archival Print Catalog'
                  : 'Curated Field Expedition Frames'}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white mt-1">
                {regionFilter === 'All'
                  ? 'Global Travel Gallery'
                  : `${regionFilter} Collection`}
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-400 tabular-nums">
              Showing {filteredPhotos.length} of {photos.length} frames
            </p>
          </div>

          {loadingPhotos ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="bg-zinc-950 rounded-2xl border border-zinc-800 h-80 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <GalleryGrid
              photos={filteredPhotos}
              selectedPhotoId={selectedPhotoId}
              likedIds={likedIds}
              savedIds={savedIds}
              currency={currency}
              rates={rates}
              onInspect={(photo) => setLightboxPhoto(photo)}
              onLocateOnMap={handleLocateOnMap}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onShare={handleShare}
              onQuickAddCart={(photo) => {
                handleAddToCart(photo, 'editorial');
                setIsCheckoutOpen(true);
              }}
            />
          )}
        </section>

        <PortfolioSection
          savedPhotos={savedPhotos}
          orders={orders}
          currency={currency}
          rates={rates}
          onInspectPhoto={(photo) => setLightboxPhoto(photo)}
          onRemoveSaved={handleToggleSave}
        />

        <CreatorStudioSection
          summary={payoutSummary}
          payouts={payouts}
          currency={currency}
          rates={rates}
          onWithdrawSuccess={refreshMarketplaceData}
          onOpenUpload={() => setIsUploadOpen(true)}
        />
      </main>

      <footer className="bg-black border-t border-zinc-800 py-8">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 Terraframe Atlas &amp; Print Archive. All photographer copyrights preserved.</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigate('atlas')}
              className="hover:text-white cursor-pointer"
            >
              Interactive Atlas
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('portfolio')}
              className="hover:text-white cursor-pointer"
            >
              EXIF &amp; XMP Export
            </button>
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="hover:text-white cursor-pointer"
            >
              INR &amp; FX Checkout
            </button>
          </div>
        </div>
      </footer>

      <PhotoLightboxModal
        photo={lightboxPhoto}
        currency={currency}
        rates={rates}
        isLiked={lightboxPhoto ? likedIds.includes(lightboxPhoto.id) : false}
        isSaved={lightboxPhoto ? savedIds.includes(lightboxPhoto.id) : false}
        onClose={() => setLightboxPhoto(null)}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onLocateOnMap={handleLocateOnMap}
        onShare={handleShare}
        onAddToCart={handleAddToCart}
        onInstantBuy={handleInstantBuy}
        onAddComment={handleAddComment}
      />

      <UploadPhotoModal
        isOpen={isUploadOpen}
        currency={currency}
        rates={rates}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={handleUploadedPhoto}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        cart={cart}
        photos={photos}
        currency={currency}
        rates={rates}
        onChangeCurrency={setCurrency}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onOrderComplete={() => {
          refreshMarketplaceData();
          showToast('Payment verified & master downloads unlocked');
        }}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-zinc-700"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
