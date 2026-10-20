import type { Metadata } from "next";
export const metadata: Metadata = { title: "Simulasi jaringan" };
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
