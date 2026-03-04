import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonetizationProduct, MonetizationModule, MODULE_TYPES } from "@/lib/monetization";
import { format } from "date-fns";
import { Eye } from "lucide-react";

interface Props {
  product: MonetizationProduct;
  onModuleClick: (mod: MonetizationModule) => void;
}

const MonetizationProductCard = ({ product, onModuleClick }: Props) => {
  const modules = product.monetization_modules || [];

  return (
    <Card className="p-6 hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg leading-tight">{product.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{product.topic}</p>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {modules.length} asset{modules.length !== 1 ? "s" : ""}
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
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Created {format(new Date(product.created_at), "MMM d, yyyy")}
      </p>
    </Card>
  );
};

export default MonetizationProductCard;
