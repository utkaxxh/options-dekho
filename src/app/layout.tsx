import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import TopNav from '@/components/TopNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OptionsDekho',
  description: 'OptionsDekho – Live F&O option yields, strikes and watchlist powered by Kite API',
  openGraph: {
    title: 'OptionsDekho',
    description: 'Live F&O option yields, nearest strikes and custom watchlist',
  },
  twitter: {
    title: 'OptionsDekho',
    description: 'Live F&O option yields, nearest strikes and custom watchlist',
    card: 'summary_large_image'
  }
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
        <main className="pt-0 min-h-[calc(100vh-140px)]">{children}</main>
        <footer className="mt-8 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span>&copy; {new Date().getFullYear()} OptionsDekho</span>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSd5N64NizLbgnGbR4tbXqDl-RiU4thfiaBagfV6GYmtBRxSNA/viewform?usp=dialog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              Give Feedback
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5 4a1 1 0 011-1h9a1 1 0 011 1v9a1 1 0 11-2 0V6.414l-8.293 8.293a1 1 0 01-1.414-1.414L12.586 5H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </a>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  )
}