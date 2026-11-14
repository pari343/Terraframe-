import ladakhImg from '../assets/images/photo_ladakh_monastery_1794649407724.jpg';
import kyotoImg from '../assets/images/photo_kyoto_bamboo_1794649409656.jpg';
import patagoniaImg from '../assets/images/photo_patagonia_peaks_1794649408660.jpg';
import varanasiImg from '../assets/images/photo_varanasi_ghats_1794649409944.jpg';
import lofotenImg from '../assets/images/photo_lofoten_fjord_1794649410063.jpg';
import saharaImg from '../assets/images/photo_sahara_dunes_1794649410232.jpg';
import hampiImg from '../assets/images/photo_hampi_boulders_1794649411081.jpg';
import dolomitesImg from '../assets/images/photo_dolomites_pass_1794649411502.jpg';
import {TravelPhoto} from '../types/photography';

export const SEED_IMAGE_MAP: Record<string, string> = {
  ladakh: ladakhImg,
  kyoto: kyotoImg,
  patagonia: patagoniaImg,
  varanasi: varanasiImg,
  lofoten: lofotenImg,
  sahara: saharaImg,
  hampi: hampiImg,
  dolomites: dolomitesImg,
};

export function resolvePhotoUrl(photo: TravelPhoto): string {
  if (photo.assetKey && SEED_IMAGE_MAP[photo.assetKey]) {
    return SEED_IMAGE_MAP[photo.assetKey];
  }
  return photo.imageUrl || ladakhImg;
}
