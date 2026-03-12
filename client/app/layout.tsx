import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./providers";

export const metadata: Metadata = {
  title: "GeoAslan - Coğrafya Tahmin Oyunu 🦁",
  description: "GeoGuessr tarzı coğrafya tahmin oyunu. Dünya'nın dört bir yanından Street View panoramalarını keşfet ve konumunu tahmin et!",
  keywords: ["geoguessr", "coğrafya", "oyun", "tahmin", "streetview", "harita"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
