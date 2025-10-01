import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import TopNav from '@/components/TopNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Put LTP - Real-time Option Prices',
  description: 'Track real-time Put Option LTP using Kite API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TopNav />
        <main className="pt-0">{children}</main>
        <Analytics />
      </body>
    </html>
  )
}