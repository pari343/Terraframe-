import React, {useState} from 'react';
import exifr from 'exifr';
import {Check, MapPin, Upload, X} from 'lucide-react';
import {CurrencyCode, TravelPhoto} from '../types/photography';
import {formatConvertedFromInr} from '../utils/currency';

interface UploadPhotoModalProps {
  isOpen: boolean;
  currency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  onClose: () => void;
  onUploaded: (photo: TravelPhoto) => void;
}

const LOCATION_PRESETS: Array<{
  label: string;
  location: string;
  country: string;
  region: TravelPhoto['region'];
  lat: number;
  lng: number;
}> = [
  {
    label: 'Spiti Valley, India',
    location: 'Kaza, Spiti Valley',
    country: 'India',
    region: 'India',
    lat: 32.2276,
    lng: 78.0706,
  },
  {
    label: 'Jaipur, India',
    location: 'Amer Fort, Jaipur',
    country: 'India',
    region: 'India',
    lat: 26.9855,
    lng: 75.8513,
  },
  {
    label: 'Munnar, India',
    location: 'Munnar Tea Highlands',
    country: 'India',
    region: 'India',
    lat: 10.0889,
    lng: 77.0595,
  },
  {
    label: 'Reykjavik, Iceland',
    location: 'Kirkjufell, Snæfellsnes',
    country: 'Iceland',
    region: 'Europe',
    lat: 64.9417,
    lng: -23.3069,
  },
  {
    label: 'Banff, Canada',
    location: 'Moraine Lake, Alberta',
    country: 'Canada',
    region: 'Americas',
    lat: 51.3217,
    lng: -116.186,
  },
];

export const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({
  isOpen,
  currency,
  rates,
  onClose,
  onUploaded,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [exifDetected, setExifDetected] = useState(false);

  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [location, setLocation] = useState('Kaza, Spiti Valley');
  const [country, setCountry] = useState('India');
  const [region, setRegion] = useState<TravelPhoto['region']>('India');
  const [category, setCategory] = useState<TravelPhoto['category']>('Alpine');
  const [lat, setLat] = useState('32.2276');
  const [lng, setLng] = useState('78.0706');
  const [photographer, setPhotographer] = useState('');
  const [forSale, setForSale] = useState(true);
  const [basePriceInr, setBasePriceInr] = useState('4500');
  const [tagsInput, setTagsInput] = useState('Himalayas, Expedition, High-Res');

  const [camera, setCamera] = useState('Sony A7 IV');
  const [lens, setLens] = useState('FE 35mm f/1.4 GM');
  const [focalLength, setFocalLength] = useState('35 mm');
  const [aperture, setAperture] = useState('f/5.6');
  const [shutterSpeed, setShutterSpeed] = useState('1/250 s');
  const [iso, setIso] = useState('100');
  const [dimensions, setDimensions] = useState('6000 × 4000 px');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setExifDetected(false);

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setImageDataUrl(result);
      const img = new Image();
      img.onload = () => {
        setDimensions(`${img.naturalWidth} × ${img.naturalHeight} px`);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);

    try {
      const parsed = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
      });
      if (parsed) {
        let foundAny = false;
        if (parsed.Make || parsed.Model) {
          setCamera(`${parsed.Make ? `${parsed.Make} ` : ''}${parsed.Model || ''}`.trim());
          foundAny = true;
        }
        if (parsed.LensModel) {
          setLens(String(parsed.LensModel));
          foundAny = true;
        }
        if (parsed.FocalLength) {
          setFocalLength(`${Math.round(Number(parsed.FocalLength))} mm`);
          foundAny = true;
        }
        if (parsed.FNumber) {
          setAperture(`f/${Number(parsed.FNumber).toFixed(1).replace(/\.0$/, '')}`);
          foundAny = true;
        }
        if (parsed.ExposureTime) {
          const t = Number(parsed.ExposureTime);
          setShutterSpeed(t < 1 ? `1/${Math.round(1 / t)} s` : `${t} s`);
          foundAny = true;
        }
        if (parsed.ISO) {
          setIso(String(parsed.ISO));
          foundAny = true;
        }
        if (
          typeof parsed.latitude === 'number' &&
          typeof parsed.longitude === 'number'
        ) {
          setLat(parsed.latitude.toFixed(4));
          setLng(parsed.longitude.toFixed(4));
          foundAny = true;
        }
        setExifDetected(foundAny);
      }
    } catch {
      // Non-EXIF images (PNG/WebP) fall back to manual fields cleanly
    }
  };

  const applyPreset = (preset: (typeof LOCATION_PRESETS)[number]) => {
    setLocation(preset.location);
    setCountry(preset.country);
    setRegion(preset.region);
    setLat(preset.lat.toFixed(4));
    setLng(preset.lng.toFixed(4));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageDataUrl) {
      setError('Please select a high-resolution photograph to upload.');
      return;
    }
    if (!title.trim() || !location.trim()) {
      setError('Please enter a frame title and location.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title: title.trim(),
          story: story.trim(),
          location: location.trim(),
          country: country.trim(),
          region,
          category,
          lat: Number(lat),
          lng: Number(lng),
          photographer: photographer.trim() || 'Traveller Contributor',
          forSale,
          basePriceInr: Number(basePriceInr) || 3500,
          tags: tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          imageDataUrl,
          exif: {
            camera,
            lens,
            focalLength,
            aperture,
            shutterSpeed,
            iso: Number(iso) || 100,
            dimensions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed.');
      }

      onUploaded(data.photo as TravelPhoto);
      setImageDataUrl('');
      setFileName('');
      setTitle('');
      setStory('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload photo.');
    } finally {
      setSubmitting(false);
    }
  };

  const priceNum = Number(basePriceInr) || 0;
  const creatorNetInr = Math.round(priceNum * 0.85);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Upload High-Resolution Travel Photo"
    >
      <div className="w-full max-w-3xl bg-black text-white rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-white">
              Publish High-Resolution Travel Frame
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automatic EXIF &amp; GPS extraction · Earn 85% royalty in INR
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload modal"
            className="w-9 h-9 rounded-lg hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200 font-medium">
              {error}
            </div>
          )}

          {/* File Dropzone */}
          <div>
            <label className="block border-2 border-dashed border-zinc-700 hover:border-white rounded-xl p-5 text-center cursor-pointer transition-colors bg-zinc-950">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
              {imageDataUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                  <img
                    src={imageDataUrl}
                    alt="Upload preview"
                    className="w-32 h-24 object-cover rounded-lg border border-zinc-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">
                      {fileName}
                    </p>
                    <p className="text-xs font-mono text-zinc-400 mt-1 tabular-nums">
                      {dimensions}
                    </p>
                    {exifDetected ? (
                      <p className="text-xs text-emerald-400 mt-1.5 inline-flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        EXIF camera &amp; coordinate metadata extracted automatically
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 mt-1">
                        Click to replace file or refine EXIF details below
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-3">
                  <Upload className="w-6 h-6 text-white mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">
                    Select high-resolution JPEG, PNG, or WebP
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Camera EXIF, lens specs, and GPS coordinates are parsed automatically
                  </p>
                </div>
              )}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Photograph Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dusk at Key Monastery"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Photographer Name
              </label>
              <input
                type="text"
                value={photographer}
                onChange={(e) => setPhotographer(e.target.value)}
                placeholder="e.g. Ananya Kaushik"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-200 mb-1">
              Field Story / Notes
            </label>
            <textarea
              rows={2}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Describe the light, elevation, and moment behind the frame..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
            />
          </div>

          {/* Geotagging & Presets */}
          <div className="pt-3 border-t border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold text-white inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                Atlas Coordinates &amp; Region
              </span>
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Country</label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Region</label>
                <select
                  value={region}
                  onChange={(e) =>
                    setRegion(e.target.value as TravelPhoto['region'])
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-800 bg-zinc-950 text-white focus:border-white focus:outline-none"
                >
                  <option value="India">India</option>
                  <option value="Asia">Asia</option>
                  <option value="Europe">Europe</option>
                  <option value="Americas">Americas</option>
                  <option value="Africa">Africa</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Genre</label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as TravelPhoto['category'])
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-800 bg-zinc-950 text-white focus:border-white focus:outline-none"
                >
                  <option value="Alpine">Alpine</option>
                  <option value="Heritage">Heritage</option>
                  <option value="Coastal">Coastal</option>
                  <option value="Desert">Desert</option>
                  <option value="Forest">Forest</option>
                  <option value="Urban">Urban</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] text-zinc-400 mb-1">Tags</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* EXIF Details */}
          <div className="pt-3 border-t border-zinc-800">
            <p className="text-xs font-semibold text-white mb-2">
              EXIF Optical Metadata
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={camera}
                onChange={(e) => setCamera(e.target.value)}
                placeholder="Camera Body"
                aria-label="Camera Body"
                className="px-2.5 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
              <input
                type="text"
                value={lens}
                onChange={(e) => setLens(e.target.value)}
                placeholder="Lens"
                aria-label="Lens"
                className="px-2.5 py-1.5 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
              <input
                type="text"
                value={focalLength}
                onChange={(e) => setFocalLength(e.target.value)}
                placeholder="Focal Length"
                aria-label="Focal Length"
                className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
              <input
                type="text"
                value={aperture}
                onChange={(e) => setAperture(e.target.value)}
                placeholder="Aperture"
                aria-label="Aperture"
                className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
              <input
                type="text"
                value={shutterSpeed}
                onChange={(e) => setShutterSpeed(e.target.value)}
                placeholder="Shutter Speed"
                aria-label="Shutter Speed"
                className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
              <input
                type="number"
                value={iso}
                onChange={(e) => setIso(e.target.value)}
                placeholder="ISO"
                aria-label="ISO"
                className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
              />
            </div>
          </div>

          {/* Marketplace Pricing */}
          <div className="pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-white">
                  Marketplace Licensing &amp; Print Sales
                </p>
                <p className="text-[11px] text-zinc-400">
                  Set your Editorial base price in Indian Rupees (INR); international FX updates automatically.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={forSale}
                  onChange={(e) => setForSale(e.target.checked)}
                  className="w-4 h-4 accent-white"
                />
                <span>List for Sale</span>
              </label>
            </div>

            {forSale && (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Editorial Base Price (INR ₹)
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={100}
                    value={basePriceInr}
                    onChange={(e) => setBasePriceInr(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums rounded-lg border border-zinc-700 bg-black text-white focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400">
                    Buyer View ({currency})
                  </p>
                  <p className="text-sm font-mono font-semibold text-white tabular-nums mt-0.5">
                    {formatConvertedFromInr(priceNum, currency, rates)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400">Your 85% Net Payout</p>
                  <p className="text-sm font-mono font-semibold text-emerald-400 tabular-nums mt-0.5">
                    ₹{creatorNetInr.toLocaleString('en-IN')} / sale
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-zinc-700 text-xs font-semibold text-white hover:bg-zinc-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-60 text-black text-xs font-semibold transition-colors cursor-pointer"
            >
              {submitting ? 'Publishing to Atlas...' : 'Publish Frame'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
