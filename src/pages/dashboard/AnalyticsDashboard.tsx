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
  const { isProPlan, hasPaidSubscription, subscription, loading: subLoading } = useSubscription();

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
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="relative min-h-[calc(100vh-4rem)]">
        {!hasAccess && <UpgradeOverlay />}
        
        <div className={`p-4 md:p-8 space-y-8 ${!hasAccess ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Business Analytics</h1>
              <p className="text-muted-foreground">Connect your platforms to see your real-time business performance.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[180px]">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {connections.map(c => (
                    <SelectItem key={c.platform} value={c.platform}>
                      {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={() => window.location.reload()} disabled={loadingData}>
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Connection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLATFORMS.map(platform => {
              const connection = connections.find(c => c.platform === platform.id);
              const isConnected = !!connection;
              
              return (
                <Card key={platform.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center p-2">
                        <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{platform.name}</h3>
                        <Badge variant={isConnected ? "default" : "secondary"}>
                          {isConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                    </div>
                    
                    {isConnected ? (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDisconnect(platform.id)}>
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => setConnectModal(platform.id)}>
                        <Link2 className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{platform.description}</p>
                </Card>
              );
            })}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">
                {loadingData ? <Skeleton className="h-8 w-24" /> : `$${analytics?.summary.totalRevenue.toLocaleString() || "0"}`}
              </p>
            </Card>
            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">
                {loadingData ? <Skeleton className="h-8 w-24" /> : analytics?.summary.totalSales.toLocaleString() || "0"}
              </p>
            </Card>
            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                <Package className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">
                {loadingData ? <Skeleton className="h-8 w-24" /> : analytics?.summary.activeProducts.toLocaleString() || "0"}
              </p>
            </Card>
            <Card className="p-6 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">
                {loadingData ? <Skeleton className="h-8 w-24" /> : `${analytics?.summary.conversionRate.toFixed(1) || "0"}%`}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Analytics Content */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Revenue Overview</h3>
                <div className="h-[300px] w-full">
                  {loadingData ? (
                    <Skeleton className="w-full h-full" />
                  ) : revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          itemStyle={{ color: 'hsl(var(--primary))' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                      <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                      <p>No sales data to display yet</p>
                    </div>
                  )}
                </div>
              </Card>

              <Tabs defaultValue="products" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="orders">Recent Orders</TabsTrigger>
                </TabsList>
                
                <TabsContent value="products">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingData ? (
                          [1, 2, 3].map(i => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : analytics?.products.length ? (
                          analytics.products.map((product, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{product.platform}</Badge>
                              </TableCell>
                              <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No products found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
                
                <TabsContent value="orders">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingData ? (
                          [1, 2, 3].map(i => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : analytics?.orders.length ? (
                          analytics.orders.map((order, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{order.product}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(order.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                +${order.amount.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No orders found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* AI Advisor Sidebar */}
            <div className="space-y-4">
              <Card className="flex flex-col h-[600px] border-primary/20 shadow-lg shadow-primary/5">
                <div className="p-4 border-b bg-primary/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">AI Business Advisor</h3>
                  </div>
                  {!isProPlan && !hasPaidSubscription && <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Bot className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium">I'm your Business Growth Partner</p>
                        <p className="text-xs text-muted-foreground px-4">
                          Ask me anything about your sales data, product pricing, or marketing strategies.
                        </p>
                      </div>
                    )}
                    
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className={`rounded-2xl p-3 text-sm max-w-[85%] ${
                          msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    
                    {chatLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="bg-muted rounded-2xl p-3 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Analyzing data...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                
                <div className="p-4 border-t">
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}>
                    <Input 
                      placeholder={hasAccess ? "Ask for insights..." : "Upgrade to use AI"} 
                      value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={chatLoading || !hasAccess}
                      className="rounded-full"
                    />
                    <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim() || !hasAccess} className="rounded-full">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </Card>
              
              <Card className="p-4 bg-primary/5 border-none">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Pro Tip:</strong> Connect both Whop and Payhip to get a unified view of your entire digital business.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      <Dialog open={!!connectModal} onOpenChange={(open) => !open && setConnectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectModal?.charAt(0).toUpperCase()}{connectModal?.slice(1)}</DialogTitle>
            <DialogDescription>
              Enter your API key to sync your products and sales data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input 
                type="password" 
                placeholder="Enter your API key" 
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                {connectModal === 'whop' ? (
                  <>You can find this in your Whop Settings &gt; Developer &gt; API Keys.</>
                ) : (
                  <>You can find this in your Payhip Settings &gt; API Keys.</>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConnectModal(null)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={connecting || !apiKeyInput.trim()}>
              {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Connect Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default () => (
  <ErrorBoundary>
    <AnalyticsDashboard />
  </ErrorBoundary>
);
