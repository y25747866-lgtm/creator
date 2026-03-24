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
import { supabase } from "@/integrations/supabase/client";
import {
  Link2, Unlink, RefreshCw, DollarSign, ShoppingCart, Package, TrendingUp,
  Send, Bot, User, Loader2, BarChart3, Lock,
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
        <div className="p-8 space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto relative">
        {/* HARD UI LOCK FOR EXPIRED/FREE USERS */}
        {!hasAccess && (
          <UpgradeOverlay message={isExpired ? "Your subscription has expired. Please renew to continue using Analytics." : "Analytics is a premium feature. Upgrade to track your revenue and get AI-powered insights."} />
        )}

        <div className={!hasAccess ? "opacity-50 pointer-events-none" : ""}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Track your sales, revenue, and product performance across platforms.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[180px]">
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
                    // This will trigger the useEffect to reload
                  }
                }}
                disabled={loadingData || connections.length === 0}
              >
                <RefreshCw className={cn("w-4 h-4", loadingData && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {PLATFORMS.map(platform => {
              const connection = connections.find(c => c.platform === platform.id);
              const isConnected = !!connection;
              
              return (
                <Card key={platform.id} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white p-2 flex items-center justify-center shadow-sm">
                        <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{platform.name}</h3>
                        <p className="text-xs text-muted-foreground max-w-[200px]">{platform.description}</p>
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
                      >
                        <Link2 className="w-4 h-4" />
                        Connect
                      </Button>
                    )}
                  </div>
                  {isConnected && connection.last_sync_at && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Last synced: {new Date(connection.last_sync_at).toLocaleString()}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Analytics Content */}
          {!hasLoadedData && !loadingData ? (
            <Card className="p-12 border-2 border-dashed flex flex-col items-center justify-center text-center bg-muted/20 rounded-3xl">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
                <BarChart3 className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Data to Display</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                {connections.length === 0 
                  ? "Connect your Whop or Payhip account to start tracking your business performance."
                  : "We're ready to fetch your data. Click the refresh button to sync."}
              </p>
              {connections.length === 0 && (
                <div className="flex gap-3">
                  <Button onClick={() => setConnectModal("whop")} disabled={!hasAccess}>Connect Whop</Button>
                  <Button variant="outline" onClick={() => setConnectModal("payhip")} disabled={!hasAccess}>Connect Payhip</Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-primary/5 border-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {loadingData ? <Skeleton className="h-8 w-24" /> : `$${analytics?.summary.totalRevenue.toLocaleString()}`}
                  </div>
                </Card>
                <Card className="p-6 bg-primary/5 border-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sales</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {loadingData ? <Skeleton className="h-8 w-16" /> : analytics?.summary.totalSales.toLocaleString()}
                  </div>
                </Card>
                <Card className="p-6 bg-primary/5 border-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Products</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {loadingData ? <Skeleton className="h-8 w-12" /> : analytics?.summary.activeProducts}
                  </div>
                </Card>
                <Card className="p-6 bg-primary/5 border-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conv. Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {loadingData ? <Skeleton className="h-8 w-16" /> : `${analytics?.summary.conversionRate}%`}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Charts & Tables */}
                <div className="lg:col-span-8 space-y-8">
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-6">Revenue Overview</h3>
                    <div className="h-[300px] w-full">
                      {loadingData ? (
                        <Skeleton className="w-full h-full rounded-xl" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={revenueData}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))'}}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10, fill: 'hsl(var(--muted-foreground))'}}
                              tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '12px',
                                fontSize: '12px'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="amount" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorRev)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Card>

                  <Tabs defaultValue="products" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="products">Top Products</TabsTrigger>
                      <TabsTrigger value="orders">Recent Orders</TabsTrigger>
                    </TabsList>
                    <TabsContent value="products">
                      <Card className="overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Sales</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingData ? (
                              [1, 2, 3].map(i => (
                                <TableRow key={i}>
                                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                </TableRow>
                              ))
                            ) : analytics?.products.map((product, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-right">{product.sales}</TableCell>
                                <TableCell className="text-right font-bold">${product.revenue.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    </TabsContent>
                    <TabsContent value="orders">
                      <Card className="overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingData ? (
                              [1, 2, 3].map(i => (
                                <TableRow key={i}>
                                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                </TableRow>
                              ))
                            ) : analytics?.orders.map((order, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {new Date(order.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-xs font-medium">{order.customer}</TableCell>
                                <TableCell className="text-xs">{order.product}</TableCell>
                                <TableCell className="text-right font-bold">${order.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* AI Advisor Sidebar */}
                <div className="lg:col-span-4">
                  <Card className="h-[600px] flex flex-col border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden">
                    <div className="p-4 border-b border-primary/10 flex items-center gap-3 bg-primary/10">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">AI Business Advisor</h3>
                        <p className="text-[10px] text-primary/70 font-medium">Analyzing your performance...</p>
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {chatMessages.length === 0 && (
                          <div className="text-center py-8 px-4">
                            <Bot className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                            <p className="text-xs text-muted-foreground">
                              Ask me anything about your sales data, product performance, or growth strategies.
                            </p>
                          </div>
                        )}
                        {chatMessages.map((msg, i) => (
                          <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                              msg.role === "user" ? "bg-primary" : "bg-muted border border-border"
                            )}>
                              {msg.role === "user" ? <User className="w-3 h-3 text-primary-foreground" /> : <Bot className="w-3 h-3 text-primary" />}
                            </div>
                            <div className={cn(
                              "p-3 rounded-2xl text-xs max-w-[85%]",
                              msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none"
                            )}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center">
                              <Bot className="w-3 h-3 text-primary" />
                            </div>
                            <div className="p-3 rounded-2xl bg-card border border-border rounded-tl-none">
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t border-primary/10 bg-background/50">
                      <div className="relative">
                        <Input 
                          placeholder="Ask about your data..." 
                          className="pr-10 text-xs h-9 rounded-xl border-primary/20 focus-visible:ring-primary/30"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          disabled={chatLoading || !hasAccess}
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="absolute right-1 top-1 h-7 w-7 text-primary hover:bg-primary/10"
                          onClick={handleSendChat}
                          disabled={chatLoading || !chatInput.trim() || !hasAccess}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connect Modal */}
        <Dialog open={!!connectModal} onOpenChange={() => setConnectModal(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Connect {connectModal === 'whop' ? 'Whop' : 'Payhip'}</DialogTitle>
              <DialogDescription>
                Enter your API key to sync your {connectModal} data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">API Key</label>
                <Input 
                  type="password" 
                  placeholder="Enter your API key" 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Your API key is encrypted and stored securely.
                </p>
              </div>
              <Button 
                className="w-full" 
                onClick={handleConnect}
                disabled={connecting || !apiKeyInput.trim()}
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                Connect Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
