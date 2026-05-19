'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { useAppStore } from '@/lib/store'
import { Loader2 } from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function HomeContent() {
  const { currentUser, _hasHydrated } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (_hasHydrated && !currentUser) {
      router.push('/login')
    }
  }, [_hasHydrated, currentUser, router])

  if (!_hasHydrated || !currentUser) {
    return <LoadingScreen />
  }

  return <AppShell />
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomeContent />
    </Suspense>
  )
}
