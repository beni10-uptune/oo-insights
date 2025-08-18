/**
 * Market configuration with proper country names and metadata
 */

export const MARKET_NAMES: Record<string, {
  code: string;
  name: string;
  flag: string;
  language: string;
  languageName: string;
  isCore: boolean;
}> = {
  de: {
    code: 'de',
    name: 'Germany',
    flag: '🇩🇪',
    language: 'de',
    languageName: 'German',
    isCore: true,
  },
  fr: {
    code: 'fr',
    name: 'France',
    flag: '🇫🇷',
    language: 'fr',
    languageName: 'French',
    isCore: true,
  },
  it: {
    code: 'it',
    name: 'Italy',
    flag: '🇮🇹',
    language: 'it',
    languageName: 'Italian',
    isCore: true,
  },
  es: {
    code: 'es',
    name: 'Spain',
    flag: '🇪🇸',
    language: 'es',
    languageName: 'Spanish',
    isCore: true,
  },
  ca_en: {
    code: 'ca_en',
    name: 'Canada (English)',
    flag: '🇨🇦',
    language: 'en',
    languageName: 'English',
    isCore: true,
  },
  ca_fr: {
    code: 'ca_fr',
    name: 'Canada (French)',
    flag: '🇨🇦',
    language: 'fr',
    languageName: 'French',
    isCore: true,
  },
  uk: {
    code: 'uk',
    name: 'United Kingdom',
    flag: '🇬🇧',
    language: 'en',
    languageName: 'English',
    isCore: true,
  },
  pl: {
    code: 'pl',
    name: 'Poland',
    flag: '🇵🇱',
    language: 'pl',
    languageName: 'Polish',
    isCore: true,
  },
  ch_de: {
    code: 'ch_de',
    name: 'Switzerland (German)',
    flag: '🇨🇭',
    language: 'de',
    languageName: 'German',
    isCore: false,
  },
  ch_it: {
    code: 'ch_it',
    name: 'Switzerland (Italian)',
    flag: '🇨🇭',
    language: 'it',
    languageName: 'Italian',
    isCore: false,
  },
  ch_fr: {
    code: 'ch_fr',
    name: 'Switzerland (French)',
    flag: '🇨🇭',
    language: 'fr',
    languageName: 'French',
    isCore: false,
  },
  se: {
    code: 'se',
    name: 'Sweden',
    flag: '🇸🇪',
    language: 'sv',
    languageName: 'Swedish',
    isCore: false,
  },
  no: {
    code: 'no',
    name: 'Norway',
    flag: '🇳🇴',
    language: 'no',
    languageName: 'Norwegian',
    isCore: false,
  },
  dk: {
    code: 'dk',
    name: 'Denmark',
    flag: '🇩🇰',
    language: 'da',
    languageName: 'Danish',
    isCore: false,
  },
  fi: {
    code: 'fi',
    name: 'Finland',
    flag: '🇫🇮',
    language: 'fi',
    languageName: 'Finnish',
    isCore: false,
  },
  lv: {
    code: 'lv',
    name: 'Latvia',
    flag: '🇱🇻',
    language: 'lv',
    languageName: 'Latvian',
    isCore: false,
  },
  ee: {
    code: 'ee',
    name: 'Estonia',
    flag: '🇪🇪',
    language: 'et',
    languageName: 'Estonian',
    isCore: false,
  },
  lt: {
    code: 'lt',
    name: 'Lithuania',
    flag: '🇱🇹',
    language: 'lt',
    languageName: 'Lithuanian',
    isCore: false,
  },
  hr: {
    code: 'hr',
    name: 'Croatia',
    flag: '🇭🇷',
    language: 'hr',
    languageName: 'Croatian',
    isCore: false,
  },
  be_nl: {
    code: 'be_nl',
    name: 'Belgium (Dutch)',
    flag: '🇧🇪',
    language: 'nl',
    languageName: 'Dutch',
    isCore: false,
  },
  be_fr: {
    code: 'be_fr',
    name: 'Belgium (French)',
    flag: '🇧🇪',
    language: 'fr',
    languageName: 'French',
    isCore: false,
  },
  bg: {
    code: 'bg',
    name: 'Bulgaria',
    flag: '🇧🇬',
    language: 'bg',
    languageName: 'Bulgarian',
    isCore: false,
  },
  gr: {
    code: 'gr',
    name: 'Greece',
    flag: '🇬🇷',
    language: 'el',
    languageName: 'Greek',
    isCore: false,
  },
  hu: {
    code: 'hu',
    name: 'Hungary',
    flag: '🇭🇺',
    language: 'hu',
    languageName: 'Hungarian',
    isCore: false,
  },
  is: {
    code: 'is',
    name: 'Iceland',
    flag: '🇮🇸',
    language: 'is',
    languageName: 'Icelandic',
    isCore: false,
  },
  ie: {
    code: 'ie',
    name: 'Ireland',
    flag: '🇮🇪',
    language: 'en',
    languageName: 'English',
    isCore: false,
  },
  sk: {
    code: 'sk',
    name: 'Slovakia',
    flag: '🇸🇰',
    language: 'sk',
    languageName: 'Slovak',
    isCore: false,
  },
  rs: {
    code: 'rs',
    name: 'Serbia',
    flag: '🇷🇸',
    language: 'sr',
    languageName: 'Serbian',
    isCore: false,
  },
  nl: {
    code: 'nl',
    name: 'Netherlands',
    flag: '🇳🇱',
    language: 'nl',
    languageName: 'Dutch',
    isCore: false,
  },
  at: {
    code: 'at',
    name: 'Austria',
    flag: '🇦🇹',
    language: 'de',
    languageName: 'German',
    isCore: false,
  },
  pt: {
    code: 'pt',
    name: 'Portugal',
    flag: '🇵🇹',
    language: 'pt',
    languageName: 'Portuguese',
    isCore: false,
  },
  cz: {
    code: 'cz',
    name: 'Czech Republic',
    flag: '🇨🇿',
    language: 'cs',
    languageName: 'Czech',
    isCore: false,
  },
  ro: {
    code: 'ro',
    name: 'Romania',
    flag: '🇷🇴',
    language: 'ro',
    languageName: 'Romanian',
    isCore: false,
  },
  si: {
    code: 'si',
    name: 'Slovenia',
    flag: '🇸🇮',
    language: 'sl',
    languageName: 'Slovenian',
    isCore: false,
  },
};

/**
 * Get market display name from market code
 */
export function getMarketName(marketCode: string): string {
  return MARKET_NAMES[marketCode]?.name || marketCode.toUpperCase();
}

/**
 * Get market flag from market code
 */
export function getMarketFlag(marketCode: string): string {
  return MARKET_NAMES[marketCode]?.flag || '🌍';
}

/**
 * Get full market display with flag and name
 */
export function getMarketDisplay(marketCode: string): string {
  const market = MARKET_NAMES[marketCode];
  if (!market) return marketCode.toUpperCase();
  return `${market.flag} ${market.name}`;
}

/**
 * Get core markets only
 */
export function getCoreMarkets(): typeof MARKET_NAMES {
  return Object.fromEntries(
    Object.entries(MARKET_NAMES).filter(([_, market]) => market.isCore)
  );
}

/**
 * Get secondary markets only
 */
export function getSecondaryMarkets(): typeof MARKET_NAMES {
  return Object.fromEntries(
    Object.entries(MARKET_NAMES).filter(([_, market]) => !market.isCore)
  );
}