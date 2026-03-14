import { supabase } from "@/lib/supabase";
import { WarMapCategory, WarMapItem } from "@/types";

// ── Categories ──────────────────────────────────────────────────────────────

export async function getWarMapCategories(userId: string): Promise<WarMapCategory[]> {
  const { data, error } = await supabase
    .from("warmap_categories")
    .select(`
      *,
      items:warmap_items(*)
    `)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading warmap categories:", error);
    return [];
  }
  return data ?? [];
}

export async function createWarMapCategory(
  userId: string,
  data: { name: string; description?: string; color?: string; icon?: string }
): Promise<WarMapCategory | null> {
  const { data: result, error } = await supabase
    .from("warmap_categories")
    .insert({ user_id: userId, ...data })
    .select()
    .single();

  if (error) {
    console.error("Error creating warmap category:", error);
    return null;
  }
  return result;
}

export async function updateWarMapCategory(
  id: string,
  data: Partial<{ name: string; description: string; color: string; icon: string; sort_order: number }>
): Promise<WarMapCategory | null> {
  const { data: result, error } = await supabase
    .from("warmap_categories")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating warmap category:", error);
    return null;
  }
  return result;
}

export async function deleteWarMapCategory(id: string): Promise<boolean> {
  const { error } = await supabase.from("warmap_categories").delete().eq("id", id);
  if (error) {
    console.error("Error deleting warmap category:", error);
    return false;
  }
  return true;
}

// ── Items ────────────────────────────────────────────────────────────────────

export async function createWarMapItem(
  userId: string,
  categoryId: string,
  data: { title: string; description?: string; target_date?: string }
): Promise<WarMapItem | null> {
  const { data: result, error } = await supabase
    .from("warmap_items")
    .insert({ user_id: userId, category_id: categoryId, ...data })
    .select()
    .single();

  if (error) {
    console.error("Error creating warmap item:", error);
    return null;
  }
  return result;
}

export async function updateWarMapItem(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: "active" | "completed" | "abandoned";
    target_date: string;
    sort_order: number;
  }>
): Promise<WarMapItem | null> {
  const { data: result, error } = await supabase
    .from("warmap_items")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating warmap item:", error);
    return null;
  }
  return result;
}

export async function deleteWarMapItem(id: string): Promise<boolean> {
  const { error } = await supabase.from("warmap_items").delete().eq("id", id);
  if (error) {
    console.error("Error deleting warmap item:", error);
    return false;
  }
  return true;
}

// ── Task ↔ WarMap Item links ─────────────────────────────────────────────────

export async function linkTaskToWarMapItem(taskId: string, warmapItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from("task_warmap_items")
    .insert({ task_id: taskId, warmap_item_id: warmapItemId });

  if (error && error.code !== "23505") {
    // 23505 = unique violation (already linked)
    console.error("Error linking task to warmap item:", error);
    return false;
  }
  return true;
}

export async function unlinkTaskFromWarMapItem(taskId: string, warmapItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from("task_warmap_items")
    .delete()
    .eq("task_id", taskId)
    .eq("warmap_item_id", warmapItemId);

  if (error) {
    console.error("Error unlinking task from warmap item:", error);
    return false;
  }
  return true;
}

export async function getWarMapItemsForTask(taskId: string): Promise<WarMapItem[]> {
  const { data, error } = await supabase
    .from("task_warmap_items")
    .select("warmap_items(*)")
    .eq("task_id", taskId);

  if (error) {
    console.error("Error loading warmap items for task:", error);
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => row.warmap_items as WarMapItem);
}

export async function getAllWarMapItems(userId: string): Promise<(WarMapItem & { category: WarMapCategory })[]> {
  const { data, error } = await supabase
    .from("warmap_items")
    .select("*, category:warmap_categories(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error loading warmap items:", error);
    return [];
  }
  return data ?? [];
}
