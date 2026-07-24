"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

const productSchema = z.object({ categoryId: z.uuid(), code: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(120), description: z.string().trim().max(500), salePrice: z.coerce.number().finite().min(0).max(999999.99), estimatedCost: z.coerce.number().finite().min(0).max(999999.99), preparationMinutes: z.coerce.number().int().min(0).max(1440), allowsModifiers: z.boolean(), requiresKitchen: z.boolean() });
export type CatalogActionState = { error?: string; success?: string };

export async function createProduct(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const context = await requireRole("admin");
  const parsed = productSchema.safeParse({ categoryId: formData.get("categoryId"), code: formData.get("code"), name: formData.get("name"), description: formData.get("description"), salePrice: formData.get("salePrice"), estimatedCost: formData.get("estimatedCost"), preparationMinutes: formData.get("preparationMinutes"), allowsModifiers: formData.get("allowsModifiers") === "on", requiresKitchen: formData.get("requiresKitchen") !== "off" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del producto." };
  const slug = parsed.data.name.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const { error } = await createAdminClient().from("products").insert({ branch_id: context.profile.branchId, category_id: parsed.data.categoryId, code: parsed.data.code.toUpperCase(), name: parsed.data.name, slug, description: parsed.data.description || null, sale_price: parsed.data.salePrice, estimated_cost: parsed.data.estimatedCost, preparation_minutes: parsed.data.preparationMinutes, allows_modifiers: parsed.data.allowsModifiers, requires_kitchen: parsed.data.requiresKitchen, is_available: true, is_active: true, created_by: context.staffId, updated_by: context.staffId });
  if (error) return { error: error.code === "23505" ? "El código o nombre ya existe en este local." : "No se pudo crear el producto." };
  await createAdminClient().from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "product.created", entity: "products", after_data: { code: parsed.data.code, name: parsed.data.name } });
  revalidatePath("/productos"); revalidatePath("/pedidos/nuevo");
  return { success: "Producto creado correctamente." };
}

export async function toggleProductAvailability(formData: FormData) {
  const context = await requireRole("admin");
  const productId = z.uuid().safeParse(formData.get("productId"));
  if (!productId.success) return;
  const admin = createAdminClient();
  const { data: rawProduct } = await admin.from("products").select("id, name, is_available").eq("id", productId.data).eq("branch_id", context.profile.branchId).maybeSingle();
  const product = rawProduct as { id: string; name: string; is_available: boolean } | null;
  if (!product) return;
  await admin.from("products").update({ is_available: !product.is_available, updated_by: context.staffId }).eq("id", product.id);
  await admin.from("audit_logs").insert({ branch_id: context.profile.branchId, actor_id: context.staffId, action: "product.availability_changed", entity: "products", entity_id: product.id, before_data: { is_available: product.is_available }, after_data: { is_available: !product.is_available } });
  revalidatePath("/productos"); revalidatePath("/pedidos/nuevo");
}
