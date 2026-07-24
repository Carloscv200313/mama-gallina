import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Ingresa un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export const recoverySchema = z.object({
  email: z.email("Ingresa un correo válido."),
});

export const passwordResetSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RecoveryInput = z.infer<typeof recoverySchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

