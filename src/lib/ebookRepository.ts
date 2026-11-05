import { supabase } from "@/integrations/supabase/client";
import type { Ebook } from "@/hooks/useEbookStore";

export type MediaAttachment = {
  id: string;
  path: string;
  name: string;
  mimeType: string;
  size: number;
  signedUrl?: string;
};

const MEDIA_BUCKET = "nexora-user-media";
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm", "video/quicktime", "video/ogg",
]);

export async function saveGeneratedEbook(ebook: Omit<Ebook, "id" | "dbProductId">, userId: string): Promise<Ebook> {
  const { data: product, error: productError } = await supabase
    .from("ebook_products")
    .insert({
      user_id: userId,
      title: ebook.title,
      topic: ebook.topic,
      description: ebook.description ?? null,
      length: ebook.length ?? "medium",
      status: "draft",
    })
    .select("id")
    .single();

  if (productError || !product) throw new Error(productError?.message || "Could not save this product to Projects.");

  const { data: version, error: versionError } = await supabase
    .from("product_versions")
    .insert({
      product_id: product.id,
      version_number: 1,
      content: ebook.content,
      cover_image_url: ebook.coverImageUrl,
      pages: ebook.pages,
      change_summary: "Initial generated draft",
    })
    .select("id")
    .single();

  if (versionError || !version) {
    await supabase.from("ebook_products").delete().eq("id", product.id).eq("user_id", userId);
    throw new Error(versionError?.message || "The product record was saved, but its content could not be stored.");
  }

  const { error: updateError } = await supabase
    .from("ebook_products")
    .update({ current_version_id: version.id, status: "draft" })
    .eq("id", product.id)
    .eq("user_id", userId);

  if (updateError) {
    await supabase.from("ebook_products").delete().eq("id", product.id).eq("user_id", userId);
    throw new Error(updateError.message || "Could not finish saving the generated product.");
  }

  return { ...ebook, id: product.id, dbProductId: product.id, userId };
}

export async function listGeneratedEbooks(userId: string): Promise<Ebook[]> {
  const { data: products, error: productError } = await supabase
    .from("ebook_products")
    .select("id,user_id,title,topic,description,length,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (productError) throw new Error(productError.message || "Could not load Projects.");
  if (!products?.length) return [];

  const ids = products.map((product) => product.id);
  const { data: versions, error: versionError } = await supabase
    .from("product_versions")
    .select("id,product_id,version_number,content,cover_image_url,pages,created_at")
    .in("product_id", ids)
    .order("version_number", { ascending: false })
    .order("created_at", { ascending: false });

  if (versionError) throw new Error(versionError.message || "Could not load saved product content.");
  const newestVersion = new Map<string, NonNullable<typeof versions>[number]>();
  for (const version of versions ?? []) {
    if (!newestVersion.has(version.product_id)) newestVersion.set(version.product_id, version);
  }

  return products.flatMap((product) => {
    const version = newestVersion.get(product.id);
    if (!version) return [];
    return [{
      id: product.id,
      dbProductId: product.id,
      userId: product.user_id,
      title: product.title,
      topic: product.topic,
      description: product.description ?? undefined,
      content: version.content,
      coverImageUrl: version.cover_image_url,
      pages: version.pages,
      length: product.length as Ebook["length"],
      createdAt: product.created_at,
    }];
  });
}

export async function deleteGeneratedEbook(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("ebook_products")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message || "Could not delete this product.");
}

export async function uploadCreatorMedia(file: File, userId: string): Promise<MediaAttachment> {
  if (!ALLOWED_MEDIA_TYPES.has(file.type)) throw new Error("Choose an image or video file in a supported format.");
  if (file.size <= 0 || file.size > MAX_MEDIA_BYTES) throw new Error("Each image or video must be smaller than 50 MB.");

  const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(-100) || "upload";
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Upload failed. Check the storage setup and try again.");

  const { data: signed, error: signedError } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (signedError) throw new Error(signedError.message || "The file uploaded, but its preview link could not be created.");
  return { id: crypto.randomUUID(), path, name: file.name, mimeType: file.type, size: file.size, signedUrl: signed.signedUrl };
}

export async function refreshMediaLinks(attachments: MediaAttachment[]): Promise<MediaAttachment[]> {
  return Promise.all(attachments.map(async (attachment) => {
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(attachment.path, 3600);
    return error || !data ? attachment : { ...attachment, signedUrl: data.signedUrl };
  }));
}

export async function deleteCreatorMedia(path: string): Promise<void> {
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) throw new Error(error.message || "Could not remove this uploaded file.");
}
