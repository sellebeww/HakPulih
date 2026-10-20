import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "HakPulih — Kapasitas untuk bangkit bersama",
    template: "%s · HakPulih",
  },
  description:
    "HakPulih menghubungkan percetakan yang terganggu dengan kapasitas mitra dan kelonggaran tenggat yang disepakati semua pihak.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
