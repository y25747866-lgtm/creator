import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import Landing from "./pages/Landing";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy load non-critical pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EbookGenerator = lazy(() => import("./pages/EbookGenerator"));
const Downloads = lazy(() => import("./pages/Downloads"));
const Settings = lazy(() => import("./pages/Settings"));
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

const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const ViewableRoute = lazy(() => import("./components/ViewableRoute"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/whop/success" element={<WhopSuccess />} />
                <Route
                  path="/dashboard"
                  element={
                    <ViewableRoute>
                      <Dashboard />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/product-generator"
                  element={
                    <ViewableRoute>
                      <EbookGenerator />
                    </ViewableRoute>
                  }
                />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
