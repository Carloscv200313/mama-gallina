import { requireRole } from "@/lib/auth/server";
import { getCatalog } from "@/lib/pos/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrderComposer } from "@/components/orders/order-composer";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ tableId?: string; type?: string; parentOrderId?: string }> }) {
  const context = await requireRole("admin", "waiter");
  const query = await searchParams;
  const catalog = await getCatalog(context.profile.branchId);
  let table: { id: string; tableNumber: number; name: string | null } | null = null;
  if (query.tableId) {
    const { data } = await createAdminClient().from("tables").select("id, table_number, name").eq("id", query.tableId).eq("branch_id", context.profile.branchId).maybeSingle();
    const tableRow = data as { id: string; table_number: number; name: string | null } | null;
    if (tableRow) table = { id: tableRow.id, tableNumber: tableRow.table_number, name: tableRow.name };
  }
  return <OrderComposer catalog={catalog} table={table} initialOrderType={query.type === "takeaway" ? "takeaway" : table ? "dine_in" : "takeaway"} additionalOrderId={query.parentOrderId} />;
}
