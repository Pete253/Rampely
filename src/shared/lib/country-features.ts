export type CountryCode =
  | "DK"
  | "NO"
  | "SE"
  | "DE"
  | "NL"
  | "GB"
  | "IE"
  | "FI"
  | "BE"
  | "FR"
  | "ES"
  | "IT"
  | "AT"
  | "CH"
  | "PL"
  | "US"
  | "CA"
  | "OTHER";

export interface BusinessRegistry {
  id: "cvr" | "brreg" | "bolagsverket" | "handelsregister" | "kvk" | "companieshouse" | "other";
  label: string;
  searchPlaceholder: string;
}

export interface CountryFeatures {
  code: CountryCode;
  name: string;
  locale: string;
  currency: string;
  businessRegistry: BusinessRegistry | null;
  smsGatewayId: string | null;
  phoneCountryCode: string;
  /** Call-recording consent regime: drives dialer defaults and UI copy.
   * one_party — the rep's own consent suffices · inform — counterpart must
   * be informed · all_party — explicit consent from everyone required. */
  recordingConsentMode: "one_party" | "inform" | "all_party";
  vatEnabled: boolean;
  holidayCalendar: string | null;
}

export const COUNTRY_FEATURES: Record<CountryCode, CountryFeatures> = {
  DK: {
    code: "DK",
    name: "Denmark",
    locale: "da-DK",
    currency: "DKK",
    businessRegistry: {
      id: "cvr",
      label: "CVR",
      searchPlaceholder: "Search by CVR number or company name",
    },
    smsGatewayId: null,
    phoneCountryCode: "+45",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: "dk-public",
  },
  NO: {
    code: "NO",
    name: "Norway",
    locale: "nb-NO",
    currency: "NOK",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+47",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  SE: {
    code: "SE",
    name: "Sweden",
    locale: "sv-SE",
    currency: "SEK",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+46",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  DE: {
    code: "DE",
    name: "Germany",
    locale: "de-DE",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+49",
    recordingConsentMode: "all_party",
    vatEnabled: true,
    holidayCalendar: null,
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    locale: "nl-NL",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+31",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    locale: "en-GB",
    currency: "GBP",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+44",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  IE: {
    code: "IE",
    name: "Ireland",
    locale: "en-IE",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+353",
    recordingConsentMode: "all_party",
    vatEnabled: true,
    holidayCalendar: null,
  },
  FI: {
    code: "FI",
    name: "Finland",
    locale: "fi-FI",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+358",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  BE: {
    code: "BE",
    name: "Belgium",
    locale: "nl-BE",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+32",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  FR: {
    code: "FR",
    name: "France",
    locale: "fr-FR",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+33",
    recordingConsentMode: "all_party",
    vatEnabled: true,
    holidayCalendar: null,
  },
  ES: {
    code: "ES",
    name: "Spain",
    locale: "es-ES",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+34",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  IT: {
    code: "IT",
    name: "Italy",
    locale: "it-IT",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+39",
    recordingConsentMode: "inform",
    vatEnabled: true,
    holidayCalendar: null,
  },
  AT: {
    code: "AT",
    name: "Austria",
    locale: "de-AT",
    currency: "EUR",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+43",
    recordingConsentMode: "all_party",
    vatEnabled: true,
    holidayCalendar: null,
  },
  CH: {
    code: "CH",
    name: "Switzerland",
    locale: "de-CH",
    currency: "CHF",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+41",
    recordingConsentMode: "all_party",
    vatEnabled: true,
    holidayCalendar: null,
  },
  PL: {
    code: "PL",
    name: "Poland",
    locale: "pl-PL",
    currency: "PLN",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+48",
    recordingConsentMode: "all_party",
    vatEnabled: true,
    holidayCalendar: null,
  },
  US: {
    code: "US",
    name: "United States",
    locale: "en-US",
    currency: "USD",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+1",
    recordingConsentMode: "all_party",
    vatEnabled: false,
    holidayCalendar: null,
  },
  CA: {
    code: "CA",
    name: "Canada",
    locale: "en-CA",
    currency: "CAD",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+1",
    recordingConsentMode: "all_party",
    vatEnabled: false,
    holidayCalendar: null,
  },
  OTHER: {
    code: "OTHER",
    name: "Other",
    locale: "en-US",
    currency: "USD",
    businessRegistry: null,
    smsGatewayId: null,
    phoneCountryCode: "+1",
    recordingConsentMode: "all_party",
    vatEnabled: false,
    holidayCalendar: null,
  },
};

// Display order used by selectors.
export const COUNTRY_ORDER: CountryCode[] = [
  "DK",
  "NO",
  "SE",
  "DE",
  "NL",
  "GB",
  "IE",
  "FI",
  "BE",
  "FR",
  "ES",
  "IT",
  "AT",
  "CH",
  "PL",
  "US",
  "CA",
  "OTHER",
];

export function getCountryFeatures(code: CountryCode | string | null | undefined): CountryFeatures {
  if (!code || !(code in COUNTRY_FEATURES)) return COUNTRY_FEATURES.OTHER;
  return COUNTRY_FEATURES[code as CountryCode];
}

/** Infer a country code from a BCP-47 language tag like "da-DK" → "DK". */
export function inferCountryFromLanguage(lang: string | undefined | null): CountryCode {
  if (!lang) return "DK";
  const region = lang.split("-")[1]?.toUpperCase();
  if (region && region in COUNTRY_FEATURES) return region as CountryCode;
  return "DK";
}
