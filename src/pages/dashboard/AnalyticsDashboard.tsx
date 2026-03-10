import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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

interface PlatformConnection { platform: string; status: string; connected_at: string; last_sync_at: string | null; }
interface AnalyticsData { summary: { totalRevenue: number; totalSales: number; activeProducts: number; conversionRate: number }; products: any[]; orders: any[]; }
interface ChatMessage { role: "user" | "assistant"; content: string; created_at?: string; }

const PLATFORMS = [
  { id: "whop", name: "Whop", description: "Connect your Whop store to track memberships, products, and revenue.", logo: whopLogo },
  { id: "payhip", name: "Payhip", description: "Connect Payhip to track digital product sales and downloads.", logo: payhipLogo },
];

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isProPlan, hasPaidSubscription } = useSubscription();

  console.log("DEBUG Analytics - isProPlan:", isProPlan, "hasPaidSubscription:", hasPaidSubscription);

  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("all");

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) fetchConnections(); }, [user]);
  useEffect(() => { if (connections.length > 0) fetchAnalyticsData(); }, [connections]);
  useEffect(() => {
    if (!user) return;
    supabase.from("analytics_chat_messages").select("role, content, created_at").eq("user_id", user.id).order("created_at", { ascending: true }).limit(50).then(({ data }) => {
      if (data) setChatMessages(data as ChatMessage[]);
    });
  }, [user]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const fetchConnections = async () => {
    setLoadingConnections(true);
    const { data } = await supabase.from("platform_connections").select("platform, status, connected_at, last_sync_at").eq("user_id", user!.id);
    setConnections((data as PlatformConnection[]) || []);
    setLoadingConnections(false);
  };

  const fetchAnalyticsData = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-fetch", { body: { platform: platformFilter === "all" ? undefined : platformFilter } });
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
      const { data, error } = await supabase.functions.invoke("analytics-connect", { body: { platform: connectModal, apiKey: apiKeyInput.trim() } });
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
      await supabase.functions.invoke("analytics-connect", { body: { platform, action: "disconnect" } });
      toast({ title: "Disconnected", description: `${platform} has been disconnected.` });
      fetchConnections();
      setAnalytics(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    if (!isProPlan && !hasPaidSubscription) {
      toast({ title: "Pro plan required", description: "AI Business Assistant is available on the Pro plan.", variant: "destructive" });
      return;
    }
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analytics-chat", { body: { message: msg, analyticsContext: analytics } });
      if (error) throw error;
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }
    setChatLoading(false);
  };

  const isConnected = (platformId: string) => connections.some((c) => c.platform === platformId);

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
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Hub</h1>
          <p className="text-muted-foreground mt-1 text-sm">Connect your platforms, analyze sales, and get AI-powered business insights.</p>
        </div>

        {/* Platform Connections */}
        <Card className="rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4">Platform Connections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((p) => {
              const connected = isConnected(p.id);
              const conn = connections.find((c) => c.platform === p.id);
              return (
                <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${connected ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-border/80"}`}>
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={p.logo} alt={p.name} className="w-8 h-8 object-contain rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      <Badge variant={connected ? "default" : "secondary"} className="text-[10px] px-2 py-0">{connected ? "Connected" : "Not Connected"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                    {conn?.last_sync_at && <p className="text-[10px] text-muted-foreground mt-1">Last synced: {new Date(conn.last_sync_at).toLocaleString()}</p>}
                  </div>
                  <div className="shrink-0">
                    {connected ? (
                      <Button variant="outline" size="sm" onClick={() => handleDisconnect(p.id)} className="rounded-lg h-9 px-3 text-xs"><Unlink className="w-3.5 h-3.5 mr-1.5" /> Disconnect</Button>
                    ) : (
                      <Button size="sm" onClick={() => setConnectModal(p.id)} className="rounded-lg h-9 px-4 text-xs"><Link2 className="w-3.5 h-3.5 mr-1.5" /> Connect</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Analytics Dashboard */}
        <Card className="rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Dashboard</h2>
            <div className="flex items-center gap-2">
              <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v)}>
                <SelectTrigger className="w-[130px] rounded-lg h-9 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="whop">Whop</SelectItem>
                  <SelectItem value="payhip">Payhip</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData} disabled={loadingData || connections.length === 0} className="rounded-lg h-9 px-3 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingData ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>

          {connections.length === 0 && !loadingConnections ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3"><BarChart3 className="w-7 h-7 text-muted-foreground/60" /></div>
              <h3 className="font-semibold text-sm mb-1">No platforms connected</h3>
              <p className="text-muted-foreground text-xs max-w-sm mx-auto">Connect Whop or Payhip above to start tracking your sales data.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total Revenue", value: analytics ? `$${analytics.summary.totalRevenue.toFixed(2)}` : "—", icon: DollarSign, color: "text-emerald-500" },
                  { label: "Total Sales", value: analytics?.summary.totalSales ?? "—", icon: ShoppingCart, color: "text-blue-500" },
                  { label: "Active Products", value: analytics?.summary.activeProducts ?? "—", icon: Package, color: "text-purple-500" },
                  { label: "Conversion Rate", value: analytics ? `${analytics.summary.conversionRate}%` : "—", icon: TrendingUp, color: "text-amber-500" },
                ].map((m) => (
                  <div key={m.label} className="p-4 rounded-xl border border-border bg-card">
                    {loadingData ? <Skeleton className="h-14 w-full" /> : (
                      <>
                        <div className="flex items-center gap-2 mb-1.5"><m.icon className={`w-3.5 h-3.5 ${m.color}`} /><span className="text-xs text-muted-foreground">{m.label}</span></div>
                        <p className="text-2xl font-bold">{m.value}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {salesChartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="text-xs font-semibold mb-3 text-muted-foreground">Revenue Trend</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesChartData}>
                          <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} name="Revenue ($)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="text-xs font-semibold mb-3 text-muted-foreground">Sales Volume</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="products">
                <TabsList className="mb-3">
                  <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs">Sales History</TabsTrigger>
                </TabsList>
                <TabsContent value="products">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs">Price</TableHead><TableHead className="text-xs">Platform</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {loadingData ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow> : analytics?.products?.length ? analytics.products.map((p, i) => (
                          <TableRow key={i}><TableCell className="font-medium text-sm">{p.name}</TableCell><TableCell className="text-sm">${p.price || "N/A"}</TableCell><TableCell><Badge variant="outline" className="capitalize text-[10px]">{p.platform}</Badge></TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-sm">No products found</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                <TabsContent value="orders">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs">Amount</TableHead><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Platform</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {loadingData ? <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow> : analytics?.orders?.length ? analytics.orders.map((o, i) => (
                          <TableRow key={i}><TableCell className="font-medium text-sm">{o.product}</TableCell><TableCell className="text-sm">${o.amount?.toFixed(2)}</TableCell><TableCell className="text-sm">{o.date ? new Date(o.date).toLocaleDateString() : "N/A"}</TableCell><TableCell><Badge variant="outline" className="capitalize text-[10px]">{o.platform}</Badge></TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">No sales history found</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </Card>

        {/* AI Business Assistant */}
        <Card className="rounded-2xl border border-border shadow-sm overflow-hidden relative">
          {!isProPlan && !hasPaidSubscription && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
              <Lock className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="font-semibold text-sm mb-1">Pro Plan Required</p>
              <p className="text-xs text-muted-foreground mb-3">AI Business Assistant is available on the Pro plan.</p>
              <Button size="sm" onClick={() => window.location.href = "/pricing"}>Upgrade to Pro</Button>
            </div>
          )}
          <div className="p-5 pb-3 border-b border-border">
            <h2 className="text-base font-semibold flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Bot className="w-4 h-4 text-primary" /></div>
              AI Business Assistant
            </h2>
            <p className="text-xs text-muted-foreground mt-1 ml-[42px]">Ask questions about your sales data and get personalized business advice.</p>
          </div>
          <ScrollArea className="h-[360px]">
            <div className="p-5 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3"><Bot className="w-6 h-6 text-primary" /></div>
                  <p className="text-sm text-muted-foreground mb-4">Ask me anything about your sales performance, marketing strategies, or business growth!</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["How are my sales trending?", "Which product performs best?", "How can I increase conversions?"].map((q) => (
                      <Button key={q} variant="outline" size="sm" onClick={() => setChatInput(q)} className="text-xs rounded-lg">{q}</Button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-primary" /></div>}
                  <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{msg.content}</div>
                  {msg.role === "user" && <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5"><User className="w-3.5 h-3.5" /></div>}
                </div>
              ))}
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
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about your business..." onKeyDown={(e) => e.key === "Enter" && handleSendChat()} className="rounded-lg text-sm" disabled={!isProPlan && !hasPaidSubscription} />
              <Button onClick={handleSendChat} disabled={chatLoading || (!isProPlan && !hasPaidSubscription)} size="sm" className="rounded-lg px-3"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </Card>

        {/* Connect Modal */}
        <Dialog open={!!connectModal} onOpenChange={() => { setConnectModal(null); setApiKeyInput(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect {connectModal}</DialogTitle>
              <DialogDescription>Enter your API key to connect your {connectModal} account.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="Paste your API key here" type="password" />
              <Button onClick={handleConnect} disabled={connecting || !apiKeyInput.trim()} className="w-full">
                {connecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</> : "Connect"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsDashboard;
