'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReportsModule } from '@/components/modules/reports'
import { useAppStore } from '@/lib/store'
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { CommandPalette } from '@/components/layout/command-palette'
import { DashboardPage } from '@/components/modules/dashboard'
import { StudentsModule } from '@/components/modules/students'
import { PaymentsModule } from '@/components/modules/payments'
import { ExpensesModule } from '@/components/modules/expenses'
import { SettingsModule } from '@/components/modules/settings'
import { CashbookModule } from '@/components/modules/cashbook'
import { Users, DollarSign, Receipt, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { PageType } from '@/lib/types'
import { useRouter, useSearchParams } from 'next/navigation'

// ============================================================
// Placeholder Pages
// ============================================================
function StudentsPage() {
  return <StudentsModule />
}

function PaymentsPage() {
  return <PaymentsModule />
}

function ExpensesPage() {
  return <ExpensesModule />
}

function CashbookPage() {
  return <CashbookModule />
}

function ReportsPage() {
  return <ReportsModule />
}

function SettingsPage() {
  return <SettingsModule />
}

// ============================================================
// Page Mapper
// ============================================================
const pageComponents: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  students: StudentsPage,
  payments: PaymentsPage,
  expenses: ExpensesPage,
  cashbook: CashbookPage,
  reports: ReportsPage,
  settings: SettingsPage,
}

// ============================================================
// Page order for determining slide direction
// ============================================================
const pageOrder: PageType[] = ['dashboard', 'students', 'payments', 'expenses', 'cashbook', 'reports', 'settings']

// ============================================================
// Quick Stats Footer
// ============================================================
function QuickStatsFooter() {
  const { quickStats } = useAppStore()

  const stats = [
    {
      icon: Users,
      label: 'Students',
      value: quickStats.totalStudents.toLocaleString(),
      color: 'text-teal-600 dark:text-teal-400',
    },
    {
      icon: DollarSign,
      label: "Today's Collections",
      value: formatCurrency(quickStats.todayCollections),
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Receipt,
      label: 'Pending Expenses',
      value: quickStats.pendingExpenses.toString(),
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      icon: Wallet,
      label: 'Net Balance',
      value: formatCurrency(quickStats.netBalance),
      color: quickStats.netBalance >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400',
    },
  ]

  return (
    <div className="hidden lg:block border-t border-border/60 bg-background/95 backdrop-blur-sm animate-footer-enter">
      <div className="flex items-center justify-center gap-8 px-6 h-9">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <React.Fragment key={stat.label}>
              {index > 0 && (
                <div className="w-px h-4 bg-border/60" />
              )}
              <div className="flex items-center gap-1.5 text-xs">
                <Icon className={`h-3 w-3 ${stat.color}`} />
                <span className="text-muted-foreground">{stat.label}:</span>
                <span className={`font-medium ${stat.color}`}>{stat.value}</span>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// App Shell
// ============================================================
export function AppShell() {
  const { currentPage, setCurrentPage, setQuickStats } = useAppStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prevPage, setPrevPage] = useState<PageType>('dashboard')
  const [slideDirection, setSlideDirection] = useState<number>(0)

  // Sync state with URL on mount
  useEffect(() => {
    const page = searchParams.get('page') as PageType
    if (page && pageOrder.includes(page) && page !== currentPage) {
      setCurrentPage(page)
    }
  }, [])

  // Sync URL with state
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentPage === 'dashboard') {
      params.delete('page')
    } else {
      params.set('page', currentPage)
    }
    const query = params.toString()
    router.push(query ? `?${query}` : '/')
  }, [currentPage, router, searchParams])

  const PageComponent = pageComponents[currentPage] || DashboardPage

  // Update slide direction when page changes
  // We track previous page to determine direction of slide
  if (currentPage !== prevPage) {
    const prevIndex = pageOrder.indexOf(prevPage)
    const currIndex = pageOrder.indexOf(currentPage)
    setSlideDirection(currIndex >= prevIndex ? 1 : -1)
    setPrevPage(currentPage)
  }

  // Fetch quick stats for footer
  const fetchQuickStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) return
      const json = await res.json()
      if (json.success && json.data) {
        const kpis = json.data.kpis
        setQuickStats({
          totalStudents: kpis.totalStudents || 0,
          todayCollections: kpis.monthlyRevenue || 0,
          pendingExpenses: kpis.outstandingBalances || 0,
          netBalance: kpis.netIncome || 0,
        })
      }
    } catch {
      // Silently fail for footer stats
    }
  }, [setQuickStats])

  useEffect(() => {
    fetchQuickStats()
    const interval = setInterval(fetchQuickStats, 300000) // every 5 min
    return () => clearInterval(interval)
  }, [fetchQuickStats])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey

      // Cmd+N: Context-dependent new action
      if (isMeta && e.key === 'n') {
        e.preventDefault()
        const contextMap: Record<PageType, PageType> = {
          dashboard: 'payments',
          students: 'students',
          payments: 'payments',
          expenses: 'expenses',
          cashbook: 'cashbook',
          reports: 'reports',
          settings: 'settings',
        }
        setCurrentPage(contextMap[currentPage])
        // Dispatch custom event so the module can open its "new" dialog
        window.dispatchEvent(new CustomEvent('mibam-new'))
      }

      // Cmd+E: Export current view (go to reports)
      if (isMeta && e.key === 'e') {
        e.preventDefault()
        setCurrentPage('reports')
        window.dispatchEvent(new CustomEvent('mibam-export'))
      }

      // Cmd+R: Refresh data (prevent default browser refresh)
      if (isMeta && e.key === 'r') {
        // Don't prevent default - let browser handle refresh normally
        // Instead, dispatch a custom refresh event for in-app data
        window.dispatchEvent(new CustomEvent('mibam-refresh'))
      }

      // Number shortcuts with Cmd for quick navigation (only if not in an input)
      if (isMeta && !e.shiftKey && !e.altKey) {
        const target = document.activeElement
        const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        if (!isInput) {
          const numKey = parseInt(e.key)
          if (numKey >= 1 && numKey <= pageOrder.length) {
            e.preventDefault()
            setCurrentPage(pageOrder[numKey - 1])
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, setCurrentPage])

  // Page transition variants
  const pageVariants = {
    enter: (direction: number) => ({
      opacity: 0,
      x: direction * 30,
      scale: 0.98,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction * -20,
      scale: 0.99,
    }),
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={currentPage}
                custom={slideDirection}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <PageComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Quick Stats Footer */}
        <QuickStatsFooter />
      </div>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  )
}
