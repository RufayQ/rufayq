import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useSyncLanguageWithRoute } from "@/seo/useSyncLanguageWithRoute";
import Landing from "./pages/Landing.tsx";

// Code-split non-landing routes for faster First Contentful Paint on /
const Index = lazy(() => import("./pages/Index.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Security = lazy(() => import("./pages/Security.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Providers = lazy(() => import("./pages/Providers.tsx"));
const ProviderLogin = lazy(() => import("./pages/ProviderLogin.tsx"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div style={{ minHeight: "100vh", background: "#06101A" }} />
);

/** Keeps <html lang/dir> + LanguageContext in sync with /ar/* paths. */
const RouteLanguageSync = () => {
  useSyncLanguageWithRoute();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteLanguageSync />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* English (root = default language) */}
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/security" element={<Security />} />
                <Route path="/providers" element={<Providers />} />

                {/* Arabic mirror — same components, lang detected via URL */}
                <Route path="/ar" element={<Landing />} />
                <Route path="/ar/about" element={<About />} />
                <Route path="/ar/privacy" element={<Privacy />} />
                <Route path="/ar/terms" element={<Terms />} />
                <Route path="/ar/security" element={<Security />} />
                <Route path="/ar/providers" element={<Providers />} />

                {/* App + non-marketing surfaces */}
                <Route path="/app" element={<Index />} />
                <Route path="/ar/app" element={<Index />} />
                <Route path="/provider/login" element={<ProviderLogin />} />
                <Route path="/provider" element={<ProviderDashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/auth" element={<Auth />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
