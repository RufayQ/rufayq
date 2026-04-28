// City list keyed by country name (matches names in src/data/countries.ts).
// Curated common cities; "Other" is always appended to allow free entry fallback.
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  "Saudi Arabia": ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran", "Taif", "Tabuk", "Abha", "Buraidah", "Hail", "Najran", "Jazan", "Yanbu"],
  "United Arab Emirates": ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Al Ain", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"],
  "Bahrain": ["Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town"],
  "Kuwait": ["Kuwait City", "Hawalli", "Salmiya", "Jahra", "Farwaniya"],
  "Oman": ["Muscat", "Salalah", "Sohar", "Nizwa", "Sur"],
  "Qatar": ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor", "Lusail"],
  "Egypt": ["Cairo", "Alexandria", "Giza", "Sharm El Sheikh", "Luxor", "Aswan", "Hurghada", "Mansoura"],
  "Jordan": ["Amman", "Zarqa", "Irbid", "Aqaba", "Madaba"],
  "Lebanon": ["Beirut", "Tripoli", "Sidon", "Tyre", "Jounieh"],
  "Iraq": ["Baghdad", "Basra", "Mosul", "Erbil", "Najaf", "Karbala"],
  "Yemen": ["Sana'a", "Aden", "Taiz", "Hodeidah"],
  "Palestine": ["Ramallah", "Gaza", "Hebron", "Nablus", "Bethlehem"],
  "Syria": ["Damascus", "Aleppo", "Homs", "Latakia"],
  "Türkiye": ["Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Adana", "Gaziantep", "Konya"],
  "Germany": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf", "Heidelberg", "Leipzig", "Hannover"],
  "France": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Bordeaux", "Strasbourg", "Lille"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Liverpool", "Leeds", "Oxford", "Cambridge"],
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Boston", "San Francisco", "Miami", "Seattle", "Washington", "Cleveland", "Rochester"],
  "Canada": ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa", "Edmonton"],
  "India": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune"],
  "Pakistan": ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar"],
  "Indonesia": ["Jakarta", "Surabaya", "Bandung", "Medan", "Bali"],
  "Malaysia": ["Kuala Lumpur", "Penang", "Johor Bahru", "Malacca"],
  "Thailand": ["Bangkok", "Chiang Mai", "Phuket", "Pattaya"],
  "Singapore": ["Singapore"],
  "Japan": ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya", "Sapporo", "Fukuoka"],
  "South Korea": ["Seoul", "Busan", "Incheon", "Daegu"],
  "China": ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Hangzhou"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  "South Africa": ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
  "Morocco": ["Casablanca", "Rabat", "Marrakesh", "Fez", "Tangier"],
  "Algeria": ["Algiers", "Oran", "Constantine"],
  "Tunisia": ["Tunis", "Sfax", "Sousse"],
  "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Málaga"],
  "Italy": ["Rome", "Milan", "Naples", "Turin", "Florence", "Venice"],
  "Netherlands": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
  "Switzerland": ["Zurich", "Geneva", "Basel", "Bern", "Lausanne"],
  "Sweden": ["Stockholm", "Gothenburg", "Malmö"],
  "Norway": ["Oslo", "Bergen", "Trondheim", "Stavanger"],
};

export const getCitiesForCountry = (country: string | null | undefined): string[] => {
  if (!country) return [];
  return CITIES_BY_COUNTRY[country] || [];
};
