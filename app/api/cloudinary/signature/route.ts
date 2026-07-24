import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/server";
import { createCloudinaryUploadSignature, getPaymentEvidenceFolder } from "@/lib/cloudinary/server";
import { getCloudinaryServerEnv } from "@/lib/env";
import { cloudinarySignatureRequestSchema } from "@/lib/validation/cloudinary";

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!context.roles.includes("admin") && !context.roles.includes("cashier")) {
    return NextResponse.json({ error: "No autorizado para cargar evidencias." }, { status: 403 });
  }

  if (!context.profile.branchId) {
    return NextResponse.json({ error: "El usuario no tiene un local asignado." }, { status: 400 });
  }

  const parsedBody = cloudinarySignatureRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Código de pedido inválido." }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = getPaymentEvidenceFolder({ branchId: context.profile.branchId, orderCode: parsedBody.data.orderCode });
  const { apiKey, cloudName } = getCloudinaryServerEnv();

  return NextResponse.json({
    apiKey,
    cloudName,
    folder,
    timestamp,
    signature: createCloudinaryUploadSignature({ folder, timestamp }),
  });
}

