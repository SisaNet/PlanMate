import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "PlanMate | South African Building Plan Compliance",
  description:
    "Verify building plan submissions against municipality requirements before submission. Eliminate preventable rejections.",
  keywords: [
    "building plans",
    "South Africa",
    "compliance",
    "municipality",
    "SACAP",
    "SANS 10400",
    "architectural",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
