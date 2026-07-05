import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capstockx — Trade smarter",
  description: "Capstockx — your gateway to India's financial markets. Web access and admin panel.",
  icons: {
    icon: [{ url: "/icon.jpg" }, { url: "/icon.jpeg" }],
    shortcut: "/icon.jpg",
    apple: "/icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
