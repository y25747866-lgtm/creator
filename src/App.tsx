import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import Landing from "./pages/Landing";
import Blog from "./pages/Blog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

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
const ProjectsPage = lazy(() => import("./pages/dashboard/ProjectsPage"));
const MarketingStudio = lazy(() => import("./pages/dashboard/MarketingStudio"));
const SalesPageBuilder = lazy(() => import("./pages/dashboard/SalesPageBuilder"));
const AnalyticsDashboard = lazy(() => import("./pages/dashboard/AnalyticsDashboard"));
const ConnectorsPage = lazy(() => import("./pages/ConnectorsPage"));
const SkillsPage = lazy(() => import("./pages/dashboard/SkillsPage"));

import ViewableRoute from "./components/ViewableRoute";
import { AuthProvider, useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

const AppShellSkeleton = () => (
  <div className="app-shell-skeleton flex min-h-screen bg-[#080A0C]" role="status" aria-label="Loading NexoraOS">
    <aside className="sidebar-skeleton hidden w-[280px] shrink-0 border-r border-white/10 p-4 md:block">
      <Skeleton className="mb-8 h-7 w-32" />
      <div className="space-y-3">
        {["w-4/5", "w-3/5", "w-3/4", "w-1/2", "w-2/3", "w-3/4"].map((width, index) => <Skeleton key={index} className={`h-5 ${width}`} />)}
      </div>
    </aside>
    <main className="main-skeleton flex min-w-0 flex-1 flex-col items-center px-4 pt-20 sm:px-8">
      <div className="mb-6 flex w-full max-w-3xl justify-center gap-3"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-16 w-16 rounded-full" /></div>
      <Skeleton className="mb-5 h-28 w-full max-w-[420px]" />
      <div className="mb-5 flex w-full max-w-3xl justify-center gap-2 overflow-hidden"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-28 rounded-full" /><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-28 rounded-full" /></div>
      <Skeleton className="h-20 w-full max-w-3xl rounded-xl" />
    </main>
  </div>
);
const PageLoader = AppShellSkeleton;

const AuthRoute = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AppShellSkeleton />;
  if (session) {
    const redirect = new URLSearchParams(location.search).get("redirect") || "/dashboard";
    return <Navigate to={redirect} replace />;
  }
  return <Auth />;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" storageKey="nexora-theme" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LazyMotion features={domAnimation}>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/" element={<Blog />} />
                <Route path="/auth" element={<AuthRoute />} />
                <Route path="/auth/signin" element={<AuthRoute />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/whop/success" element={<WhopSuccess />} />
                <Route path="/dashboard" element={<ViewableRoute allowGuestPreview><Dashboard /></ViewableRoute>} />
                <Route path="/dashboard/ebook-generator" element={<ViewableRoute><Dashboard /></ViewableRoute>} />
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
                  path="/dashboard/skills"
                  element={
                    <ViewableRoute>
                      <SkillsPage />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/app/connectors"
                  element={
                    <ViewableRoute>
                      <ConnectorsPage />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/products"
                  element={
                    <ViewableRoute>
                      <ProjectsPage />
                    </ViewableRoute>
                  }
                />
                <Route
                  path="/dashboard/analytics/products"
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
          </AuthProvider>
        </LazyMotion>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
