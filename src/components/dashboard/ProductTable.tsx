import { useState, useMemo } from "react";
import { Search, ArrowUpDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { ProductRecord } from "@/lib/dashboardMetrics";

interface ProductWithStats extends ProductRecord {
  views: number;
  downloads: number;
  conversionRate: number;
  avgRating: number;
}

interface Props {
  products: ProductWithStats[];
  loading: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

type SortKey = "title" | "created_at" | "views" | "downloads" | "conversionRate" | "avgRating";

const ProductTable = ({ products, loading, onSelect, selectedId }: Props) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = products.filter((p) => p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q));
    list.sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [products, search, sortKey, sortAsc]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No products match your search.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead><SortHeader label="Title" k="title" /></TableHead>
                <TableHead className="hidden md:table-cell">Topic</TableHead>
                <TableHead className="hidden lg:table-cell"><SortHeader label="Created" k="created_at" /></TableHead>
                <TableHead className="text-right"><SortHeader label="Views" k="views" /></TableHead>
                <TableHead className="text-right"><SortHeader label="Downloads" k="downloads" /></TableHead>
                <TableHead className="text-right hidden sm:table-cell"><SortHeader label="Conv." k="conversionRate" /></TableHead>
                <TableHead className="text-right hidden sm:table-cell"><SortHeader label="Rating" k="avgRating" /></TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={`cursor-pointer ${selectedId === p.id ? "bg-primary/5" : ""}`}
                >
                  <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="font-normal">{p.topic}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.views}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.downloads}</TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">{p.conversionRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">
                    {p.avgRating > 0 ? p.avgRating.toFixed(1) : "-"}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
