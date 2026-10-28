import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonetizationProduct, MonetizationModule, MODULE_TYPES } from "@/lib/monetization";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { listMonetizationModules } from "@/lib/monetization";
import type { KeysetCursor } from "@/lib/keysetPagination";

interface Props {
  product: MonetizationProduct;
  onModuleClick: (mod: MonetizationModule) => void;
}

const MonetizationProductCard = ({ product, onModuleClick }: Props) => {
  const [modules, setModules] = useState(product.monetization_modules || []);
  const [moduleCursor, setModuleCursor] = useState<KeysetCursor | null>(product.moduleNextCursor ?? null);
  const [hasMore, setHasMore] = useState(Boolean(product.moduleHasMore));
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setModules(product.monetization_modules || []);
    setModuleCursor(product.moduleNextCursor ?? null);
    setHasMore(Boolean(product.moduleHasMore));
  }, [product.id, product.monetization_modules, product.moduleNextCursor, product.moduleHasMore]);

  const loadMore = async () => {
    if (!moduleCursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listMonetizationModules(product.id, moduleCursor);
      setModules((current) => {
        const ids = new Set(current.map((module) => module.id));
        return [...current, ...page.items.filter((module) => !ids.has(module.id))];
      });
      setModuleCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error("Failed to load more campaign assets:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Card className="p-6 hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg leading-tight">{product.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{product.topic}</p>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {modules.length}{hasMore ? "+" : ""} asset{modules.length === 1 && !hasMore ? "" : "s"}
        </Badge>
      </div>

      {product.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>
      )}

      {modules.length > 0 && (
        <div className="space-y-2 mb-4">
          {modules.map((mod) => {
            const typeLabel =
              MODULE_TYPES.find((m) => m.value === mod.module_type)?.label || mod.module_type;
            return (
              <button
                key={mod.id}
                onClick={() => onModuleClick(mod)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{typeLabel}</span>
                  <Badge
                    variant={mod.status === "generated" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {mod.status}
                  </Badge>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
          {hasMore && (
            <Button variant="ghost" size="sm" className="w-full" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading assets…" : "Load more assets"}
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Created {format(new Date(product.created_at), "MMM d, yyyy")}
      </p>
    </Card>
  );
};

export default MonetizationProductCard;
