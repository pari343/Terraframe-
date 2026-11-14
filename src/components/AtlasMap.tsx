/// <reference types="google.maps" />
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {Compass, LocateFixed, Maximize2, Search, X} from 'lucide-react';
import {resolvePhotoUrl} from '../data/seedAssets';
import {CurrencyCode, TravelPhoto} from '../types/photography';
import {formatConvertedFromInr} from '../utils/currency';

interface AtlasMapProps {
  apiKey: string;
  photos: TravelPhoto[];
  selectedPhotoId: string | null;
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onSelectPhoto: (photo: TravelPhoto) => void;
  onInspectPhoto: (photo: TravelPhoto) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const Z_INDEX_SELECTED = 1000;
const Z_INDEX_HOVER = 999;

interface MarkerWithPhotoProps {
  photo: TravelPhoto;
  isSelected: boolean;
  isHovered: boolean;
  zIndex: number;
  onHover: (id: string | null) => void;
  onMarkerClick: (
    photo: TravelPhoto,
    marker: google.maps.marker.AdvancedMarkerElement
  ) => void;
}

const PhotoAdvancedMarker: React.FC<MarkerWithPhotoProps> = ({
  photo,
  isSelected,
  isHovered,
  zIndex,
  onHover,
  onMarkerClick,
}) => {
  const [markerInstance, setMarkerInstance] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const refCallback = useCallback(
    (m: google.maps.marker.AdvancedMarkerElement | null) => {
      setMarkerInstance(m);
    },
    []
  );

  return (
    <AdvancedMarker
      ref={refCallback}
      position={{lat: photo.lat, lng: photo.lng}}
      zIndex={zIndex}
      title={`${photo.title} — ${photo.location}`}
      onMouseEnter={() => onHover(photo.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => {
        if (markerInstance) {
          onMarkerClick(photo, markerInstance);
        }
      }}
    >
      <div
        className={`relative rounded-lg overflow-hidden bg-white p-0.5 shadow-md transition-transform duration-150 cursor-pointer ${
          isSelected
            ? 'ring-2 ring-black scale-115 shadow-xl'
            : isHovered
            ? 'ring-2 ring-zinc-700 scale-110'
            : 'ring-1 ring-black/30 hover:scale-105'
        }`}
      >
        <img
          src={resolvePhotoUrl(photo)}
          alt={photo.title}
          referrerPolicy="no-referrer"
          className="w-11 h-8 object-cover rounded-[6px] block"
        />
      </div>
    </AdvancedMarker>
  );
};

interface PlacesSearchBarProps {
  onPlaceFlyTo: (location: {lat: number; lng: number; label: string}) => void;
}

const PlacesSearchControl: React.FC<PlacesSearchBarProps> = ({
  onPlaceFlyTo,
}) => {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib || !query.trim()) {
      setSuggestions([]);
      return;
    }

    const {AutocompleteSessionToken, AutocompleteSuggestion} = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current ?? undefined,
        });
        if (!cancelled) {
          setSuggestions(res.suggestions.slice(0, 5));
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, query]);

  const handleSelect = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      if (place.location) {
        onPlaceFlyTo({
          lat: place.location.lat(),
          lng: place.location.lng(),
          label: place.formattedAddress || place.displayName || query,
        });
      }
    } catch {
      // Ignore transient fetch errors
    } finally {
      sessionTokenRef.current = null;
      setSuggestions([]);
      setQuery('');
    }
  };

  return (
    <div className="relative w-full max-w-xs">
      <div className="relative flex items-center bg-black/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-sm">
        <Search className="w-4 h-4 text-zinc-400 ml-3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Fly to destination..."
          aria-label="Search destination on map"
          className="w-full bg-transparent px-2.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
            }}
            aria-label="Clear destination search"
            className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-lg shadow-lg overflow-hidden z-30">
          {suggestions.map((s, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900 border-b last:border-b-0 border-zinc-800 cursor-pointer"
              >
                {s.placePrediction?.text.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface InnerGoogleMapProps {
  photos: TravelPhoto[];
  selectedPhotoId: string | null;
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onSelectPhoto: (photo: TravelPhoto) => void;
  onInspectPhoto: (photo: TravelPhoto) => void;
  onMapFailed: () => void;
}

const InnerGoogleMap: React.FC<InnerGoogleMapProps> = ({
  photos,
  selectedPhotoId,
  currency,
  rates,
  onSelectPhoto,
  onInspectPhoto,
  onMapFailed,
}) => {
  const map = useMap();
  const status = useApiLoadingStatus();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeMarker, setActiveMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [infoPhoto, setInfoPhoto] = useState<TravelPhoto | null>(null);

  useEffect(() => {
    if (
      status === APILoadingStatus.FAILED ||
      status === APILoadingStatus.AUTH_FAILURE
    ) {
      onMapFailed();
    }
  }, [status, onMapFailed]);

  const sortedPhotos = useMemo(() => {
    return [...photos]
      .sort((a, b) => b.lat - a.lat)
      .map((item, idx) => ({item, baseZ: idx}));
  }, [photos]);

  useEffect(() => {
    if (!map || !selectedPhotoId) return;
    const target = photos.find((p) => p.id === selectedPhotoId);
    if (target) {
      map.panTo({lat: target.lat, lng: target.lng});
      const currentZoom = map.getZoom() ?? 3;
      if (currentZoom < 6) {
        map.setZoom(6);
      }
      setInfoPhoto(target);
    }
  }, [map, selectedPhotoId, photos]);

  const handleMarkerClick = useCallback(
    (
      photo: TravelPhoto,
      marker: google.maps.marker.AdvancedMarkerElement
    ) => {
      onSelectPhoto(photo);
      setActiveMarker(marker);
      setInfoPhoto(photo);
      if (map) {
        map.panTo({lat: photo.lat, lng: photo.lng});
      }
    },
    [map, onSelectPhoto]
  );

  const handleFlyTo = useCallback(
    (loc: {lat: number; lng: number}) => {
      if (map) {
        map.panTo({lat: loc.lat, lng: loc.lng});
        map.setZoom(7);
      }
    },
    [map]
  );

  const handleResetWorld = useCallback(() => {
    if (map) {
      map.panTo({lat: 26, lng: 35});
      map.setZoom(2.5);
    }
    setInfoPhoto(null);
  }, [map]);

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={{lat: 26, lng: 35}}
        defaultZoom={2.5}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{width: '100%', height: '100%'}}
      >
        {sortedPhotos.map(({item, baseZ}) => {
          const isSelected = selectedPhotoId === item.id;
          const isHovered = hoveredId === item.id;
          let zIndex = baseZ;
          if (isHovered) zIndex = Z_INDEX_HOVER;
          if (isSelected) zIndex = Z_INDEX_SELECTED;

          return (
            <PhotoAdvancedMarker
              key={item.id}
              photo={item}
              isSelected={isSelected}
              isHovered={isHovered}
              zIndex={zIndex}
              onHover={setHoveredId}
              onMarkerClick={handleMarkerClick}
            />
          );
        })}

        {infoPhoto && activeMarker && (
          <InfoWindow
            anchor={activeMarker}
            pixelOffset={[0, -6]}
            onCloseClick={() => setInfoPhoto(null)}
          >
            <div className="w-56 p-1 font-sans">
              <img
                src={resolvePhotoUrl(infoPhoto)}
                alt={infoPhoto.title}
                referrerPolicy="no-referrer"
                className="w-full h-28 object-cover rounded-md mb-2"
              />
              <p className="text-[11px] font-mono text-[#525866] tabular-nums">
                {infoPhoto.location}, {infoPhoto.country}
              </p>
              <h4 className="text-sm font-semibold text-[#111214] leading-snug mt-0.5">
                {infoPhoto.title}
              </h4>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E5E7EB]">
                <span className="text-xs font-mono font-medium text-[#111214] tabular-nums">
                  {infoPhoto.forSale
                    ? formatConvertedFromInr(infoPhoto.basePriceInr, currency, rates)
                    : 'Editorial Showcase'}
                </span>
                <button
                  type="button"
                  onClick={() => onInspectPhoto(infoPhoto)}
                  className="text-xs font-semibold text-black hover:underline cursor-pointer"
                >
                  Inspect Frame
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="absolute top-3 left-3 right-14 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <PlacesSearchControl onPlaceFlyTo={handleFlyTo} />
        </div>
        <button
          type="button"
          onClick={handleResetWorld}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/90 backdrop-blur-md border border-zinc-800 text-xs font-medium text-white shadow-sm hover:bg-zinc-900 cursor-pointer whitespace-nowrap shrink-0"
        >
          <LocateFixed className="w-3.5 h-3.5 text-white" />
          <span>World View</span>
        </button>
      </div>
    </div>
  );
};

// Interactive coordinate fallback atlas when Google Maps API key is unavailable or fails
const CoordinateFallbackAtlas: React.FC<{
  photos: TravelPhoto[];
  selectedPhotoId: string | null;
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onSelectPhoto: (photo: TravelPhoto) => void;
  onInspectPhoto: (photo: TravelPhoto) => void;
}> = ({
  photos,
  selectedPhotoId,
  currency,
  rates,
  onSelectPhoto,
  onInspectPhoto,
}) => {
  const selected = photos.find((p) => p.id === selectedPhotoId) || photos[0];

  const projectPoint = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return {x, y};
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full object-cover opacity-35"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="graticule"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="#334155"
              strokeWidth="0.7"
            />
          </pattern>
        </defs>
        <rect width="1000" height="500" fill="url(#graticule)" />
        <line x1="0" y1="250" x2="1000" y2="250" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="500" y1="0" x2="500" y2="500" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
        {/* Stylized continental landmass silhouettes */}
        <path
          d="M110,95 L230,85 L270,150 L235,215 L180,220 L145,165 Z M230,245 L310,260 L325,355 L275,445 L245,440 L235,320 Z M455,85 L575,75 L610,140 L560,185 L465,175 Z M470,195 L570,195 L605,295 L545,405 L495,380 L455,275 Z M585,95 L810,90 L865,180 L785,260 L665,265 L615,205 Z M765,305 L875,310 L890,395 L795,405 Z"
          fill="#1E293B"
          stroke="#475569"
          strokeWidth="1.2"
        />
      </svg>

      {photos.map((photo) => {
        const {x, y} = projectPoint(photo.lat, photo.lng);
        const isActive = selected?.id === photo.id;
        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => onSelectPhoto(photo)}
            style={{left: `${x}%`, top: `${y}%`}}
            title={`${photo.title} (${photo.location})`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden bg-white p-0.5 shadow-lg transition-transform cursor-pointer ${
              isActive
                ? 'z-20 ring-2 ring-white scale-125'
                : 'z-10 ring-1 ring-white/40 hover:scale-110'
            }`}
          >
            <img
              src={resolvePhotoUrl(photo)}
              alt={photo.title}
              referrerPolicy="no-referrer"
              className="w-10 h-7 object-cover rounded-[5px] block"
            />
          </button>
        );
      })}

      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-md border border-zinc-800 text-xs text-white/90 flex items-center gap-2">
        <Compass className="w-3.5 h-3.5 text-white" />
        <span>Interactive Coordinate Atlas · {photos.length} geotagged pins</span>
      </div>

      {selected && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-zinc-950 rounded-xl p-3 shadow-xl border border-zinc-800 flex items-center gap-3">
          <img
            src={resolvePhotoUrl(selected)}
            alt={selected.title}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-lg object-cover shrink-0 border border-zinc-800"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-mono text-zinc-400 truncate tabular-nums">
              {selected.lat.toFixed(2)}°, {selected.lng.toFixed(2)}° · {selected.location}
            </p>
            <p className="text-sm font-semibold text-white truncate mt-0.5">
              {selected.title}
            </p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs font-mono font-medium text-white tabular-nums">
                {selected.forSale
                  ? formatConvertedFromInr(selected.basePriceInr, currency, rates)
                  : 'Editorial'}
              </span>
              <button
                type="button"
                onClick={() => onInspectPhoto(selected)}
                className="text-xs font-semibold text-white hover:underline cursor-pointer"
              >
                Inspect Frame
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AtlasMap: React.FC<AtlasMapProps> = ({
  apiKey,
  photos,
  selectedPhotoId,
  currency,
  rates,
  onSelectPhoto,
  onInspectPhoto,
  isExpanded,
  onToggleExpand,
}) => {
  const [mapFailed, setMapFailed] = useState(false);

  const showGoogleMap = Boolean(apiKey) && !mapFailed;

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-zinc-800 bg-black ${
        isExpanded ? 'h-[620px]' : 'h-[440px] lg:h-[520px]'
      }`}
    >
      {showGoogleMap ? (
        <APIProvider
          apiKey={apiKey}
          libraries={['marker', 'places']}
          language="en"
          region="IN"
        >
          <InnerGoogleMap
            photos={photos}
            selectedPhotoId={selectedPhotoId}
            currency={currency}
            rates={rates}
            onSelectPhoto={onSelectPhoto}
            onInspectPhoto={onInspectPhoto}
            onMapFailed={() => setMapFailed(true)}
          />
        </APIProvider>
      ) : (
        <CoordinateFallbackAtlas
          photos={photos}
          selectedPhotoId={selectedPhotoId}
          currency={currency}
          rates={rates}
          onSelectPhoto={onSelectPhoto}
          onInspectPhoto={onInspectPhoto}
        />
      )}

      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={isExpanded ? 'Collapse map height' : 'Expand map height'}
        className="absolute top-3 right-3 z-20 w-9 h-9 rounded-lg bg-black/90 backdrop-blur-md border border-zinc-800 shadow-sm flex items-center justify-center text-white hover:bg-zinc-900 cursor-pointer"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
};
