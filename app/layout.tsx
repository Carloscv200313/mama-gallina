import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mamá Gallina POS",
    template: "%s | Mamá Gallina POS",
  },
  description: "Sistema de pedidos, cocina, caja y control de ventas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
