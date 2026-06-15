'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = pathname.startsWith('/auth')

  return (
    <>
      {children}
      {!isAuthRoute && <BottomNav />}
    </>
  )
}
