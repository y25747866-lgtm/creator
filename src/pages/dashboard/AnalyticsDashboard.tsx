import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { keysetCursorFilter, toKeysetPage, type KeysetCursor } from "@/lib/keysetPagination";
import {
  Link2, Unlink, RefreshCw, DollarSign, ShoppingCart, Package, TrendingUp,
  Send, Bot, User, Loader2, BarChart2, Lock,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import whopLogo from "@/assets/whop-logo.webp";
import payhipLogo from "@/assets/payhip-logo.webp";

interface PlatformConnection { 
  platform: string; 
  status: string; 
  connected_at: string; 
  last_sync_at: string | null; 
}

interface AnalyticsData { 
  summary: { 
    totalRevenue: number; 
    totalSales: number; 
    activeProducts: number; 
    conversionRate: number 
    completedSales?: number;
  };
  products: any[]; 
  orders: any[]; 
  nextCursors?: { whop: { products: string | null; orders: string | null } | null };
}

interface ChatMessage { 
  role: "user" | "assistant"; 
  content: string; 
  id?: string;
  created_at?: string; 
  clientId?: string;
  status?: "sending" | "failed";
}

const PLATFORMS = [
  { id: "whop", name: "Whop", description: "Connect your Whop store to track memberships, products, and revenue.", logo: whopLogo },
  { id: "payhip", name: "Payhip", description: "Connect Payhip to track digital product sales and downloads.", logo: payhipLogo },
];

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPaidSubscription, subscription, loading: subLoading } = useSubscription();

  const isExpired = subscription?.status === "expired";
  const hasAccess = hasPaidSubscription && !isExpired;

  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // FIX: Initialize chatMessages as guaranteed empty array
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatCursor, setChatCursor] = useState<KeysetCursor | null>(null);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatLoadingEarlier, setChatLoadingEarlier] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const shouldScrollChatToEnd = useRef(true);
  const [visibleProductsCount, setVisibleProductsCount] = useState(20);
  const [loadingMoreProviderResults, setLoadingMoreProviderResults] = useState(false);

  // Load connections
  useEffect(() => {
    if (!user || !hasAccess) {
      setConnections([]);
      setLoadingConnections(false);
      return;
    }
    
    const loadConnections = async () => {
      setLoadingConnections(true);
      try {
        const { data, error } = await supabase
          .from("platform_connections")
          .select("platform, status, connected_at, last_sync_at")
          .eq("user_id", user.id)
          .eq("status", "connected");
        
        if (error) throw error;
        // FIX: Always ensure connections is an array
        setConnections(Array.isArray(data) ? (data as PlatformConnection[]) : []);
      } catch (error) {
        console.error("Error loading connections:", error);
        setConnections([]);
      } finally {
        setLoadingConnections(false);
      }
    };

    loadConnections();
  }, [user?.id, hasAccess]);

  // Load analytics data
  useEffect(() => {
    if (!user || !hasAccess || connections.length === 0) {
      setAnalytics(null);
      setHasLoadedData(false);
      return;
    }

    const loadAnalytics = async () => {
      setLoadingData(true);
      setVisibleProductsCount(20);
      try {
        const { data, error } = await supabase.functions.invoke("analytics-fetch", {
          body: { platform: platformFilter === "all" ? undefined : platformFilter }
        });
        
        if (error) throw error;
        
        if (data && typeof data === 'object' && 'summary' in data) {
          // Normalize products and orders to ensure they are arrays
          let products: any[] = [];
          let orders: any[] = [];
          
          if (Array.isArray(data.products)) {
            products = data.products;
          }
          if (Array.isArray(data.orders)) {
            orders = data.orders;
          }
          
          setAnalytics({
            summary: data.summary || { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0, completedSales: 0 },
            products,
            orders,
            nextCursors: data.nextCursors || { whop: null },
          });
        } else {
          setAnalytics({ summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0, completedSales: 0 }, products: [], orders: [], nextCursors: { whop: null } });
        }
        setHasLoadedData(true);
      } catch (e: any) {
        console.error("Analytics fetch error:", e);
        toast({ title: "Failed to fetch data", description: e?.message || "Unknown error", variant: "destructive" });
        setAnalytics(null);
      } finally {
        setLoadingData(false);
      }
    };

    loadAnalytics();
  }, [user?.id, platformFilter, connections.length, hasAccess]);

  // Load chat messages and subscribe to real-time updates
  useEffect(() => {
    if (!user || !hasAccess) {
      setChatMessages([]);
      setChatCursor(null);
      setChatHasMore(false);
      return;
    }

    const loadChatMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("analytics_chat_messages")
          .select("id, role, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(21);
        
        if (error) throw error;
        const page = toKeysetPage(Array.isArray(data) ? data : []);
        const persistedMessages = page.items.reverse() as ChatMessage[];
        setChatCursor(page.nextCursor);
        setChatHasMore(page.hasMore);
        setChatMessages((current) => {
          const unsavedOptimistic = current.filter((localMessage) => {
            if (!localMessage.clientId) return false;
            if (localMessage.status === "failed") return true;
            return !persistedMessages.some((savedMessage) => {
              if (savedMessage.role !== localMessage.role || savedMessage.content !== localMessage.content) return false;
              const savedAt = Date.parse(savedMessage.created_at || "");
              const localAt = Date.parse(localMessage.created_at || "");
              return Number.isFinite(savedAt) && Number.isFinite(localAt) && Math.abs(savedAt - localAt) < 30_000;
            });
          });
          return [...persistedMessages, ...unsavedOptimistic];
        });
      } catch (error) {
        console.error("Error loading chat messages:", error);
        setChatMessages((current) => current.filter((message) => Boolean(message.clientId)));
      }
    };

    loadChatMessages();
  }, [user?.id, hasAccess]);

  useEffect(() => {
    if (!shouldScrollChatToEnd.current) {
      shouldScrollChatToEnd.current = true;
      return;
    }
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const loadEarlierMessages = async () => {
    if (!user || !chatCursor || !chatHasMore || chatLoadingEarlier) return;
    setChatLoadingEarlier(true);
    shouldScrollChatToEnd.current = false;
    try {
      const { data, error } = await supabase
        .from("analytics_chat_messages")
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .or(keysetCursorFilter(chatCursor))
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(21);
      if (error) throw error;
      const page = toKeysetPage(Array.isArray(data) ? data : []);
      const olderMessages = page.items.reverse() as ChatMessage[];
      setChatCursor(page.nextCursor);
      setChatHasMore(page.hasMore);
      setChatMessages((current) => {
        const currentIds = new Set(current.map((message) => message.id).filter(Boolean));
        return [...olderMessages.filter((message) => !message.id || !currentIds.has(message.id)), ...current];
      });
    } catch (error) {
      shouldScrollChatToEnd.current = true;
      console.error("Error loading earlier analytics messages:", error);
      toast({ title: "Could not load earlier messages", variant: "destructive" });
    } finally {
      setChatLoadingEarlier(false);
    }
  };

  const fetchConnections = useCallback(async () => {
    if (!user || !hasAccess) return;
    setLoadingConnections(true);
    try {
      const { data, error } = await supabase
        .from("platform_connections")
        .select("platform, status, connected_at, last_sync_at")
        .eq("user_id", user.id)
        .eq("status", "connected");
      
      if (error) throw error;
      // FIX: Always ensure connections is an array
      setConnections(Array.isArray(data) ? (data as PlatformConnection[]) : []);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  }, [user?.id, hasAccess]);

  const handleConnect = useCallback(async () => {
    if (!apiKeyInput.trim() || !connectModal || !hasAccess) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-connect", {
        body: { platform: connectModal, apiKey: apiKeyInput.trim() }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Connection failed");
      
      toast({ title: "Connected!", description: `${connectModal} account connected successfully.` });
      setConnectModal(null);
      setApiKeyInput("");
      await fetchConnections();
    } catch (e: any) {
      console.error("Connection error:", e);
      toast({ title: "Connection failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  }, [apiKeyInput, connectModal, fetchConnections, toast, hasAccess]);

  const handleDisconnect = useCallback(async (platform: string) => {
    if (!hasAccess) return;
    try {
      const { error } = await supabase.functions.invoke("analytics-connect", {
        body: { platform, action: "disconnect" }
      });
      
      if (error) throw error;
      
      toast({ title: "Disconnected", description: `${platform} has been disconnected.` });
      await fetchConnections();
      setAnalytics(null);
      setHasLoadedData(false);
    } catch (e: any) {
      console.error("Disconnect error:", e);
      toast({ title: "Error", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }, [fetchConnections, toast, hasAccess]);

  const loadMoreProviderResults = async () => {
    if (!analytics || loadingMoreProviderResults) return;
    if (analytics.products.length > visibleProductsCount) {
      setVisibleProductsCount((count) => count + 20);
      return;
    }
    const whopCursors = analytics.nextCursors?.whop;
    if (!whopCursors || (!whopCursors.products && !whopCursors.orders)) return;
    setLoadingMoreProviderResults(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-fetch", {
        body: { platform: "whop", cursors: { whop: whopCursors } },
      });
      if (error) throw error;
      const incomingProducts = Array.isArray(data?.products) ? data.products : [];
      const incomingOrders = Array.isArray(data?.orders) ? data.orders : [];
      setAnalytics((current) => {
        if (!current) return current;
        const productsById = new Map(current.products.map((product) => [`${product.platform}:${product.id}`, product]));
        for (const product of incomingProducts) productsById.set(`${product.platform}:${product.id}`, product);
        const ordersById = new Map(current.orders.map((order) => [`${order.platform}:${order.id}`, order]));
        for (const order of incomingOrders) ordersById.set(`${order.platform}:${order.id}`, order);
        const summary = data?.summary ?? {};
        const totalSales = current.summary.totalSales + (Number(summary.totalSales) || 0);
        const completedSales = (current.summary.completedSales || 0) + (Number(summary.completedSales) || 0);
        return {
          ...current,
          products: Array.from(productsById.values()),
          orders: Array.from(ordersById.values()).sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || String(b.id).localeCompare(String(a.id))),
          summary: {
            totalRevenue: current.summary.totalRevenue + (Number(summary.totalRevenue) || 0),
            totalSales,
            activeProducts: current.summary.activeProducts + (Number(summary.activeProducts) || 0),
            completedSales,
            conversionRate: totalSales > 0 ? Number(((completedSales / totalSales) * 100).toFixed(2)) : 0,
          },
          nextCursors: data?.nextCursors || { whop: null },
        };
      });
      setVisibleProductsCount((count) => count + 20);
    } catch (error) {
      toast({ title: "Could not load provider results", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoadingMoreProviderResults(false);
    }
  };

  const handleSendChat = useCallback(async (retryContent?: string, retryClientId?: string) => {
    const msg = (retryContent ?? chatInput).trim();
    if (!msg || chatLoading || !user || !hasAccess) return;

    const clientId = retryClientId ?? crypto.randomUUID();
    if (retryClientId) {
      setChatMessages((current) => current.map((message) =>
        message.clientId === clientId ? { ...message, status: "sending" } : message,
      ));
    } else {
      setChatInput("");
      setChatMessages((current) => [...current, {
        role: "user",
        content: msg,
        created_at: new Date().toISOString(),
        clientId,
        status: "sending",
      }]);
    }
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("analytics-chat", {
        body: {
          message: msg,
          analyticsContext: analytics,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.reply) throw new Error("AI Advisor did not return a response.");

      setChatMessages((current) => [
        ...current.map((message) => message.clientId === clientId ? { ...message, status: undefined } : message),
        {
          role: "assistant",
          content: data.reply,
          created_at: new Date().toISOString(),
          clientId: `${clientId}-reply`,
        },
      ]);
    } catch (e: any) {
      setChatMessages((current) => current.map((message) =>
        message.clientId === clientId ? { ...message, status: "failed" } : message,
      ));
      toast({ title: "Chat failed", description: e?.message || "AI Advisor is currently unavailable", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, user, analytics, toast, hasAccess]);

  const revenueData = useMemo(() => {
    // Ensure orders is an array before using array methods
    const orders = Array.isArray(analytics?.orders) ? analytics.orders : [];
    if (!orders || orders.length === 0) return [];
    
    const groups: Record<string, number> = {};
    orders.forEach(order => {
      const date = new Date(order.date).toLocaleDateString();
      groups[date] = (groups[date] || 0) + order.amount;
    });
    
    return Object.entries(groups)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }, [analytics?.orders]);

  if (subLoading) {
    return (
      <DashboardLayout>
        <div style={{ background: '#0A0A0A', padding: '0' }} className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ background: '#0A0A0A', padding: '0' }} className="w-full relative">
        {/* HARD UI LOCK FOR EXPIRED/FREE USERS */}
        {!hasAccess && (
          <UpgradeOverlay message={isExpired ? "Your subscription has expired. Please renew to continue using Analytics." : "Analytics is a premium feature. Upgrade to track your revenue and get AI-powered insights."} />
        )}

        <div className={!hasAccess ? "opacity-50 pointer-events-none" : ""} style={{ padding: '48px 40px' }}>
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '32px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                Analytics Dashboard
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#777777', marginTop: '12px', fontWeight: 400 }}>
                Real-time insights into your sales, revenue, and product performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger 
                  style={{ 
                    background: '#0F0F0F', 
                    border: '1px solid #252525', 
                    borderRadius: '8px', 
                    color: '#FFFFFF',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    padding: '10px 16px',
                    fontWeight: 500
                  }}
                  className="w-[180px]"
                >
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="whop">Whop</SelectItem>
                  <SelectItem value="payhip">Payhip</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => {
                  if (connections.length > 0) {
                    setAnalytics(null);
                    setHasLoadedData(false);
                  }
                }}
                disabled={loadingData || connections.length === 0}
                style={{ color: '#666666', background: '#0F0F0F', border: '1px solid #252525' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#333333'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#666666'; e.currentTarget.style.borderColor = '#252525'; }}
              >
                <RefreshCw className={cn("w-4 h-4", loadingData && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Platform Connection Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '32px' }} className="mb-12">
            {PLATFORMS.map(platform => {
              const connection = connections.find(c => c.platform === platform.id);
              const isConnected = !!connection;
              
              return (
                <div 
                  key={platform.id}
                  style={{
                    background: '#0F0F0F',
                    border: '1px solid #252525',
                    borderRadius: '12px',
                    padding: '24px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#333333';
                    e.currentTarget.style.background = '#121212';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#252525';
                    e.currentTarget.style.background = '#0F0F0F';
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px', fontFamily: "'Syne', sans-serif" }}>{platform.name}</h3>
                      <p style={{ fontSize: '13px', color: '#777777', fontFamily: "'DM Sans', sans-serif", lineHeight: '1.5' }}>{platform.description}</p>
                    </div>
                    <img src={platform.logo} alt={platform.name} width="48" height="48" loading="lazy" style={{ width: '48px', height: '48px' }} />
                  </div>
                  
                  {isConnected ? (
                    <div className="mt-6 space-y-3">
                      <div style={{ fontSize: '12px', color: '#777777', fontFamily: "'DM Sans', sans-serif" }}>
                        <p>Connected on {new Date(connection.connected_at).toLocaleDateString()}</p>
                        {connection.last_sync_at && <p>Last synced: {new Date(connection.last_sync_at).toLocaleString()}</p>}
                      </div>
                      <Button 
                        onClick={() => handleDisconnect(platform.id)} 
                        disabled={!hasAccess}
                        style={{
                          background: 'transparent',
                          border: '1px solid #252525',
                          color: '#FFFFFF',
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 600,
                          padding: '11px 24px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF6B6B'; e.currentTarget.style.color = '#FF6B6B'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#FFFFFF'; }}
                      >
                        <Unlink className="w-4 h-4 mr-2" /> Disconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 flex gap-2">
                      <Button 
                        onClick={() => setConnectModal(platform.id)} 
                        disabled={!hasAccess}
                        style={{
                          background: '#FFFFFF',
                          color: '#0A0A0A',
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 700,
                          padding: '11px 24px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '14px',
                          letterSpacing: '-0.3px'
                        }}
                      >
                        Connect {platform.name}
                      </Button>
                      <Button 
                        onClick={() => setConnectModal("payhip")} 
                        disabled={!hasAccess}
                        style={{
                          background: 'transparent',
                          border: '1px solid #252525',
                          color: '#FFFFFF',
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 600,
                          padding: '11px 24px',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.background = '#1A1A1A'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        Connect Payhip
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {connections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px', fontFamily: "'Syne', sans-serif" }}>No Platforms Connected</h3>
              <p style={{ fontSize: '14px', color: '#777777', fontFamily: "'DM Sans', sans-serif", marginBottom: '24px' }}>Connect Whop or Payhip to start tracking your analytics</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                  { icon: DollarSign, label: 'Total Revenue', value: analytics?.summary.totalRevenue, format: (v: number) => `$${v.toLocaleString()}` },
                  { icon: ShoppingCart, label: 'Total Sales', value: analytics?.summary.totalSales, format: (v: number) => v.toLocaleString() },
                  { icon: Package, label: 'Active Products', value: analytics?.summary.activeProducts, format: (v: number) => v.toString() },
                  { icon: TrendingUp, label: 'Conv. Rate', value: analytics?.summary.conversionRate, format: (v: number) => `${v}%` }
                ].map((stat, i) => (
                  <div key={i} style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '24px' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ padding: '10px', borderRadius: '10px', background: '#1A1A1A' }}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#777777', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Sans', sans-serif" }}>{stat.label}</span>
                    </div>
                    <div className="text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.5px' }}>
                      {loadingData ? <Skeleton className="h-8 w-24" /> : stat.format(stat.value || 0)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Charts & Tables */}
                <div className="lg:col-span-8 space-y-8">
                  <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '28px', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.3px' }}>Revenue Overview</h3>
                    <div className="h-[320px] w-full">
                      {loadingData ? (
                        <Skeleton className="w-full h-full rounded-xl" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.12}/>
                                <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 12, fill: '#555555', fontFamily: "'DM Sans', sans-serif"}}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 12, fill: '#555555', fontFamily: "'DM Sans', sans-serif"}}
                              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#0F0F0F', 
                                borderColor: '#252525',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#FFFFFF',
                                fontFamily: "'DM Sans', sans-serif",
                                border: '1px solid #252525'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="amount" 
                              stroke="#FFFFFF"
                              strokeOpacity={0.9}
                              strokeWidth={2}
                              fill="url(#colorRev)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Products Table */}
                  <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '28px', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.3px' }}>Top Products</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow style={{ borderBottomColor: '#252525' }}>
                            <TableHead style={{ color: '#777777', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Product</TableHead>
                            <TableHead style={{ color: '#777777', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Sales</TableHead>
                            <TableHead style={{ color: '#777777', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingData ? (
                            [1, 2, 3].map(i => (
                              <TableRow key={i} style={{ borderBottomColor: '#252525' }}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                              </TableRow>
                            ))
                          ) : analytics?.products && analytics.products.length > 0 ? (
                            analytics.products.slice(0, visibleProductsCount).map((product, i) => (
                              <TableRow key={`${product.platform}:${product.id ?? i}`} style={{ borderBottomColor: '#252525' }}>
                                <TableCell style={{ color: '#FFFFFF', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{product.name}</TableCell>
                                <TableCell style={{ color: '#FFFFFF', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{product.sales}</TableCell>
                                <TableCell style={{ color: '#FFFFFF', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>${product.revenue}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} style={{ textAlign: 'center', color: '#777777', padding: '32px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
                                No products data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {(analytics?.products?.length > visibleProductsCount || Boolean(analytics?.nextCursors?.whop && (analytics.nextCursors.whop.products || analytics.nextCursors.whop.orders))) && (
                      <div className="mt-4 flex justify-center">
                        <Button variant="outline" onClick={loadMoreProviderResults} disabled={loadingMoreProviderResults}>
                          {loadingMoreProviderResults ? "Loading provider results…" : "Load more provider results"}
                        </Button>
                      </div>
                    )}
                    {connections.some((connection) => connection.platform === "payhip") && (
                      <p className="mt-3 text-xs text-muted-foreground">Payhip's current API documentation does not provide cursor parameters for these list endpoints; this view uses the records returned by the API response.</p>
                    )}
                  </div>
                </div>

                {/* Chat Sidebar */}
                <div className="lg:col-span-4">
                  <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px', height: '640px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.3px' }}>AI Advisor</h3>
                    <ScrollArea className="flex-1 mb-4">
                      <div className="space-y-4 pr-4">
                        {chatHasMore && (
                          <div className="flex justify-center">
                            <Button variant="outline" size="sm" onClick={loadEarlierMessages} disabled={chatLoadingEarlier}>
                              {chatLoadingEarlier ? "Loading earlier messages…" : "Load earlier messages"}
                            </Button>
                          </div>
                        )}
                        {/* FIX: Guard chatMessages with Array.isArray before mapping */}
                        {!Array.isArray(chatMessages) || chatMessages.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#777777', fontSize: '13px', paddingTop: '32px', fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                            Ask me anything about your analytics
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={msg.clientId ?? msg.id ?? `${msg.role}-${msg.created_at ?? i}`} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                              {msg.role === "assistant" && (
                                <div style={{ width: '28px', height: '28px', background: '#1A1A1A', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #2A2A2A' }}>
                                  <Bot className="w-4 h-4 text-white" />
                                </div>
                              )}
                              <div 
                                style={{
                                  background: msg.role === "user" ? '#FFFFFF' : '#1A1A1A',
                                  color: msg.role === "user" ? '#0A0A0A' : '#FFFFFF',
                                  padding: '10px 14px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  maxWidth: '80%',
                                  wordWrap: 'break-word',
                                  fontFamily: "'DM Sans', sans-serif",
                                  fontWeight: 400,
                                  border: msg.role === "assistant" ? '1px solid #2A2A2A' : 'none'
                                }}
                              >
                                {msg.content}
                                {msg.status === "sending" && <div className="mt-1 text-[10px] opacity-60">Sending…</div>}
                                {msg.status === "failed" && msg.clientId && (
                                  <div className="mt-2 flex items-center justify-end gap-2 text-[10px]">
                                    <span role="status">Not sent</span>
                                    <Button variant="ghost" size="sm" disabled={chatLoading} onClick={() => handleSendChat(msg.content, msg.clientId)} className="h-6 px-2 text-[10px]">
                                      Retry
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {chatLoading && (
                          <div className="flex justify-start gap-3" role="status" aria-label="AI Advisor is responding">
                            <div style={{ width: '28px', height: '28px', background: '#1A1A1A', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #2A2A2A' }}>
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div style={{ background: '#1A1A1A', color: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid #2A2A2A' }}>Thinking…</div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                        placeholder="Ask about your data..."
                        disabled={chatLoading}
                        style={{
                          background: '#0A0A0A',
                          border: '1px solid #252525',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          fontFamily: "'DM Sans', sans-serif"
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => handleSendChat()}
                        disabled={chatLoading || !chatInput.trim()}
                        style={{
                          background: '#FFFFFF',
                          color: '#0A0A0A',
                          borderRadius: '8px'
                        }}
                      >
                        {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connect Modal */}
      <Dialog open={!!connectModal} onOpenChange={() => setConnectModal(null)}>
        <DialogContent style={{ background: '#0F0F0F', border: '1px solid #252525', color: '#FFFFFF', borderRadius: '12px' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#FFFFFF', fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700 }}>Connect {connectModal}</DialogTitle>
            <DialogDescription style={{ color: '#777777', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>
              Enter your {connectModal} API key to start syncing data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="API Key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              style={{
                background: '#0A0A0A',
                border: '1px solid #252525',
                color: '#FFFFFF',
                padding: '10px 14px',
                borderRadius: '8px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px'
              }}
            />
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setConnectModal(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #252525',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  padding: '10px 20px',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.background = '#1A1A1A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.background = 'transparent'; }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={connecting || !apiKeyInput.trim()}
                style={{
                  background: '#FFFFFF',
                  color: '#0A0A0A',
                  borderRadius: '8px',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  padding: '10px 20px',
                  fontSize: '14px'
                }}
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
