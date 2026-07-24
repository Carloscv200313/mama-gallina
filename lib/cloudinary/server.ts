import "server-only";

import { createHash } from "node:crypto";
import { getCloudinaryServerEnv } from "@/lib/env";

export function createCloudinaryUploadSignature({
  folder,
  timestamp,
}: {
  folder: string;
  timestamp: number;
}) {
  const { apiSecret } = getCloudinaryServerEnv();
  const parameters = `folder=${folder}&timestamp=${timestamp}`;
  return createHash("sha1")
    .update(`${parameters}${apiSecret}`)
    .digest("hex");
}

export function getPaymentEvidenceFolder({
  branchId,
  orderCode,
  now = new Date(),
}: {
  branchId: string;
  orderCode: string;
  now?: Date;
}) {
  const { folder } = getCloudinaryServerEnv();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${folder}/pagos/${branchId}/${year}/${month}/${orderCode}`;
}

