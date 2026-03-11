import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Codenames Multiplayer",
  description: "Play Codenames online with friends! Choose from 15+ themes including Pokémon, One Piece, Star Wars, Naruto, and more.",
  other: {
    'theme-color': '#0f172a',
  },
  openGraph: {
    title: 'Codenames Multiplayer',
    description: 'Play Codenames online with friends using custom themes!',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
