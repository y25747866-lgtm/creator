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
                    <div className="flex items-center gap-4">
                      <div 
                        style={{
                          width: '40px',
                          height: '40px',
                          background: '#1A1A1A',
                          border: '1px solid #2A2A2A',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <BarChart2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                          {platform.name}
                        </h3>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#777777', marginTop: '6px', fontWeight: 400 }}>
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
                          className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
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
                          border: '1px solid #252525',
                          color: '#FFFFFF',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '13px',
                          fontWeight: 600,
                          padding: '8px 16px',
                          borderRadius: '8px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.background = '#1A1A1A'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Link2 className="w-4 h-4" />
                        Connect
                      </Button>
                    )}
                  </div>
                  {isConnected && connection.last_sync_at && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #252525', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#777777', fontFamily: "'DM Sans', sans-serif" }}>
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
                background: '#0F0F0F',
                border: '1px dashed #252525',
                borderRadius: '12px',
                padding: '80px 32px',
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
                  width: '48px',
                  height: '48px',
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}
              >
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px', letterSpacing: '-0.3px' }}>
                No Data to Display
              </h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#777777', maxWidth: '360px', margin: '12px auto 32px', fontWeight: 400, lineHeight: '1.6' }}>
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
                      padding: '11px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      letterSpacing: '-0.3px'
                    }}
                  >
                    Connect Whop
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
                            analytics.products.map((product, i) => (
                              <TableRow key={i} style={{ borderBottomColor: '#252525' }}>
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
                  </div>
                </div>

                {/* Chat Sidebar */}
                <div className="lg:col-span-4">
                  <div style={{ background: '#0F0F0F', border: '1px solid #252525', borderRadius: '12px', padding: '28px', height: '640px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.3px' }}>AI Advisor</h3>
                    <ScrollArea className="flex-1 mb-4">
                      <div className="space-y-4 pr-4">
                        {chatMessages.length === 0 ? (
                          <div style={{ textAlign: 'center', color: '#777777', fontSize: '13px', paddingTop: '32px', fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                            Ask me anything about your analytics
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
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
                        onClick={handleSendChat}
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
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600
                }}
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
                  fontWeight: 700
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
