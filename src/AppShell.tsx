import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import type { ReactNode } from "react";

/**
 * Heavy app shell — pulled out of the landing critical chain.
 * Loads ~80 kB of providers (query, sonner, radix-toast/tooltip, currency).
 * Only mounted for routes that actually need them via lazy import in App.tsx.
 */
const queryClient = new QueryClient();

const AppShell = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <CurrencyProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {children}
      </TooltipProvider>
    </CurrencyProvider>
  </QueryClientProvider>
);

export default AppShell;
