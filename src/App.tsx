import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useSyncLanguageWithRoute } from "@/seo/useSyncLanguageWithRoute";
import Landing from "./pages/Landing.tsx";
import AppAuthGuard from "@/components/AppAuthGuard";

/* ── Lazy: every non-landing route ───────────────────────────────────────── */
const Index = lazy(() => import("./pages/Index.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const Enterprise = lazy(() => import("./pages/Enterprise.tsx"));
const CancerTreatmentAbroad = lazy(() => import("./pages/content/CancerTreatmentAbroad.tsx"));
const GermanyMedicalTreatment = lazy(() => import("./pages/content/GermanyMedicalTreatment.tsx"));
const MedicalVisaGermany = lazy(() => import("./pages/content/MedicalVisaGermany.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Security = lazy(() => import("./pages/Security.tsx"));
const News = lazy(() => import("./pages/News.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Providers = lazy(() => import("./pages/Providers.tsx"));
const ProviderLogin = lazy(() => import("./pages/ProviderLogin.tsx"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminApiDocs = lazy(() => import("./pages/AdminApiDocs.tsx"));
const AdminSwagger = lazy(() => import("./pages/AdminSwagger.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const SubscriptionDashboard = lazy(() => import("./pages/SubscriptionDashboard.tsx"));
const WalletLedger = lazy(() => import("./pages/WalletLedger.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ContactDivert = lazy(() => import("./pages/ContactDivert.tsx"));
const SitemapPreview = lazy(() => import("./pages/SitemapPreview.tsx"));

/* ── Lazy: heavy app-shell (QueryClient + Toaster + Tooltip + Currency).
   Only mounted for routes that actually need them. Keeps Landing's critical
   bundle ~80 kB lighter (no react-query, sonner, radix-toast/tooltip). ─── */
const AppShell = lazy(() => import("./AppShell.tsx"));

const RouteFallback = () => (
  <div style={{ minHeight: "100vh", background: "#06101A" }} />
);

/** Keeps <html lang/dir> + LanguageContext in sync with /ar/* paths. */
const RouteLanguageSync = () => {
  useSyncLanguageWithRoute();
  return null;
};

/** Wraps a route that needs the heavy shell (toasters, query, tooltip, currency). */
const Shelled = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<RouteFallback />}>
    <AppShell>{children}</AppShell>
  </Suspense>
);

const App = () => (
  <HelmetProvider>
    <LanguageProvider>
      <BrowserRouter>
        <RouteLanguageSync />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* English (root = default language) — minimal critical chain */}
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<Security />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/conditions/cancer-treatment-abroad" element={<CancerTreatmentAbroad />} />
            <Route path="/destinations/germany-medical-treatment" element={<GermanyMedicalTreatment />} />
            <Route path="/guides/medical-visa-germany-saudi-citizens" element={<MedicalVisaGermany />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:slug" element={<News />} />

            {/* Pricing & Enterprise need CurrencyProvider → routed through shell */}
            <Route path="/pricing" element={<Shelled><Pricing /></Shelled>} />
            <Route path="/enterprise" element={<Shelled><Enterprise /></Shelled>} />

            {/* Arabic mirror */}
            <Route path="/ar" element={<Landing />} />
            <Route path="/ar/about" element={<About />} />
            <Route path="/ar/privacy" element={<Privacy />} />
            <Route path="/ar/terms" element={<Terms />} />
            <Route path="/ar/security" element={<Security />} />
            <Route path="/ar/providers" element={<Providers />} />
            <Route path="/ar/conditions/cancer-treatment-abroad" element={<CancerTreatmentAbroad />} />
            <Route path="/ar/destinations/germany-medical-treatment" element={<GermanyMedicalTreatment />} />
            <Route path="/ar/guides/medical-visa-germany-saudi-citizens" element={<MedicalVisaGermany />} />
            <Route path="/ar/news" element={<News />} />
            <Route path="/ar/news/:slug" element={<News />} />
            <Route path="/ar/pricing" element={<Shelled><Pricing /></Shelled>} />
            <Route path="/ar/enterprise" element={<Shelled><Enterprise /></Shelled>} />

            {/* App + non-marketing surfaces — all need full shell */}
            <Route path="/app" element={<Shelled><AppAuthGuard><Index /></AppAuthGuard></Shelled>} />
            <Route path="/ar/app" element={<Shelled><AppAuthGuard><Index /></AppAuthGuard></Shelled>} />
            <Route path="/provider/login" element={<Shelled><ProviderLogin /></Shelled>} />
            <Route path="/provider" element={<Shelled><ProviderDashboard /></Shelled>} />
            <Route path="/admin" element={<Shelled><Admin /></Shelled>} />
            <Route path="/admin/login" element={<Shelled><AdminLogin /></Shelled>} />
            <Route path="/admin/api-docs" element={<Shelled><AdminApiDocs /></Shelled>} />
            <Route path="/admin/swagger" element={<Shelled><AdminSwagger /></Shelled>} />
            <Route path="/auth" element={<Shelled><Auth /></Shelled>} />
            <Route path="/app/dashboard/subscription" element={<Shelled><SubscriptionDashboard /></Shelled>} />
            <Route path="/app/wallet" element={<Shelled><WalletLedger /></Shelled>} />
            <Route path="/ar/app/dashboard/subscription" element={<Shelled><SubscriptionDashboard /></Shelled>} />
            <Route path="/ar/app/wallet" element={<Shelled><WalletLedger /></Shelled>} />

            {/* SEO QA tools (no /ar mirror — internal use only) */}
            <Route path="/sitemap-preview" element={<SitemapPreview />} />

            {/* Soft-divert pages for retired/broken CTAs (e.g. old "Book a demo" → /contact). */}
            <Route path="/contact" element={<ContactDivert />} />
            <Route path="/ar/contact" element={<ContactDivert />} />
            <Route path="/notfoundpage" element={<ContactDivert />} />
            <Route path="/ar/notfoundpage" element={<ContactDivert />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LanguageProvider>
  </HelmetProvider>
);

export default App;
