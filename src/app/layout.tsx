import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vórtex Chef - Recetario y listas de compras, sin límites",
  description:
    "Vórtex Chef, de Vortex Company: guarda tus recetas con ingredientes y pasos, escala porciones y genera listas de compras agregadas y agrupadas por categoría del supermercado. Todo vive en tu propio equipo. Gratis, sin anuncios y 100% local.",
  keywords: [
    "Vórtex Chef",
    "recetario online",
    "lista de compras",
    "recetas local",
    "organizar comidas",
    "sin anuncios",
  ],
  authors: [{ name: "Vortex Company" }],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#161616"/><circle cx="24" cy="24" r="17" fill="none" stroke="#fb7185" stroke-width="3.5"/><path d="M17 24h6M20 21v6M27 21c2 0 3 1.5 3 3s-1 3-3 3h-2v-6h2zM18 33c2 2 10 2 12 0" fill="none" stroke="#fda4af" stroke-width="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>`
      ),
  },
  openGraph: {
    title: "Vórtex Chef - Recetario y listas de compras, sin límites",
    description:
      "Vórtex Chef, de Vortex Company: recetas con escala de porciones y listas de compras agrupadas por categoría, todo local en tu navegador. Gratis, sin anuncios y 100% local.",
    siteName: "Vórtex Chef - Recetario y listas de compras, sin límites",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-[#0f0f10] text-[#ececf1]">{children}</body>
    </html>
  );
}
