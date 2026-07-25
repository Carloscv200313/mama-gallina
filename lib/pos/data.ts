import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_ORDER_STATUSES, type ActiveOrderStatus, type CatalogCategory, type CatalogModifierGroup, type CatalogProduct, type CatalogVariant, type PosTable } from "@/lib/pos/types";

type Row = Record<string, unknown>;

function rows<T extends Row>(data: unknown[] | null): T[] {
  return (data ?? []) as T[];
}

export async function getTablesWithOrders(branchId: string): Promise<PosTable[]> {
  const admin = createAdminClient();
  const [{ data: tableData, error: tableError }, { data: orderData, error: orderError }] = await Promise.all([
    admin.from("tables").select("id, table_number, name, capacity, status").eq("branch_id", branchId).eq("is_active", true).order("table_number"),
    admin.from("orders").select("id, order_code, parent_order_id, table_id, status, total, opened_at, waiter_id").eq("branch_id", branchId).is("parent_order_id", null).in("status", [...ACTIVE_ORDER_STATUSES]).order("opened_at", { ascending: false }),
  ]);
  if (tableError || orderError) throw new Error("No se pudo cargar el mapa de mesas.");

  const orders = rows<{ id: string; order_code: string; parent_order_id: string | null; table_id: string | null; status: string; total: number; opened_at: string; waiter_id: string }>(orderData);
  const waiterIds = [...new Set(orders.map((order) => order.waiter_id).filter(Boolean))];
  const { data: staffData } = waiterIds.length ? await admin.from("staff_members").select("id, full_name").in("id", waiterIds) : { data: [] };
  const staff = new Map(rows<{ id: string; full_name: string }>(staffData).map((person) => [person.id, person.full_name]));
  const orderByTable = new Map<string, (typeof orders)[number]>();
  for (const order of orders) if (order.table_id && !orderByTable.has(order.table_id)) orderByTable.set(order.table_id, order);

  return rows<{ id: string; table_number: number; name: string | null; capacity: number; status: "available" | "out_of_service" }>(tableData).map((table) => {
    const order = orderByTable.get(table.id);
    return {
      id: table.id,
      tableNumber: table.table_number,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
      order: order ? { id: order.id, orderCode: order.order_code, status: order.status as ActiveOrderStatus, total: Number(order.total), openedAt: order.opened_at, waiterName: staff.get(order.waiter_id) ?? "Sin asignar" } : null,
    };
  });
}

export async function getCatalog(branchId: string) {
  const admin = createAdminClient();
  const [{ data: categories, error: categoryError }, { data: productData, error: productError }, { data: variantData }, { data: relationData }, { data: groupData }, { data: optionData }] = await Promise.all([
    admin.from("categories").select("id, name, sort_order").eq("branch_id", branchId).eq("status", "active").order("sort_order"),
    admin.from("products").select("id, category_id, name, description, sale_price, estimated_cost, allows_modifiers, requires_kitchen").eq("branch_id", branchId).eq("is_active", true).eq("is_available", true).order("sort_order"),
    admin.from("product_variants").select("id, product_id, name, sale_price, estimated_cost, max_flavors").eq("branch_id", branchId).eq("status", "active").order("sort_order"),
    admin.from("product_modifier_groups").select("product_id, modifier_group_id, sort_order").eq("branch_id", branchId).order("sort_order"),
    admin.from("modifier_groups").select("id, name, description, selection_mode, is_required, min_selections, max_selections").eq("branch_id", branchId).eq("status", "active").order("created_at"),
    admin.from("modifier_options").select("id, modifier_group_id, name, additional_price").eq("branch_id", branchId).eq("status", "active").order("sort_order"),
  ]);
  if (categoryError || productError) throw new Error("No se pudo cargar la carta.");

  const categoryRows = rows<{ id: string; name: string; sort_order: number }>(categories);
  const productRows = rows<{ id: string; category_id: string; name: string; description: string | null; sale_price: number; estimated_cost: number; allows_modifiers: boolean; requires_kitchen: boolean }>(productData);
  const variants = rows<{ id: string; product_id: string; name: string; sale_price: number; estimated_cost: number; max_flavors: number | null }>(variantData);
  const relations = rows<{ product_id: string; modifier_group_id: string; sort_order: number }>(relationData);
  const groups = rows<{ id: string; name: string; description: string | null; selection_mode: "single" | "multiple"; is_required: boolean; min_selections: number; max_selections: number | null }>(groupData);
  const options = rows<{ id: string; modifier_group_id: string; name: string; additional_price: number }>(optionData);
  const optionsByGroup = new Map<string, CatalogModifierGroup["options"]>();
  for (const option of options) {
    const list = optionsByGroup.get(option.modifier_group_id) ?? [];
    list.push({ id: option.id, groupId: option.modifier_group_id, name: option.name, additionalPrice: Number(option.additional_price) });
    optionsByGroup.set(option.modifier_group_id, list);
  }
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const relationByProduct = new Map<string, typeof relations>();
  for (const relation of relations) relationByProduct.set(relation.product_id, [...(relationByProduct.get(relation.product_id) ?? []), relation]);
  const variantByProduct = new Map<string, typeof variants>();
  for (const variant of variants) variantByProduct.set(variant.product_id, [...(variantByProduct.get(variant.product_id) ?? []), variant]);

  const resultProducts: CatalogProduct[] = productRows.map((product) => ({
    id: product.id,
    categoryId: product.category_id,
    name: product.name,
    description: product.description,
    salePrice: Number(product.sale_price),
    estimatedCost: Number(product.estimated_cost),
    allowsModifiers: product.allows_modifiers,
    requiresKitchen: product.requires_kitchen,
    variants: (variantByProduct.get(product.id) ?? []).map((variant): CatalogVariant => ({ id: variant.id, name: variant.name, salePrice: Number(variant.sale_price), estimatedCost: Number(variant.estimated_cost), maxFlavors: variant.max_flavors })),
    modifierGroups: (relationByProduct.get(product.id) ?? []).flatMap((relation) => { const group = groupById.get(relation.modifier_group_id); return group ? [{ id: group.id, name: group.name, description: group.description, selectionMode: group.selection_mode, isRequired: group.is_required, minSelections: group.min_selections, maxSelections: group.max_selections, options: optionsByGroup.get(group.id) ?? [] }] : []; }),
  }));
  const resultCategories: CatalogCategory[] = categoryRows.map((category) => ({ id: category.id, name: category.name, sortOrder: category.sort_order }));
  return { categories: resultCategories, products: resultProducts };
}
