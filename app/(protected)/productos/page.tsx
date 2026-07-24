import { Package, Plus, Power } from "lucide-react";
import { createProduct, toggleProductAvailability } from "@/app/actions/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductCreateForm } from "@/components/catalog/product-create-form";

export default async function ProductsPage() {
  const context = await requireRole("admin");
  const admin = createAdminClient();
  const [{ data: products }, { data: categories }] = await Promise.all([admin.from("products").select("id, code, name, sale_price, estimated_cost, is_available, is_active, preparation_minutes, category_id").eq("branch_id", context.profile.branchId).order("sort_order").order("name"), admin.from("categories").select("id, name").eq("branch_id", context.profile.branchId).eq("status", "active").order("sort_order")]);
  const productRows = (products ?? []) as Array<{ id: string; code: string; name: string; sale_price: number; estimated_cost: number; is_available: boolean; preparation_minutes: number; category_id: string }>;
  const categoryRows = (categories ?? []) as Array<{ id: string; name: string }>;
  const categoryMap = new Map(categoryRows.map((category) => [category.id, category.name]));
  return <div className="mx-auto max-w-7xl space-y-6"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-olive">Catálogo</p><h1 className="mt-2 font-display text-4xl font-bold">Carta de productos</h1><p className="mt-2 text-brand-olive">Precios, costos estimados y disponibilidad.</p></div><Badge variant="muted"><Package className="mr-1 size-3.5" /> {productRows.length} productos</Badge></div><div className="grid gap-5 xl:grid-cols-[360px_1fr]"><Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5" /> Nuevo producto</CardTitle></CardHeader><CardContent><ProductCreateForm categories={categoryRows} action={createProduct} /></CardContent></Card><Card><CardHeader><CardTitle>Productos registrados</CardTitle></CardHeader><CardContent className="space-y-3">{productRows.length === 0 ? <p className="py-10 text-center text-sm text-brand-olive">No hay productos registrados.</p> : productRows.map((product) => <div key={product.id} className="flex flex-col gap-3 rounded-xl border border-brand-olive/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{product.name}</p><Badge variant={product.is_available ? "success" : "danger"}>{product.is_available ? "Disponible" : "Agotado"}</Badge></div><p className="mt-1 text-sm text-brand-olive">{categoryMap.get(product.category_id) ?? "Sin categoría"} · Código {product.code} · {product.preparation_minutes} min</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="font-display font-bold">S/ {Number(product.sale_price).toFixed(2)}</p><p className="text-xs text-brand-olive">Costo S/ {Number(product.estimated_cost).toFixed(2)}</p></div><form action={toggleProductAvailability}><input type="hidden" name="productId" value={product.id} /><Button variant="outline" size="sm"><Power className="size-4" /> {product.is_available ? "Agotar" : "Activar"}</Button></form></div></div>)}</CardContent></Card></div></div>;
}
