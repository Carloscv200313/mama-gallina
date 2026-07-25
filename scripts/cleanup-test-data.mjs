import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const fileName of [".env.local", ".env"]) {
  if (!fs.existsSync(fileName)) continue;
  const content = fs.readFileSync(fileName, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const requiredEnvironment = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const missing = requiredEnvironment.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
if (!process.argv.includes("--confirm")) {
  console.error("Este comando elimina datos transaccionales y evidencias de Cloudinary.");
  console.error("Para ejecutarlo escribe: pnpm cleanup:test -- --confirm");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudApiKey = process.env.CLOUDINARY_API_KEY;
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;

const { data: branch, error: branchError } = await admin.from("branches").select("id, code").eq("code", "MAIN").maybeSingle();
if (branchError) throw branchError;
if (!branch) throw new Error("No existe el local MAIN.");
const branchId = String(branch.id);

const { data: evidenceRows, error: evidenceError } = await admin.from("payment_evidences").select("public_id").eq("branch_id", branchId);
if (evidenceError) throw evidenceError;
const publicIds = [...new Set((evidenceRows ?? []).map((row) => String(row.public_id)).filter(Boolean))];

async function deleteCloudinaryImage(publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash("sha1").update(`public_id=${publicId}&timestamp=${timestamp}${cloudApiSecret}`).digest("hex");
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: cloudApiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const result = await response.json();
  if (!response.ok || !["ok", "not found"].includes(result.result)) throw new Error(`Cloudinary no pudo eliminar ${publicId}: ${result.error?.message ?? result.result ?? response.status}`);
}

for (const publicId of publicIds) await deleteCloudinaryImage(publicId);

async function deleteBranchRows(table, configure) {
  let query = admin.from(table).delete({ count: "exact" }).eq("branch_id", branchId);
  if (configure) query = configure(query);
  const { count, error } = await query;
  if (error) throw new Error(`No se pudo limpiar ${table}: ${error.message}`);
  return count ?? 0;
}

const deleted = {};
deleted.cashMovements = await deleteBranchRows("cash_movements");
deleted.paymentEvidences = await deleteBranchRows("payment_evidences");
deleted.payments = await deleteBranchRows("payments");
deleted.orderStatusHistory = await deleteBranchRows("order_status_history");
deleted.orderItemModifiers = await deleteBranchRows("order_item_modifiers");
deleted.orderItems = await deleteBranchRows("order_items");
deleted.expenses = await deleteBranchRows("expenses");
deleted.childOrders = await deleteBranchRows("orders", (query) => query.not("parent_order_id", "is", null));
deleted.rootOrders = await deleteBranchRows("orders", (query) => query.is("parent_order_id", null));
deleted.cashSessions = await deleteBranchRows("cash_sessions");
deleted.auditLogs = await deleteBranchRows("audit_logs");

console.log(`Datos transaccionales eliminados del local ${branch.code}.`);
console.log(`Evidencias eliminadas de Cloudinary: ${publicIds.length}.`);
console.table(deleted);
