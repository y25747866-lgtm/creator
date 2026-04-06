import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Image, Eye, Trash2, BookOpen, FileText, Lock } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEbookStore, Ebook } from "@/hooks/useEbookStore";
import { generatePDF, downloadCoverImage } from "@/lib/pdfGenerator";
import { recordMetric } from "@/lib/productTracking";
import { format } from "date-fns";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";

const Downloads = () => {
  const allEbooks = useEbookStore((s) => s.ebooks);
  const removeEbook = useEbookStore((s) => s.removeEbook);
  const [previewEbook, setPreviewEbook] = useState<Ebook | null>(null);
  
  const { hasPaidSubscription, subscription, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  const { user } = useAuth();

  const isExpired = subscription?.status === "expired";
  const hasAccess = hasPaidSubscription && !isExpired;

  // Only show ebooks belonging to the current user
  const ebooks = useMemo(() => {
    if (!user) return [];
    return allEbooks.filter((e) => e.userId === user.id || !e.userId);
  }, [allEbooks, user]);

  const guardedDownload = (fn: () => void, ebook?: Ebook, metricType?: string) => {
    if (!hasAccess) {
      toast({ 
        title: "Upgrade Required", 
        description: isExpired ? "Your subscription has expired." : "Downloads are available on paid plans.", 
        variant: "destructive" 
      });
      return;
    }
    fn();
    // Record download metric
    if (ebook?.dbProductId && metricType) {
      try {
        recordMetric(ebook.dbProductId, metricType);
      } catch (err) {
        console.error("Failed to record metric:", err);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-screen" style={{ background: '#0A0A0A', padding: '40px' }}>
        {/* HARD UI LOCK FOR EXPIRED/FREE USERS */}
        {!hasAccess && !subLoading && (
          <UpgradeOverlay message={isExpired ? "Your subscription has expired. Please renew to access your downloads." : "Downloads and exports are premium features. Upgrade to download your generated ebooks."} />
        )}

        <div className={!hasAccess && !subLoading ? "opacity-50 pointer-events-none" : ""}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            style={{ marginBottom: '24px' }}
          >
            <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
              Download History
            </h1>
            <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#555555' }}>
              Access and manage all your generated ebooks.
            </p>
          </motion.div>

          {ebooks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                background: '#111111',
                border: '1px dashed #1A1A1A',
                borderRadius: '10px',
                padding: '80px 32px',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                background: '#1A1A1A',
                border: '1px solid #222222',
                borderRadius: '10px',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOpen size={20} color="#FFFFFF" style={{ opacity: 0.4 }} />
              </div>
              <h3 style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                No ebooks yet
              </h3>
              <p style={{ fontFamily: 'DM Sans', fontSize: '13px', color: '#555555', marginTop: '8px' }}>
                Create your first ebook to see it here.
              </p>
              <button 
                onClick={() => (window.location.href = "/dashboard/ebook-generator")}
                style={{
                  background: '#FFFFFF',
                  color: '#0A0A0A',
                  fontFamily: 'Syne',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  marginTop: '24px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F0F0F0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
              >
                Create Ebook
              </button>
            </motion.div>
          ) : (
            <div className="flex flex-col">
              {ebooks.map((ebook, index) => (
                <motion.div 
                  key={ebook.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{
                    background: '#111111',
                    border: '1px solid #1A1A1A',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <FileText size={18} color="#FFFFFF" style={{ opacity: 0.4 }} />
                    <div>
                      <h3 style={{ fontFamily: 'Syne', fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
                        {ebook.title}
                      </h3>
                      <p style={{ fontFamily: 'DM Sans', fontSize: '12px', color: '#555555' }}>
                        {ebook.pages} pages · PDF · Generated {format(new Date(ebook.createdAt), "MMM d yyyy")}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => guardedDownload(() => generatePDF(ebook), ebook, "download")}
                      disabled={!hasAccess}
                      style={{
                        background: 'transparent',
                        border: '1px solid #1A1A1A',
                        color: '#FFFFFF',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1A1A1A'}
                    >
                      Download
                    </button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive p-2 h-auto" 
                      onClick={() => removeEbook(ebook.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!previewEbook} onOpenChange={() => setPreviewEbook(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#111111] border-[#1A1A1A] text-white">
            <DialogHeader><DialogTitle className="text-white">{previewEbook?.title}</DialogTitle></DialogHeader>
            {previewEbook?.coverImageUrl && (
              <div className="mb-6"><img src={previewEbook.coverImageUrl} alt={previewEbook.title} className="w-48 mx-auto rounded-lg shadow-lg" /></div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-300">
              {previewEbook?.content.split("\n").map((line, i) => {
                if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4 text-white">{line.replace("# ", "")}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold mt-4 mb-3 text-white">{line.replace("## ", "")}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-medium mt-3 mb-2 text-white">{line.replace("### ", "")}</h3>;
                if (line.trim()) return <p key={i} className="mb-3">{line}</p>;
                return null;
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Downloads;
