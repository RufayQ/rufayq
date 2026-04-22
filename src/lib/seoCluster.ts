/**
 * SEO masterplan — curated internal-link anchor texts between cluster articles.
 *
 * Maps source-slug → list of suggested anchors pointing at sibling slugs, in both
 * EN and AR. Drives the "Suggested links" section in the AdminNews link picker.
 *
 * Keep this in sync with the SEO masterplan doc. When new articles join the
 * cluster, add their slug + anchors here.
 */
export interface ClusterAnchor {
  /** Target article slug (must match meta.slug in the markdown). */
  toSlug: string;
  /** Anchor text to render in EN body. */
  anchorEn: string;
  /** Anchor text to render in AR body. */
  anchorAr: string;
}

export const CLUSTER_LINKS: Record<string, ClusterAnchor[]> = {
  "medical-tourism-saudi-patients-2026": [
    {
      toSlug: "medical-document-translation-ai-scanning",
      anchorEn: "How to translate your medical records before traveling abroad",
      anchorAr: "كيف تترجم سجلاتك الطبية قبل السفر للعلاج بالخارج",
    },
    {
      toSlug: "recovery-coordination-post-treatment-care",
      anchorEn: "Coordinating recovery between your foreign surgeon and Saudi doctor",
      anchorAr: "تنسيق التعافي بين جراحك بالخارج وطبيبك السعودي",
    },
  ],
  "medical-document-translation-ai-scanning": [
    {
      toSlug: "medical-tourism-saudi-patients-2026",
      anchorEn: "The complete 2026 guide to medical tourism for Saudi patients",
      anchorAr: "الدليل الشامل للسياحة العلاجية للمرضى السعوديين 2026",
    },
    {
      toSlug: "recovery-coordination-post-treatment-care",
      anchorEn: "What happens after surgery: recovery coordination at home",
      anchorAr: "ما بعد الجراحة: تنسيق التعافي عند العودة للوطن",
    },
  ],
  "recovery-coordination-post-treatment-care": [
    {
      toSlug: "medical-tourism-saudi-patients-2026",
      anchorEn: "Read the full medical tourism guide for Saudi patients",
      anchorAr: "اقرأ الدليل الكامل للسياحة العلاجية للمرضى السعوديين",
    },
    {
      toSlug: "medical-document-translation-ai-scanning",
      anchorEn: "Why proper medical document translation can save your surgery",
      anchorAr: "لماذا تنقذ الترجمة الطبية الصحيحة جراحتك",
    },
  ],
};

/** Returns curated suggestions for a given source slug, or [] if unmapped. */
export const getClusterSuggestions = (sourceSlug: string): ClusterAnchor[] =>
  CLUSTER_LINKS[sourceSlug] ?? [];
