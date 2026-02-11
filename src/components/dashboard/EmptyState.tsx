import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
      <BookOpen className="w-8 h-8 text-primary" />
    </div>
    <h2 className="text-xl font-semibold mb-2">No products yet</h2>
    <p className="text-muted-foreground max-w-sm mb-8">
      Generate your first ebook to unlock analytics and start tracking performance.
    </p>
    <Button asChild size="lg">
      <Link to="/dashboard/ebook-generator">Create Your First Ebook</Link>
    </Button>
  </div>
);

export default EmptyState;
