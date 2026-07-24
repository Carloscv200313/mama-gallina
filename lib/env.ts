function readRequired(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env.local y completa la configuración.`,
    );
  }

  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: readRequired(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: readRequired(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

export function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseAdminEnv() {
  return {
    url: readRequired(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    serviceRoleKey: readRequired(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  };
}

export function getCloudinaryServerEnv() {
  return {
    cloudName: readRequired(
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    ),
    apiKey: readRequired("CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY),
    apiSecret: readRequired(
      "CLOUDINARY_API_SECRET",
      process.env.CLOUDINARY_API_SECRET,
    ),
    folder: process.env.CLOUDINARY_FOLDER?.trim() || "mama-gallina",
  };
}
