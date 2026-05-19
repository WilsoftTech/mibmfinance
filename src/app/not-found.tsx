import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-center px-4">
      <div className="space-y-2">
        <p className="text-8xl font-bold text-muted-foreground/20 select-none">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild variant="outline" className="gap-2">
        <Link href="/">
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </Button>
    </div>
  )
}
