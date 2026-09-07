import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ButtonRippleProvider from './components/ButtonRippleProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const syne = Manrope({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title: 'MnemonicFlow Pro — AI Medical Mnemonics for MBBS',
  description: 'Generate story-based mnemonics, visual prompts, and Anki flashcards for medical school.',
  keywords: ['medical mnemonics', 'MBBS', 'Anki', 'flashcards', 'anatomy', 'pharmacology'],
  authors: [{ name: 'MnemonicFlow' }],
}

export const viewport: Viewport = {
  themeColor: '#050505',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable} ${jetbrains.variable}`}>
      <body className="antialiased bg-void text-ink-primary">
        <ButtonRippleProvider />
        {children}
      </body>
    </html>
  )
}
