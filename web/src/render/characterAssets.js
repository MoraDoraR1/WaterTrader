const CHARACTER_IDS = [
  'player_male', 'player_female',
  'european_male', 'european_female',
  'mediterranean_male', 'mediterranean_female',
  'east_asian_male', 'east_asian_female',
  'korean_male', 'korean_female',
  'tropical_male', 'tropical_female',
];

const CHARACTER_IMAGES = new Map();

const CULTURE_BY_COUNTRY = {
  OT: 'mediterranean', OM: 'mediterranean',
  CN: 'east_asian', JP: 'east_asian',
  KR: 'korean',
  AC: 'tropical', BN: 'tropical', BU: 'tropical', SM: 'tropical', VN: 'tropical',
};

function sourceFor(id) {
  return globalThis.__CHARACTER_IMAGE_DATA__?.[id] || `./assets/characters/${id}.webp`;
}

for (const id of CHARACTER_IDS) {
  const image = new Image();
  image.decoding = 'async';
  image.src = sourceFor(id);
  CHARACTER_IMAGES.set(id, image);
}

export function getCharacterImage(gender = 'male', country = 'PT', isPlayer = false) {
  const safeGender = gender === 'female' ? 'female' : 'male';
  const family = isPlayer ? 'player' : (CULTURE_BY_COUNTRY[country] || 'european');
  const image = CHARACTER_IMAGES.get(`${family}_${safeGender}`);
  return image?.complete && image.naturalWidth > 0 ? image : null;
}
