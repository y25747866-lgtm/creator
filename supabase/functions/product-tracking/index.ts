// Product tracking edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAccess, corsHeaders, errorResponse } from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ STRICT SUBSCRIPTION ENFORCEMENT
    const access = await verifyAccess(req);
    if (!access.authorized) {
      return errorResponse(access.error || "Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const user = { id: access.userId };

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "create-product") {
        const { title, topic, description, length, content, coverImageUrl, pages } = body;

        // Insert product
        const { data: product, error: prodErr } = await supabase
          .from("ebook_products")
          .insert({ user_id: user.id, title, topic, description, length: length || "medium", status: "published" })
          .select()
          .single();

        if (prodErr) throw prodErr;

        // Insert first version
        const { data: version, error: verErr } = await supabase
          .from("product_versions")
          .insert({
            product_id: product.id,
            version_number: 1,
            content: content || "",
            cover_image_url: coverImageUrl || null,
            pages: pages || 0,
            change_summary: "Initial version",
          })
          .select()
          .single();

        if (verErr) throw verErr;

        // Set current version
        await supabase
          .from("ebook_products")
          .update({ current_version_id: version.id })
          .eq("id", product.id);

        return new Response(JSON.stringify({ product, version }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "record-metric") {
        const { productId, metricType, value, metadata } = body;

        const { error } = await supabase
          .from("product_metrics")
          .insert({
            product_id: productId,
            metric_type: metricType,
            value: value || 1,
            metadata: metadata || null,
          });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "submit-feedback") {
        const { productId, rating, comment, sectionReference, feedbackType } = body;

        const { data, error } = await supabase
          .from("product_feedback")
          .insert({
            product_id: productId,
            user_id: user.id,
            rating: rating || null,
            comment: comment || null,
            section_reference: sectionReference || null,
            feedback_type: feedbackType || "general",
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // GET actions
    if (req.method === "GET") {
      if (action === "list-products") {
        const { data, error } = await supabase
          .from("ebook_products")
          .select("*, product_versions(id, version_number, pages, created_at, change_summary)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get-metrics") {
        const productId = url.searchParams.get("productId");
        if (!productId) {
          return new Response(JSON.stringify({ error: "productId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Aggregate metrics
        const { data: metrics, error } = await supabase
          .from("product_metrics")
          .select("*")
          .eq("product_id", productId)
          .order("recorded_at", { ascending: false });

        if (error) throw error;

        // Summarize
        const summary: Record<string, number> = {};
        for (const m of metrics || []) {
          summary[m.metric_type] = (summary[m.metric_type] || 0) + m.value;
        }

        return new Response(JSON.stringify({ metrics, summary }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get-feedback") {
        const productId = url.searchParams.get("productId");
        if (!productId) {
          return new Response(JSON.stringify({ error: "productId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("product_feedback")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "get-versions") {
        const productId = url.searchParams.get("productId");
        if (!productId) {
          return new Response(JSON.stringify({ error: "productId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("product_versions")
          .select("*")
          .eq("product_id", productId)
          .order("version_number", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("product-tracking error:", err);
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});
