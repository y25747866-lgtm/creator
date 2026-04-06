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
import {
  Link2, Unlink, RefreshCw, DollarSign, ShoppingCart, Package, TrendingUp,
  Send, Bot, User, Loader2, BarChart2, Lock,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import whopLogo from "@/assets/whop-logo.png";
import payhipLogo from "@/assets/payhip-logo.png";

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
  }; 
  products: any[]; 
  orders: any[]; 
}

interface ChatMessage { 
  role: "user" | "assistant"; 
  content: string; 
  created_at?: string; 
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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        setConnections((data as PlatformConnection[]) || []);
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
      try {
        const { data, error } = await supabase.functions.invoke("analytics-fetch", {
          body: { platform: platformFilter === "all" ? undefined : platformFilter }
        });
        
        if (error) throw error;
        
        if (data && typeof data === 'object' && 'summary' in data) {
          setAnalytics(data as AnalyticsData);
        } else {
          setAnalytics({ summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [], orders: [] });
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

  // Load chat messages
  useEffect(() => {
    if (!user || !hasAccess) {
      setChatMessages([]);
      return;
    }

    const loadChatMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("analytics_chat_messages")
          .select("role, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(50);
        
        if (error) throw error;
        if (data) setChatMessages((data as ChatMessage[]) || []);
      } catch (error) {
        console.error("Error loading chat messages:", error);
      }
    };

    loadChatMessages();
  }, [user?.id, hasAccess]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

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
      setConnections((data as PlatformConnection[]) || []);
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

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !user || !hasAccess) return;
    
    const msg = chatInput.trim();
    setChatInput("");
    
    setChatMessages((prev) => [...(prev || []), { role: "user", content: msg, created_at: new Date().toISOString() }]);
    setChatLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("analytics-chat", {
        body: { 
          message: msg,
          analyticsContext: analytics
        }
      });
      
      if (error) throw error;
      
      if (data?.reply) {
        setChatMessages((prev) => [...(prev || []), { role: "assistant", content: data.reply, created_at: new Date().toISOString() }]);
      }
    } catch (e: any) {
      console.error("Chat error:", e);
      toast({ title: "Chat failed", description: e?.message || "AI Advisor is currently unavailable", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, user, analytics, toast, hasAccess]);

  const revenueData = useMemo(() => {
    if (!analytics?.orders || analytics.orders.length === 0) return [];
    
    const groups: Record<string, number> = {};
    analytics.orders.forEach(order => {
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
        <div style={{ background: '#0A0A0A', padding: '40px' }} className="space-y-8">
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
      <div style={{ background: '#0A0A0A', padding: '40px' }} className="max-w-7xl mx-auto relative">
        {/* HARD UI LOCK FOR EXPIRED/FREE USERS */}
        {!hasAccess && (
          <UpgradeOverlay message={isExpired ? "Your subscription has expired. Please renew to continue using Analytics." : "Analytics is a premium feature. Upgrade to track your revenue and get AI-powered insights."} />
        )}

        <div className={!hasAccess ? "opacity-50 pointer-events-none" : ""}>
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 700, color: '#FFFFFF' }}>
                Analytics Dashboard
              </h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#555555', marginTop: '8px' }}>
                Track your sales, revenue, and product performance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger 
                  style={{ 
                    background: '#111111', 
                    border: '1px solid #1A1A1A', 
                    borderRadius: '6px', 
                    color: '#FFFFFF',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    padding: '8px 14px'
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
                style={{ color: '#555555' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#555555'}
              >
                <RefreshCw className={cn("w-4 h-4", loadingData && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Platform Connection Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }} className="mb-8">
            {PLATFORMS.map(platform => {
              const connection = connections.find(c => c.platform === platform.id);
              const isConnected = !!connection;
              
              return (
                <div 
                  key={platform.id}
                  style={{
                    background: '#111111',
                    border: '1px solid #1A1A1A',
                    borderRadius: '10px',
                    padding: '20px'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          background: '#1A1A1A',
                          border: '1px solid #222222',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <BarChart2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                          {platform.name}
                        </h3>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#666666', marginTop: '4px' }}>
                          {platform.description}
                        </p>
                      </div>
                    </div>
                    {isConnected ? (
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Connected
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] text-muted-foreground hover:text-destructive"
                          onClick={() => handleDisconnect(platform.id)}
                        >
                          <Unlink className="w-3 h-3 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setConnectModal(platform.id)}
                        disabled={!hasAccess}
                        style={{
                          background: 'transparent',
                          border: '1px solid #1A1A1A',
                          color: '#FFFFFF',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '8px 14px',
                          borderRadius: '6px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                      >
                        <Link2 className="w-4 h-4" />
                        Connect
                      </Button>
                    )}
                  </div>
                  {isConnected && connection.last_sync_at && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#666666' }}>
                      <span>Last synced: {new Date(connection.last_sync_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Analytics Content */}
          {!hasLoadedData && !loadingData ? (
            <div 
              style={{
                background: '#111111',
                border: '1px dashed #1A1A1A',
                borderRadius: '10px',
                padding: '60px 32px',
                textAlign: 'center',
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#1A1A1A',
                  border: '1px solid #222222',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <BarChart2 className="w-[18px] h-[18px] text-white" />
              </div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                No Data to Display
              </h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#666666', maxWidth: '320px', margin: '8px auto 24px' }}>
                {connections.length === 0 
                  ? "Connect your Whop or Payhip account to start tracking your business performance."
                  : "We're ready to fetch your data. Click the refresh button to sync."}
              </p>
              {connections.length === 0 && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Button 
                    onClick={() => setConnectModal("whop")} 
                    disabled={!hasAccess}
                    style={{
                      background: '#FFFFFF',
                      color: '#0A0A0A',
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none'
                    }}
                  >
                    Connect Whop
                  </Button>
                  <Button 
                    onClick={() => setConnectModal("payhip")} 
                    disabled={!hasAccess}
                    style={{
                      background: 'transparent',
                      border: '1px solid #1A1A1A',
                      color: '#FFFFFF',
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 600,
                      padding: '10px 20px',
                      borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                  >
                    Connect Payhip
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6" style={{ background: '#111111', border: '1px solid #1A1A1A' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div style={{ padding: '8px', borderRadius: '8px', background: '#1A1A1A' }}>
                      <DollarSign className="w-4 h-4 text-white" />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {loadingData ? <Skeleton className="h-8 w-24" /> : `$${analytics?.summary.totalRevenue.toLocaleString()}`}
                  </div>
                </Card>
                <Card className="p-6" style={{ background: '#111111', border: '1px solid #1A1A1A' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div style={{ padding: '8px', borderRadius: '8px', background: '#1A1A1A' }}>
                      <ShoppingCart className="w-4 h-4 text-white" />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sales</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {loadingData ? <Skeleton className="h-8 w-16" /> : analytics?.summary.totalSales.toLocaleString()}
                  </div>
                </Card>
                <Card className="p-6" style={{ background: '#111111', border: '1px solid #1A1A1A' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div style={{ padding: '8px', borderRadius: '8px', background: '#1A1A1A' }}>
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Products</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {loadingData ? <Skeleton className="h-8 w-12" /> : analytics?.summary.activeProducts}
                  </div>
                </Card>
                <Card className="p-6" style={{ background: '#111111', border: '1px solid #1A1A1A' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div style={{ padding: '8px', borderRadius: '8px', background: '#1A1A1A' }}>
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conv. Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {loadingData ? <Skeleton className="h-8 w-16" /> : `${analytics?.summary.conversionRate}%`}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Charts & Tables */}
                <div className="lg:col-span-8 space-y-8">
                  <Card className="p-6" style={{ background: '#111111', border: '1px solid #1A1A1A' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '24px' }}>Revenue Overview</h3>
                    <div className="h-[300px] w-full">
                      {loadingData ? (
                        <Skeleton className="w-full h-full rounded-xl" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 11, fill: '#333333'}}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 11, fill: '#333333'}}
                              tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#111111', 
                                borderColor: '#1A1A1A',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#FFFFFF'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="amount" 
                              stroke="#FFFFFF"
                              strokeOpacity={0.8}
                              fill="url(#colorRev)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Card>

                  {/* Products Table */}
                  <Card className="p-6" style={{ background: '#111111', border: '1px solid #1A1A1A' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '24px' }}>Top Products</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow style={{ borderBottomColor: '#1A1A1A' }}>
                            <TableHead style={{ color: '#666666', fontSize: '12px' }}>Product</TableHead>
                            <TableHead style={{ color: '#666666', fontSize: '12px' }}>Sales</TableHead>
                            <TableHead style={{ color: '#666666', fontSize: '12px' }}>Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingData ? (
                            [1, 2, 3].map(i => (
                              <TableRow key={i} style={{ borderBottomColor: '#1A1A1A' }}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                              </TableRow>
                            ))
                          ) : analytics?.products && analytics.products.length > 0 ? (
                            analytics.products.map((product, i) => (
                              <TableRow key={i} style={{ borderBottomColor: '#1A1A1A' }}>
                                <TableCell style={{ color: '#FFFFFF', fontSize: '12px' }}>{product.name}</TableCell>
                                <TableCell style={{ color: '#FFFFFF', fontSize: '12px' }}>{product.sales}</TableCell>
                                <TableCell style={{ color: '#FFFFFF', fontSize: '12px' }}>${product.revenue}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} style={{ textAlign: 'center', color: '#666666', padding: '24px' }}>
                                No products data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>

                {/* Chat Sidebar */}
                <div className="lg:col-span-4">
                  <Card className="p-6 h-[600px] flex flex-col" style={{ background: '#111111', border: '1px solid #1A1A1A' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>AI Advisor</h3>
                    <ScrollArea className="flex-1 mb-4">
                      <div className="space-y-4 pr-4">
                        {chatMessages.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#666666', fontSize: '12px', paddingTop: '24px' }}>
                            Ask me anything about your analytics
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                              {msg.role === "assistant" && (
                                <div style={{ width: '24px', height: '24px', background: '#1A1A1A', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <Bot className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <div 
                                style={{
                                  background: msg.role === "user" ? '#FFFFFF' : '#1A1A1A',
                                  color: msg.role === "user" ? '#0A0A0A' : '#FFFFFF',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  maxWidth: '80%',
                                  wordWrap: 'break-word'
                                }}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))
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
                          border: '1px solid #1A1A1A',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          padding: '8px 12px'
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={handleSendChat}
                        disabled={chatLoading || !chatInput.trim()}
                        style={{
                          background: '#FFFFFF',
                          color: '#0A0A0A'
                        }}
                      >
                        {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connect Modal */}
      <Dialog open={!!connectModal} onOpenChange={() => setConnectModal(null)}>
        <DialogContent style={{ background: '#111111', border: '1px solid #1A1A1A', color: '#FFFFFF' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#FFFFFF' }}>Connect {connectModal}</DialogTitle>
            <DialogDescription style={{ color: '#666666' }}>
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
                border: '1px solid #1A1A1A',
                color: '#FFFFFF',
                padding: '8px 12px'
              }}
            />
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setConnectModal(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #1A1A1A',
                  color: '#FFFFFF'
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect} 
                disabled={connecting || !apiKeyInput.trim()}
                style={{
                  background: '#FFFFFF',
                  color: '#0A0A0A'
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
