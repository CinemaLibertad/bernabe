import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bernabé Nieto | Estudio Jurídico",
  description: "Justicia, compromiso y excelencia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
