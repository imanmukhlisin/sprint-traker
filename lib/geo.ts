// Coordinates lookup for popular areas in Yogyakarta
const JOGJA_AREAS: Record<string, { lat: number; lng: number }> = {
  kotagede: { lat: -7.8285, lng: 110.3995 },
  malioboro: { lat: -7.7926, lng: 110.3658 },
  tugu: { lat: -7.7828, lng: 110.367 },
  prawirotaman: { lat: -7.8189, lng: 110.3693 },
  seturan: { lat: -7.7655, lng: 110.4093 },
  kaliurang: { lat: -7.5986, lng: 110.4284 },
  prambanan: { lat: -7.752, lng: 110.4914 },
  kasongan: { lat: -7.8465, lng: 110.3391 },
  kraton: { lat: -7.8053, lng: 110.3642 },
  alunalun: { lat: -7.8117, lng: 110.3631 },
  monjali: { lat: -7.7501, lng: 110.3696 },
  gejayan: { lat: -7.7712, lng: 110.3901 },
  parangtritis: { lat: -7.9825, lng: 110.3164 },
  sleman: { lat: -7.7167, lng: 110.3556 },
  bantul: { lat: -7.8894, lng: 110.3283 },
};

export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export function estimateCoordinates(text: string): { lat: number; lng: number } {
  const normalized = text.toLowerCase();
  for (const [key, coords] of Object.entries(JOGJA_AREAS)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }
  // Default to center of Yogyakarta (Malioboro / Tugu area)
  return { lat: -7.7956, lng: 110.3695 };
}
