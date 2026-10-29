import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { profile, projectFilters } from "@/content/profile";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CommandPalette } from "@/components/command-palette";
import { themeInitScript } from "@/lib/theme";
import { funInitScript } from "@/lib/fun";
import { Toaster } from "@/components/toaster";
import { FxCanvas } from "@/components/fx-canvas";
import { EasterEggs } from "@/components/easter-eggs";
import "./globals.css";

// Self-hosted fonts: no request to Google at runtime, which keeps the CSP to 'self'.
const bricolage = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const plex = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
});

const description = `${profile.name} is a ${profile.role.toLowerCase()} in ${profile.location} building full-stack web products with TypeScript, Next.js and Python.`;

export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: {
    default: `${profile.name}, ${profile.role.toLowerCase()}`,
    template: `%s | ${profile.name}`,
  },
  description,
  authors: [{ name: profile.name, url: profile.siteUrl }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: profile.name,
    title: `${profile.name}, ${profile.role.toLowerCase()}`,
    description,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1c22" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning className={`${bricolage.variable} ${plex.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-paper text-ink">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript + funInitScript}
        </Script>
        <a
          href="#main"
          className="sr-only z-50 rounded bg-kelp px-4 py-2 font-medium text-kelp-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
        <CommandPalette
          sections={[
            { id: "work", label: "Selected work" },
            { id: "github", label: "On GitHub" },
            { id: "experience", label: "Experience" },
            { id: "education", label: "Education" },
            { id: "skills", label: "Skills" },
            { id: "contact", label: "Contact" },
          ]}
          filters={projectFilters}
          email={profile.email}
          links={[...profile.links, { label: "site source code", href: `https://github.com/${profile.githubUser}/${profile.domain}` }]}
        />
        <Toaster />
        <FxCanvas />
        <EasterEggs email={profile.email} />
      </body>
    </html>
  );
}
