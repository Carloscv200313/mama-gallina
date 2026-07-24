export const ACTIVE_ORDER_STATUSES = [
  "draft",
  "confirmed",
  "sent_to_kitchen",
  "preparing",
  "partially_ready",
  "ready",
  "delivered",
  "payment_pending",
] as const;

export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];

export type PosTable = {
  id: string;
  tableNumber: number;
  name: string | null;
  capacity: number;
  status: "available" | "out_of_service";
  order: {
    id: string;
    orderCode: string;
    status: ActiveOrderStatus;
    total: number;
    openedAt: string;
    waiterName: string;
  } | null;
};

export type CatalogCategory = { id: string; name: string; sortOrder: number };

export type CatalogOption = {
  id: string;
  groupId: string;
  name: string;
  additionalPrice: number;
};

export type CatalogModifierGroup = {
  id: string;
  name: string;
  description: string | null;
  selectionMode: "single" | "multiple";
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  options: CatalogOption[];
};

export type CatalogVariant = {
  id: string;
  name: string;
  salePrice: number;
  estimatedCost: number;
  maxFlavors: number | null;
};

export type CatalogProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  salePrice: number;
  estimatedCost: number;
  allowsModifiers: boolean;
  requiresKitchen: boolean;
  variants: CatalogVariant[];
  modifierGroups: CatalogModifierGroup[];
};

export type OrderComposerItem = {
  localId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  modifiersTotal: number;
  modifierLabels: string[];
  modifierIds: Array<{ groupId: string; optionId: string; quantity: number }>;
  perPlateGroupIds: string[];
  plateSelections: Array<Record<string, string[]>>;
  notes: string;
  priority: "normal" | "high";
  hasPerPlateOptions: boolean;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

export function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Borrador",
    confirmed: "Confirmado",
    sent_to_kitchen: "Enviado a cocina",
    preparing: "En preparación",
    partially_ready: "Parcialmente listo",
    ready: "Listo",
    delivered: "Entregado",
    payment_pending: "Por cobrar",
    paid: "Pagado",
    cancelled: "Anulado",
    partially_cancelled: "Parcialmente anulado",
  };
  return labels[status] ?? status;
}

export function orderStatusClass(status: string) {
  if (status === "ready") return "bg-emerald-100 text-emerald-800";
  if (status === "preparing" || status === "sent_to_kitchen") return "bg-amber-100 text-amber-800";
  if (status === "payment_pending") return "bg-sky-100 text-sky-800";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  return "bg-brand-sage/20 text-brand-forest";
}
