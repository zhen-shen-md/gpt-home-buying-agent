import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GPT Home Buying Agent",
  description: "Transparent, adaptable property rankings from your home preferences.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
