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
  const { isProPlan, hasPaidSubscription } = useSubscription();

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

  // ✅ FIX #1: Load connections only when user changes
  useEffect(() => {
    if (!user) {
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
  }, [user?.id]);

  // ✅ FIX #2: Load analytics data only when user or platformFilter changes
  useEffect(() => {
    if (!user) {
      setAnalytics(null);
      setHasLoadedData(false);
      return;
    }

    if (connections.length === 0) {
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
        
        // ✅ FIX: Validate data structure before setting state
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
  }, [user?.id, platformFilter, connections.length]);

  // ✅ FIX #3: Load chat messages only when user changes
  useEffect(() => {
    if (!user) {
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
  }, [user?.id]);

  // ✅ FIX #4: Scroll to bottom only when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      try {
        chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error("Scroll error:", error);
      }
    }
  }, [chatMessages]);

  const fetchConnections = useCallback(async () => {
    if (!user) return;
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
  }, [user?.id]);

  const handleConnect = useCallback(async () => {
    if (!apiKeyInput.trim() || !connectModal) return;
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
  }, [apiKeyInput, connectModal, fetchConnections, toast]);

  const handleDisconnect = useCallback(async (platform: string) => {
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
  }, [fetchConnections, toast]);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !user) return;
    if (!isProPlan && !hasPaidSubscription) {
      toast({ title: "Pro plan required", description: "AI Business Assistant is available on the Pro plan.", variant: "destructive" });
      return;
    }
    
    const msg = chatInput.trim();
    setChatInput("");
    
    // ✅ FIX: Add user message immediately with error handling
    try {
      setChatMessages((prev) => [...(prev || []), { role: "user", content: msg, created_at: new Date().toISOString() }]);
    } catch (e) {
      console.error("Error adding user message:", e);
      return;
    }
    
    setChatLoading(true);
    
    try {
      // Fetch analytics data if not already loaded
      let contextData = analytics;
      
      if (!contextData) {
        try {
          const { data: fetchedData, error: fetchError } = await supabase.functions.invoke("analytics-fetch", {
            body: { platform: platformFilter === "all" ? undefined : platformFilter }
          });
          
          if (fetchError) {
            console.error("Analytics fetch error:", fetchError);
            contextData = { summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [], orders: [] };
          } else if (fetchedData && typeof fetchedData === 'object' && 'summary' in fetchedData) {
            contextData = fetchedData as AnalyticsData;
            setAnalytics(fetchedData);
          } else {
            contextData = { summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [], orders: [] };
          }
        } catch (e) {
          console.error("Error fetching analytics:", e);
          contextData = { summary: { totalRevenue: 0, totalSales: 0, activeProducts: 0, conversionRate: 0 }, products: [], orders: [] };
        }
      }
      
      // ✅ FIX: Ensure contextData is valid before sending
      if (!contextData || typeof contextData !== 'object') {
        throw new Error("Invalid analytics context");
      }
      
      const { data, error } = await supabase.functions.invoke("analytics-chat", {
        body: { message: msg, analyticsContext: contextData }
      });
      
      if (error) throw error;
      if (!data || !data.reply) throw new Error("No response from AI");
      
      // ✅ FIX: Add assistant message with error handling
      try {
        setChatMessages((prev) => [...(prev || []), { role: "assistant", content: String(data.reply || ""), created_at: new Date().toISOString() }]);
      } catch (e) {
        console.error("Error adding assistant message:", e);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      try {
        setChatMessages((prev) => [...(prev || []), { role: "assistant", content: `Sorry, I encountered an error: ${errorMsg}`, created_at: new Date().toISOString() }]);
      } catch (e) {
        console.error("Error adding error message:", e);
      }
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, user, isProPlan, hasPaidSubscription, toast, analytics, platformFilter]);

  const isConnected = useCallback((platformId: string) => {
    return connections.some((c) => c.platform === platformId);
  }, [connections]);

  const salesChartData = useMemo(() => {
    if (!analytics?.orders?.length) return [];
    const grouped: Record<string, { date: string; revenue: number; sales: number }> = {};
    
    try {
      analytics.orders.forEach((o) => {
        if (!o || typeof o !== 'object') return;
        const date = o.date ? new Date(o.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown";
        if (!grouped[date]) grouped[date] = { date, revenue: 0, sales: 0 };
        grouped[date].revenue += Number(o.amount) || 0;
        grouped[date].sales += 1;
      });
    } catch (e) {
      console.error("Error processing sales chart data:", e);
    }
    
    return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analytics?.orders]);

  const revenueChartData = useMemo(() => {
    if (!analytics?.products?.length) return [];
    
    try {
      return analytics.products.slice(0, 8).map((p) => ({
        name: (p.name || "Unknown").substring(0, 20),
        value: Number(p.price) || 0,
      }));
    } catch (e) {
      console.error("Error processing revenue chart data:", e);
      return [];
    }
  }, [analytics?.products]);

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AI Business Assistant</h1>
              <p className="text-muted-foreground mt-1">Connect your Whop & Payhip accounts for real-time insights</p>
            </div>
            <Button onClick={fetchConnections} disabled={loadingConnections} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingConnections ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Platform Connections */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Connected Platforms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLATFORMS.map((platform) => {
                const connected = isConnected(platform.id);
                const connection = connections.find((c) => c.platform === platform.id);
                return (
                  <Card key={platform.id} className={`p-4 border-2 ${connected ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img src={platform.logo} alt={platform.name} className="w-8 h-8" />
                        <div>
                          <h3 className="font-semibold">{platform.name}</h3>
                          <p className="text-xs text-muted-foreground">{platform.description}</p>
                        </div>
                      </div>
                      <Badge variant={connected ? "default" : "secondary"}>
                        {connected ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                    {connected && connection && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Connected {new Date(connection.connected_at).toLocaleDateString()}
                        {connection.last_sync_at && ` • Last sync: ${new Date(connection.last_sync_at).toLocaleTimeString()}`}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {!connected && (
                        <Button onClick={() => setConnectModal(platform.id)} size="sm" className="flex-1">
                          <Link2 className="w-4 h-4 mr-2" /> Connect
                        </Button>
                      )}
                      {connected && (
                        <Button onClick={() => handleDisconnect(platform.id)} size="sm" variant="destructive" className="flex-1">
                          <Unlink className="w-4 h-4 mr-2" /> Disconnect
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>

          {/* Analytics Tabs */}
          {connections.length > 0 && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {loadingData ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="p-4">
                        <Skeleton className="h-8 w-20 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </Card>
                    ))}
                  </div>
                ) : analytics ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                            <p className="text-2xl font-bold">${analytics.summary.totalRevenue.toFixed(2)}</p>
                          </div>
                          <DollarSign className="w-8 h-8 text-primary/50" />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Sales</p>
                            <p className="text-2xl font-bold">{analytics.summary.totalSales}</p>
                          </div>
                          <ShoppingCart className="w-8 h-8 text-primary/50" />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Active Products</p>
                            <p className="text-2xl font-bold">{analytics.summary.activeProducts}</p>
                          </div>
                          <Package className="w-8 h-8 text-primary/50" />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Conversion Rate</p>
                            <p className="text-2xl font-bold">{analytics.summary.conversionRate.toFixed(1)}%</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-primary/50" />
                        </div>
                      </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {salesChartData.length > 0 && (
                        <Card className="p-4">
                          <h3 className="font-semibold mb-4">Sales Trend</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={salesChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </Card>
                      )}
                      {revenueChartData.length > 0 && (
                        <Card className="p-4">
                          <h3 className="font-semibold mb-4">Top Products</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      )}
                    </div>
                  </>
                ) : (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground">No analytics data available</p>
                  </Card>
                )}
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.products && analytics.products.length > 0 ? (
                        analytics.products.map((product, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{product.name || "Unknown"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{product.platform}</Badge>
                            </TableCell>
                            <TableCell>${Number(product.price || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            No products found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* AI Assistant Tab */}
              <TabsContent value="assistant">
                <Card className="flex flex-col h-[600px]">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {chatMessages.map((msg, i) => {
                        const { role, content } = msg;
                        return (
                          <div key={i} className={`flex gap-2.5 ${role === "user" ? "flex-row-reverse" : ""}`}>
                            {role === "assistant" && <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-primary" /></div>}
                            <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm break-words ${role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{content}</div>
                            {role === "user" && <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="w-3.5 h-3.5" /></div>}
                          </div>
                        );
                      })}
                      {chatLoading && (
                        <div className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-primary" /></div>
                          <div className="bg-muted rounded-xl px-3.5 py-2.5"><Loader2 className="w-4 h-4 animate-spin" /></div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <Input 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)} 
                        placeholder="Ask about your business..." 
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()} 
                        className="rounded-lg text-sm" 
                        disabled={!isProPlan && !hasPaidSubscription} 
                      />
                      <Button onClick={handleSendChat} disabled={chatLoading || (!isProPlan && !hasPaidSubscription)} size="sm" className="rounded-lg px-3">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Connect Modal */}
          <Dialog open={!!connectModal} onOpenChange={(open) => { if (!open) { setConnectModal(null); setApiKeyInput(""); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect {connectModal}</DialogTitle>
                <DialogDescription>Enter your API key to connect your {connectModal} account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input 
                  value={apiKeyInput} 
                  onChange={(e) => setApiKeyInput(e.target.value)} 
                  placeholder="Paste your API key here" 
                  type="password" 
                />
                <Button onClick={handleConnect} disabled={connecting || !apiKeyInput.trim()} className="w-full">
                  {connecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</> : "Connect"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default AnalyticsDashboard;
