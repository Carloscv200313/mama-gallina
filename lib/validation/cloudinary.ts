import { z } from "zod";

export const cloudinarySignatureRequestSchema = z.object({
  orderCode: z
    .string()
    .trim()
    .min(1, "El código del pedido es obligatorio.")
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, "El código del pedido contiene caracteres no válidos."),
});

