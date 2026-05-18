'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReportsModule } from '@/components/modules/reports'
import { useAppStore } from '@/lib/store'
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { DashboardPage } from '@/components/modules/dashboard'
import { StudentsModule } from '@/components/modules/students'
import { PaymentsModule } from '@/components/modules/payments'
import { ExpensesModule } from '@/components/modules/expenses'
import { SettingsModule } from '@/components/modules/settings'
import { CashbookModule } from '@/components/modules/cashbook'

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
// App Shell
// ============================================================
export function AppShell() {
  const { currentPage } = useAppStore()

  const PageComponent = pageComponents[currentPage] || DashboardPage

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
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                <PageComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
