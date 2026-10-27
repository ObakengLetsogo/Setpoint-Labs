import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/config";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Setpoint Labs: Learn PLC logic by running it.",
  description:
    "Setpoint Labs is a browser based PLC and industrial automation training platform. Read a lesson, watch ladder logic or structured text execute line by line, and see an animated 3D industrial rig react in real time.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  openGraph: {
    title: "Setpoint Labs: Learn PLC logic by running it.",
    description:
      "An interactive PLC simulator and course in one: ladder diagram and structured text lessons with a live animated 3D rig.",
    images: ["/brand/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Setpoint Labs: Learn PLC logic by running it.",
    description: "Learn PLC logic by running it.",
    images: ["/brand/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#FAF8F3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-ink font-body">{children}</body>
    </html>
  );
}
