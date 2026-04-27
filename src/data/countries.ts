// Country list for global dropdowns across the admin portal.
// Sorted alphabetically; Saudi Arabia surfaced as the suggested default.
export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  nameAr: string;
}

export const COUNTRIES: Country[] = [
  { code: "SA", name: "Saudi Arabia", nameAr: "المملكة العربية السعودية" },
  { code: "AE", name: "United Arab Emirates", nameAr: "الإمارات العربية المتحدة" },
  { code: "BH", name: "Bahrain", nameAr: "البحرين" },
  { code: "KW", name: "Kuwait", nameAr: "الكويت" },
  { code: "OM", name: "Oman", nameAr: "عُمان" },
  { code: "QA", name: "Qatar", nameAr: "قطر" },
  { code: "EG", name: "Egypt", nameAr: "مصر" },
  { code: "JO", name: "Jordan", nameAr: "الأردن" },
  { code: "LB", name: "Lebanon", nameAr: "لبنان" },
  { code: "IQ", name: "Iraq", nameAr: "العراق" },
  { code: "YE", name: "Yemen", nameAr: "اليمن" },
  { code: "PS", name: "Palestine", nameAr: "فلسطين" },
  { code: "SY", name: "Syria", nameAr: "سوريا" },
  { code: "TR", name: "Türkiye", nameAr: "تركيا" },
  { code: "DE", name: "Germany", nameAr: "ألمانيا" },
  { code: "FR", name: "France", nameAr: "فرنسا" },
  { code: "GB", name: "United Kingdom", nameAr: "المملكة المتحدة" },
  { code: "US", name: "United States", nameAr: "الولايات المتحدة" },
  { code: "CA", name: "Canada", nameAr: "كندا" },
  { code: "IN", name: "India", nameAr: "الهند" },
  { code: "PK", name: "Pakistan", nameAr: "باكستان" },
  { code: "ID", name: "Indonesia", nameAr: "إندونيسيا" },
  { code: "MY", name: "Malaysia", nameAr: "ماليزيا" },
  { code: "TH", name: "Thailand", nameAr: "تايلاند" },
  { code: "SG", name: "Singapore", nameAr: "سنغافورة" },
  { code: "JP", name: "Japan", nameAr: "اليابان" },
  { code: "KR", name: "South Korea", nameAr: "كوريا الجنوبية" },
  { code: "CN", name: "China", nameAr: "الصين" },
  { code: "AU", name: "Australia", nameAr: "أستراليا" },
  { code: "ZA", name: "South Africa", nameAr: "جنوب أفريقيا" },
  { code: "MA", name: "Morocco", nameAr: "المغرب" },
  { code: "DZ", name: "Algeria", nameAr: "الجزائر" },
  { code: "TN", name: "Tunisia", nameAr: "تونس" },
  { code: "ES", name: "Spain", nameAr: "إسبانيا" },
  { code: "IT", name: "Italy", nameAr: "إيطاليا" },
  { code: "NL", name: "Netherlands", nameAr: "هولندا" },
  { code: "CH", name: "Switzerland", nameAr: "سويسرا" },
  { code: "SE", name: "Sweden", nameAr: "السويد" },
  { code: "NO", name: "Norway", nameAr: "النرويج" },
  { code: "Other", name: "Other", nameAr: "أخرى" },
];

export const findCountry = (value: string | null | undefined) =>
  COUNTRIES.find((c) => c.name === value || c.code === value);
