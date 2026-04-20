/**
 * schema.org JSON-LD builders — typed, validated against Google Rich Results Test.
 * All builders return plain objects; pass them to <Seo jsonLd={...} />.
 */

import { absUrl, SITE_ORIGIN } from "./routes";

const ORG_REF = { "@id": `${SITE_ORIGIN}/#org` };

/** Author entities (extend as the team page grows). */
export const AUTHORS = {
  drMorsy: {
    "@type": "Person",
    "@id": `${SITE_ORIGIN}/about/dr-morsy#person`,
    name: "Dr. Abdelrahman Morsy",
    jobTitle: "Chief Medical Officer, RufayQ",
    knowsAbout: ["Medical tourism", "Oncology referrals", "Cardiothoracic surgery"],
    worksFor: ORG_REF,
  },
  saraAljandal: {
    "@type": "Person",
    "@id": `${SITE_ORIGIN}/about/sara-aljandal#person`,
    name: "Sara Aljandal",
    jobTitle: "Co-founder, RufayQ",
    knowsAbout: ["Patient experience", "Health-tech product design"],
    worksFor: ORG_REF,
  },
} as const;

export interface BreadcrumbItem {
  name: string;
  path: string; // root-relative, e.g. "/conditions/cancer-treatment-abroad"
}

export const breadcrumbSchema = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: absUrl(item.path),
  })),
});

export interface MedicalWebPageInput {
  url: string;
  title: string;
  description: string;
  conditionName: string;
  conditionDescription?: string;
  lastReviewed: string; // ISO date
  author?: typeof AUTHORS[keyof typeof AUTHORS];
}

export const medicalWebPageSchema = ({
  url, title, description, conditionName, conditionDescription, lastReviewed, author = AUTHORS.drMorsy,
}: MedicalWebPageInput) => ({
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  url: absUrl(url),
  name: title,
  description,
  inLanguage: url.startsWith("/ar") ? "ar" : "en",
  lastReviewed,
  reviewedBy: author,
  about: {
    "@type": "MedicalCondition",
    name: conditionName,
    ...(conditionDescription ? { description: conditionDescription } : {}),
  },
  publisher: ORG_REF,
});

export interface ArticleSchemaInput {
  url: string;
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: typeof AUTHORS[keyof typeof AUTHORS];
}

export const articleSchema = ({
  url, title, description, image, datePublished, dateModified, author = AUTHORS.drMorsy,
}: ArticleSchemaInput) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  image: image ? (image.startsWith("http") ? image : `${SITE_ORIGIN}${image}`) : `${SITE_ORIGIN}/og-image.jpg`,
  datePublished,
  dateModified: dateModified ?? datePublished,
  author,
  publisher: {
    "@type": "Organization",
    name: "RufayQ",
    logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/favicon.svg` },
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(url) },
  inLanguage: url.startsWith("/ar") ? "ar" : "en",
});

export interface HowToStep {
  name: string;
  text: string;
}

export const howToSchema = (
  name: string,
  description: string,
  steps: HowToStep[],
  totalTime?: string, // ISO 8601 duration e.g. "PT30M"
) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  description,
  ...(totalTime ? { totalTime } : {}),
  step: steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
});

export interface FaqEntry {
  q: string;
  a: string;
}

export const faqSchema = (faqs: FaqEntry[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export const personSchema = (
  id: "drMorsy" | "saraAljandal",
  url: string,
  description: string,
) => ({
  "@context": "https://schema.org",
  ...AUTHORS[id],
  url: absUrl(url),
  description,
});
