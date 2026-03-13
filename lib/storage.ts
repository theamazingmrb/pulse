import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadImage(
  file: File,
  bucket: "avatars" | "project-banners" | "task-images",
  userId: string
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function deleteImage(
  url: string,
  bucket: "avatars" | "project-banners" | "task-images"
): Promise<void> {
  // Extract file path from URL
  const urlParts = url.split("/");
  const fileName = urlParts[urlParts.length - 1];
  const filePath = urlParts[urlParts.length - 2] + "/" + fileName;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) throw error;
}
