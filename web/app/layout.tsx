import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Welcome Copilot",
  description:
    "From 'Hired' in a shared spreadsheet to a welcome email, an onboarding assistant, and an ops console — a live demo built for Mentella Health's application task.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
