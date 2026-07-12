export const STATIC_CITIES = [
  'lagos',
  'ibadan',
  'ogun',
  'abuja',
  'kano',
  'jos',
  'portharcourt'
];

export function capitalize(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
