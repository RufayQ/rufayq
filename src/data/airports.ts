/**
 * Curated international airport list used by the AirportSelect dropdown so
 * users can never produce mismatched code/city pairs (e.g. DMM + Sharjah).
 *
 * This is intentionally a hand-picked subset focused on the routes RufayQ
 * patients actually fly — Saudi → GCC → Egypt / Levant → Türkiye / Europe /
 * a few key intercontinental hubs. Add more as needed; the search filter
 * scales fine into the low thousands.
 */

export interface Airport {
  code: string;
  city: string;
  country?: string;
  name?: string;
}

export const INTERNATIONAL_AIRPORTS: Airport[] = [
  // Saudi Arabia
  { code: "RUH", city: "Riyadh",   country: "Saudi Arabia", name: "King Khalid International Airport" },
  { code: "JED", city: "Jeddah",   country: "Saudi Arabia", name: "King Abdulaziz International Airport" },
  { code: "DMM", city: "Dammam",   country: "Saudi Arabia", name: "King Fahd International Airport" },
  { code: "MED", city: "Medina",   country: "Saudi Arabia", name: "Prince Mohammad Bin Abdulaziz Airport" },
  { code: "AHB", city: "Abha",     country: "Saudi Arabia", name: "Abha International Airport" },
  { code: "TIF", city: "Taif",     country: "Saudi Arabia", name: "Taif Regional Airport" },
  { code: "TUU", city: "Tabuk",    country: "Saudi Arabia", name: "Tabuk Regional Airport" },
  { code: "YNB", city: "Yanbu",    country: "Saudi Arabia", name: "Yanbu Airport" },
  { code: "GIZ", city: "Jizan",    country: "Saudi Arabia", name: "Jizan Regional Airport" },
  { code: "HAS", city: "Hail",     country: "Saudi Arabia", name: "Hail Regional Airport" },
  // GCC
  { code: "DXB", city: "Dubai",       country: "United Arab Emirates", name: "Dubai International Airport" },
  { code: "AUH", city: "Abu Dhabi",   country: "United Arab Emirates", name: "Zayed International Airport" },
  { code: "SHJ", city: "Sharjah",     country: "United Arab Emirates", name: "Sharjah International Airport" },
  { code: "DOH", city: "Doha",        country: "Qatar",   name: "Hamad International Airport" },
  { code: "KWI", city: "Kuwait City", country: "Kuwait",  name: "Kuwait International Airport" },
  { code: "BAH", city: "Manama",      country: "Bahrain", name: "Bahrain International Airport" },
  { code: "MCT", city: "Muscat",      country: "Oman",    name: "Muscat International Airport" },
  // Levant + Egypt
  { code: "CAI", city: "Cairo",       country: "Egypt",   name: "Cairo International Airport" },
  { code: "HBE", city: "Borg El Arab", country: "Egypt",  name: "Borg El Arab International Airport" },
  { code: "SSH", city: "Sharm El Sheikh", country: "Egypt", name: "Sharm El Sheikh International Airport" },
  { code: "LXR", city: "Luxor",       country: "Egypt",   name: "Luxor International Airport" },
  { code: "AMM", city: "Amman",       country: "Jordan",  name: "Queen Alia International Airport" },
  { code: "BEY", city: "Beirut",      country: "Lebanon", name: "Rafic Hariri International Airport" },
  // Türkiye
  { code: "IST", city: "Istanbul", country: "Türkiye", name: "Istanbul Airport" },
  { code: "SAW", city: "Istanbul", country: "Türkiye", name: "Sabiha Gökçen International Airport" },
  { code: "ESB", city: "Ankara",   country: "Türkiye", name: "Esenboğa International Airport" },
  { code: "AYT", city: "Antalya",  country: "Türkiye", name: "Antalya Airport" },
  // Europe
  { code: "FRA", city: "Frankfurt",   country: "Germany",     name: "Frankfurt am Main Airport" },
  { code: "MUC", city: "Munich",      country: "Germany",     name: "Munich Airport" },
  { code: "BER", city: "Berlin",      country: "Germany",     name: "Berlin Brandenburg Airport" },
  { code: "HAM", city: "Hamburg",     country: "Germany",     name: "Hamburg Airport" },
  { code: "DUS", city: "Düsseldorf",  country: "Germany",     name: "Düsseldorf Airport" },
  { code: "LHR", city: "London",      country: "United Kingdom", name: "Heathrow Airport" },
  { code: "LGW", city: "London",      country: "United Kingdom", name: "Gatwick Airport" },
  { code: "MAN", city: "Manchester",  country: "United Kingdom", name: "Manchester Airport" },
  { code: "CDG", city: "Paris",       country: "France",      name: "Charles de Gaulle Airport" },
  { code: "ORY", city: "Paris",       country: "France",      name: "Orly Airport" },
  { code: "AMS", city: "Amsterdam",   country: "Netherlands", name: "Schiphol Airport" },
  { code: "ZRH", city: "Zurich",      country: "Switzerland", name: "Zurich Airport" },
  { code: "GVA", city: "Geneva",      country: "Switzerland", name: "Geneva Airport" },
  { code: "VIE", city: "Vienna",      country: "Austria",     name: "Vienna International Airport" },
  { code: "FCO", city: "Rome",        country: "Italy",       name: "Fiumicino Airport" },
  { code: "MXP", city: "Milan",       country: "Italy",       name: "Malpensa Airport" },
  { code: "MAD", city: "Madrid",      country: "Spain",       name: "Madrid-Barajas Airport" },
  { code: "BCN", city: "Barcelona",   country: "Spain",       name: "El Prat Airport" },
  // North America
  { code: "JFK", city: "New York",    country: "United States", name: "John F. Kennedy International Airport" },
  { code: "EWR", city: "Newark",      country: "United States", name: "Newark Liberty International Airport" },
  { code: "BOS", city: "Boston",      country: "United States", name: "Logan International Airport" },
  { code: "IAD", city: "Washington",  country: "United States", name: "Dulles International Airport" },
  { code: "ORD", city: "Chicago",     country: "United States", name: "O'Hare International Airport" },
  { code: "LAX", city: "Los Angeles", country: "United States", name: "Los Angeles International Airport" },
  // Asia
  { code: "BKK", city: "Bangkok",       country: "Thailand",  name: "Suvarnabhumi Airport" },
  { code: "KUL", city: "Kuala Lumpur",  country: "Malaysia",  name: "Kuala Lumpur International Airport" },
  { code: "SIN", city: "Singapore",     country: "Singapore", name: "Changi Airport" },
  { code: "DEL", city: "Delhi",         country: "India",     name: "Indira Gandhi International Airport" },
  { code: "BOM", city: "Mumbai",        country: "India",     name: "Chhatrapati Shivaji Maharaj International Airport" },
];

const byCode: Record<string, Airport> = INTERNATIONAL_AIRPORTS.reduce((acc, a) => {
  acc[a.code] = a;
  return acc;
}, {} as Record<string, Airport>);

/** Look up an airport by IATA code. Returns null if unknown. */
export const findAirport = (code: string | null | undefined): Airport | null =>
  code ? byCode[code.trim().toUpperCase()] || null : null;

/** Filter airports by free-text query against code, city, name, or country. */
export function searchAirports(query: string, limit = 30): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return INTERNATIONAL_AIRPORTS.slice(0, limit);
  const out: Airport[] = [];
  for (const a of INTERNATIONAL_AIRPORTS) {
    if (
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      (a.name?.toLowerCase().includes(q) ?? false) ||
      (a.country?.toLowerCase().includes(q) ?? false)
    ) {
      out.push(a);
      if (out.length >= limit) break;
    }
  }
  return out;
}
