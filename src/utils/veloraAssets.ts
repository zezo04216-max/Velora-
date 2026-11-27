import heroWeddingImg from '../assets/images/velora_hero_wedding_1795424759489.jpg';
import venuePalaceImg from '../assets/images/velora_venue_palace_1795424759214.jpg';
import venueGardenImg from '../assets/images/velora_venue_garden_1795424759691.jpg';
import photographerCoupleImg from '../assets/images/velora_photographer_couple_1795424759634.jpg';
import serviceFloralKoshaImg from '../assets/images/velora_service_floral_kosha_1795424758988.jpg';
import invitationEditorialImg from '../assets/images/velora_invitation_editorial_1795424758769.jpg';
import ivoryRosesBorderImg from '../assets/images/ivory_roses_fullbleed_1795512118161.jpg';
import coupleFloralImg from '../assets/images/couple_floral_illustration_1795512102318.jpg';

export const IVORY_ROSES_CARD_BG = ivoryRosesBorderImg;
export const COUPLE_FLORAL_ILLUSTRATION = coupleFloralImg;

export const VELORA_IMAGE_ASSETS: Record<string, string> = {
  '/src/assets/images/velora_hero_wedding_1795424759489.jpg': heroWeddingImg,
  '/src/assets/images/velora_venue_palace_1795424759214.jpg': venuePalaceImg,
  '/src/assets/images/velora_venue_garden_1795424759691.jpg': venueGardenImg,
  '/src/assets/images/velora_photographer_couple_1795424759634.jpg': photographerCoupleImg,
  '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg': serviceFloralKoshaImg,
  '/src/assets/images/velora_invitation_editorial_1795424758769.jpg': invitationEditorialImg,
  '/src/assets/images/ivory_roses_fullbleed_1795512118161.jpg': ivoryRosesBorderImg,
  '/src/assets/images/couple_floral_illustration_1795512102318.jpg': coupleFloralImg,
};

export const VELORA_PRESET_PHOTOS = [
  {
    key: '/src/assets/images/velora_hero_wedding_1795424759489.jpg',
    labelAr: 'حديقة قصر الأفراح — إضاءة الغروب',
    url: heroWeddingImg,
  },
  {
    key: '/src/assets/images/velora_venue_palace_1795424759214.jpg',
    labelAr: 'قاعة الرخام والكريستال الملكية',
    url: venuePalaceImg,
  },
  {
    key: '/src/assets/images/velora_venue_garden_1795424759691.jpg',
    labelAr: 'تراس النيل والورود البيضاء',
    url: venueGardenImg,
  },
  {
    key: '/src/assets/images/velora_photographer_couple_1795424759634.jpg',
    labelAr: 'جلسة تصوير عروسين — الساعة الذهبية',
    url: photographerCoupleImg,
  },
  {
    key: '/src/assets/images/velora_service_floral_kosha_1795424758988.jpg',
    labelAr: 'كوشة الأوركيد والليلك الفاخرة',
    url: serviceFloralKoshaImg,
  },
  {
    key: '/src/assets/images/velora_invitation_editorial_1795424758769.jpg',
    labelAr: 'بطاقة دعوة قطنية بختم الشمع',
    url: invitationEditorialImg,
  },
];

export function resolveMediaUrl(pathOrUrl: string | undefined | null, fallback = heroWeddingImg): string {
  const clean = (pathOrUrl || '').trim();
  if (!clean) return fallback;
  if (VELORA_IMAGE_ASSETS[clean]) return VELORA_IMAGE_ASSETS[clean];
  if (
    clean.startsWith('/assets/') ||
    clean.startsWith('/demo/') ||
    clean.startsWith('/api/media/uploads/') ||
    clean.startsWith('data:image/') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://')
  ) {
    return clean;
  }
  return fallback;
}
