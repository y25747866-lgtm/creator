import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import Landing from "./pages/Landing";
import Blog from "./pages/Blog";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy load non-critical pages
import Dashboard from "./pages/Dashboard";
import Downloads from "./pages/Downloads";
import Settings from "./pages/Settings";
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Contact = lazy(() => import("./pages/Contact"));
const WhopSuccess = lazy(() => import("./pages/WhopSuccess"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProductsDashboard = lazy(() => import("./pages/dashboard/ProductsDashboard"));
const MarketingStudio = lazy(() => import("./pages/dashboard/MarketingStudio"));
const SalesPageBuilder = lazy(() => import("./pages/dashboard/SalesPageBuilder"));
const AnalyticsDashboard = lazy(() => import("./pages/dashboard/AnalyticsDashboard"));

import ViewableRoute from "./components/ViewableRoute";

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-[24vh] items-center justify-center bg-[#0A0A0A] text-white" role="status" aria-live="polite">
    <span className="sr-only">Loading page</span>
    <span className="h-4 w-4 animate-spin rounded-full border border-white/20 border-t-white" aria-hidden="true" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LazyMotion features={domAnimation}>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/" element={<Blog />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/whop/success" element={<WhopSuccess />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/ebook-generator" element={<Dashboard />} />
                <Route
                  path="/dashboard/downloads"
                  element={
                    <ViewableRoute>
                      <Downloads />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/settings"
                  element={
                    <ViewableRoute>
                      <Settings />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/products"
                  element={
                    <ViewableRoute>
                      <ProductsDashboard />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/marketing-studio"
                  element={
                    <ViewableRoute>
                      <MarketingStudio />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/sales-page-builder"
                  element={
                    <ViewableRoute>
                      <SalesPageBuilder />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/analytics"
                  element={
                    <ViewableRoute>
                      <AnalyticsDashboard />
                    </ViewableRoute>
                  }
                />
                {import.meta.env.DEV && <Route path="/__preview/chat-first-ebook" element={<Dashboard />} />}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </LazyMotion>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
