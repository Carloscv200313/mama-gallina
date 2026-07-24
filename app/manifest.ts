import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mamá Gallina POS",
    short_name: "Mamá Gallina",
    description: "Pedidos, cocina, caja y control de ventas.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6F1E7",
    theme_color: "#31452F",
    lang: "es-PE",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

