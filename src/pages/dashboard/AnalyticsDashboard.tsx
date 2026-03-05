import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import {
  Link2, Unlink, RefreshCw, DollarSign, ShoppingCart, Package, TrendingUp,
  Send, Bot, User, Loader2, BarChart3, MessageSquare,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

// ─── Types ───
interface PlatformConnection {
  platform: string;
  status: string;
  connected_at: string;
  last_sync_at: string | null;
}

interface AnalyticsData {
  summary: { totalRevenue: number; totalSales: number; activeProducts: number; conversionRate: number };
  products: any[];
  orders: any[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

// ─── Platform Config ───
const PLATFORMS = [
  {
    id: "whop",
    name: "Whop",
    description: "Connect your Whop store to track memberships, products, and revenue.",
    logo: "https://cdn.whop.com/images/logo/whop-logo-icon-dark.png",
    color: "from-violet-500/20 to-purple-600/20",
    borderColor: "border-violet-500/30",
  },
  {
    id: "payhip",
    name: "Payhip",
    description: "Connect Payhip to track digital product sales and downloads.",
    logo: "https://payhip.com/favicon.ico",
    color: "from-emerald-500/20 to-teal-600/20",
    borderColor: "border-emerald-500/30",
  },
];

// ─── Main Component ───
const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch connections
  useEffect(() => {
    if (!user) return;
    fetchConnections();
  }, [user]);

  // Auto-fetch data when connections change
  useEffect(() => {
    if (connections.length > 0) fetchAnalyticsData();
  }, [connections]);

  // Load chat history
  useEffect(() => {
    if (!user) return;
    supabase
      .from("analytics_chat_messages")
      .select("role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setChatMessages(data as ChatMessage[]);
      });
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchConnections = async () => {
    setLoadingConnections(true);
    const { data } = await supabase
      .from("platform_connections")
      .select("platform, status, connected_at, last_sync_at")
      .eq("user_id", user!.id);
    setConnections((data as PlatformConnection[]) || []);
    setLoadingConnections(false);
  };

  const fetchAnalyticsData = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-fetch", {
        body: { platform: platformFilter === "all" ? undefined : platformFilter },
      });
      if (error) throw error;
      setAnalytics(data);
    } catch (e: any) {
      toast({ title: "Failed to fetch data", description: e.message, variant: "destructive" });
    }
    setLoadingData(false);
  };

  const handleConnect = async () => {
    if (!apiKeyInput.trim() || !connectModal) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-connect", {
        body: { platform: connectModal, apiKey: apiKeyInput.trim() },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Connection failed");
      toast({ title: "Connected!", description: `${connectModal} account connected successfully.` });
      setConnectModal(null);
      setApiKeyInput("");
      fetchConnections();
    } catch (e: any) {
      toast({ title: "Connection failed", description: e.message, variant: "destructive" });
    }
    setConnecting(false);
  };

  const handleDisconnect = async (platform: string) => {
    try {
      await supabase.functions.invoke("analytics-connect", {
        body: { platform, action: "disconnect" },
      });
      toast({ title: "Disconnected", description: `${platform} has been disconnected.` });
      fetchConnections();
      setAnalytics(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-chat", {
        body: { message: msg, analyticsContext: analytics },
      });
      if (error) throw error;
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }
    setChatLoading(false);
  };

  const isConnected = (platformId: string) => connections.some((c) => c.platform === platformId);

  // Build chart data from orders
  const salesChartData = useMemo(() => {
    if (!analytics?.orders?.length) return [];
    const grouped: Record<string, { date: string; revenue: number; sales: number }> = {};
    analytics.orders.forEach((o) => {
      const date = o.date ? new Date(o.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown";
      if (!grouped[date]) grouped[date] = { date, revenue: 0, sales: 0 };
      grouped[date].revenue += o.amount || 0;
      grouped[date].sales += 1;
    });
    return Object.values(grouped).reverse().slice(-14);
  }, [analytics]);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Analytics Hub</h1>
          <p className="text-muted-foreground mt-1">Connect your platforms, analyze sales, and get AI-powered business insights.</p>
        </div>

        {/* ─── Platform Connections ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Platform Connections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((p) => {
              const connected = isConnected(p.id);
              const conn = connections.find((c) => c.platform === p.id);
              return (
                <Card key={p.id} className={`relative overflow-hidden border ${connected ? p.borderColor : "border-border/50"}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-40`} />
                  <CardContent className="relative p-6 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-background/80 border border-border/50 flex items-center justify-center shrink-0 p-2">
                      <img src={p.logo} alt={p.name} className="w-9 h-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{p.name}</h3>
                        <Badge variant={connected ? "default" : "secondary"} className="text-xs">
                          {connected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                      {conn?.last_sync_at && (
                        <p className="text-xs text-muted-foreground mt-1">Last synced: {new Date(conn.last_sync_at).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {connected ? (
                        <Button variant="outline" size="sm" onClick={() => handleDisconnect(p.id)}>
                          <Unlink className="w-4 h-4 mr-1" /> Disconnect
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setConnectModal(p.id)}>
                          <Link2 className="w-4 h-4 mr-1" /> Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ─── Analytics Dashboard ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <div className="flex items-center gap-2">
              <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="whop">Whop</SelectItem>
                  <SelectItem value="payhip">Payhip</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} disabled={loadingData || connections.length === 0}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loadingData ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>

          {connections.length === 0 && !loadingConnections ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">No platforms connected</h3>
                <p className="text-muted-foreground">Connect Whop or Payhip above to start tracking your sales data.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Revenue", value: analytics ? `$${analytics.summary.totalRevenue.toFixed(2)}` : "—", icon: DollarSign, color: "text-emerald-500" },
                  { label: "Total Sales", value: analytics?.summary.totalSales ?? "—", icon: ShoppingCart, color: "text-blue-500" },
                  { label: "Active Products", value: analytics?.summary.activeProducts ?? "—", icon: Package, color: "text-purple-500" },
                  { label: "Conversion Rate", value: analytics ? `${analytics.summary.conversionRate}%` : "—", icon: TrendingUp, color: "text-amber-500" },
                ].map((m) => (
                  <Card key={m.label}>
                    <CardContent className="p-5">
                      {loadingData ? (
                        <Skeleton className="h-16 w-full" />
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <m.icon className={`w-4 h-4 ${m.color}`} />
                            <span className="text-sm text-muted-foreground">{m.label}</span>
                          </div>
                          <p className="text-2xl font-bold">{m.value}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              {salesChartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesChartData}>
                          <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} name="Revenue ($)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Sales Volume</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tables */}
              <Tabs defaultValue="products" className="mb-6">
                <TabsList>
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="orders">Sales History</TabsTrigger>
                </TabsList>
                <TabsContent value="products">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Platform</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingData ? (
                            <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                          ) : analytics?.products?.length ? (
                            analytics.products.map((p, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>${p.price || "N/A"}</TableCell>
                                <TableCell><Badge variant="outline" className="capitalize">{p.platform}</Badge></TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="orders">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Platform</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingData ? (
                            <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                          ) : analytics?.orders?.length ? (
                            analytics.orders.map((o, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{o.product}</TableCell>
                                <TableCell>${o.amount?.toFixed(2)}</TableCell>
                                <TableCell>{o.date ? new Date(o.date).toLocaleDateString() : "N/A"}</TableCell>
                                <TableCell><Badge variant="outline" className="capitalize">{o.platform}</Badge></TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No sales history found</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </section>

        {/* ─── AI Business Assistant ─── */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> AI Business Assistant
          </h2>
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/50 py-4">
              <CardDescription>Ask questions about your sales data and get personalized business advice.</CardDescription>
            </CardHeader>
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Ask me anything about your sales performance, marketing strategies, or business growth!</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {["How are my sales trending?", "Which product performs best?", "How can I increase conversions?"].map((q) => (
                        <Button key={q} variant="outline" size="sm" onClick={() => { setChatInput(q); }}>{q}</Button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t border-border/50 p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your business..."
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={chatLoading || !chatInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </section>
      </div>

      {/* ─── Connect Modal ─── */}
      <Dialog open={!!connectModal} onOpenChange={() => { setConnectModal(null); setApiKeyInput(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectModal ? PLATFORMS.find((p) => p.id === connectModal)?.name : ""}</DialogTitle>
            <DialogDescription>Enter your API key to connect your account. Your key is stored securely.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="Paste your API key here..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              {connectModal === "whop" && "Find your API key in Whop Dashboard → Developer Settings → API Keys"}
              {connectModal === "payhip" && "Find your API key in Payhip → Account Settings → API"}
            </div>
            <Button onClick={handleConnect} disabled={connecting || !apiKeyInput.trim()} className="w-full">
              {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              {connecting ? "Verifying..." : "Connect Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
