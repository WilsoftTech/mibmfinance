'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  BookOpen,
  CreditCard,
  Receipt,
  Clock,
  CircleDot,
  AlertCircle,
  RefreshCw,
  Banknote,
  Building2,
  Smartphone,
  CalendarDays,
  ArrowRight,
  Minus,
  CheckCircle2,
  XCircle,
  Download,
  FileSpreadsheet,
  FileText,
  File,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, parseISO } from 'date-fns'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { toast } from 'sonner'
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/export-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ============================================================
// Types
// ============================================================

interface IncomeTransaction {
  id: string
  receiptNumber: string
  studentName: string
  studentId: string
  course: string
  amount: number
  method: string
  reference: string | null
  receivedBy: string
  time: string
}

interface ExpenseTransaction {
  id: string
  title: string
  category: string
  amount: number
  method: string
  createdBy: string
  approvedBy: string | null
  time: string
}

interface CashbookSummary {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  openingBalance: number
  closingBalance: number
}

interface CashbookData {
  date: string
  income: {
    total: number
    byMethod: Record<string, number>
    transactions: IncomeTransaction[]
  }
  expenses: {
    total: number
    byCategory: Record<string, number>
    transactions: ExpenseTransaction[]
  }
  summary: CashbookSummary
}

interface TimelineEntry {
  id: string
  type: 'income' | 'expense'
  time: string
  description: string
  amount: number
  reference: string
  category: string
  method: string
}

interface DayFlow {
  date: string
  dayLabel: string
  income: number
  expenses: number
  net: number
}

interface WeekDayData {
  date: string
  dayLabel: string
  income: number
  expenses: number
  net: number
}

// ============================================================
// Chart Config
// ============================================================

const cashFlowChartConfig: ChartConfig = {
  net: {
    label: 'Net Cash Flow',
    color: 'oklch(0.62 0.16 160)',
  },
}

const weeklyBarChartConfig: ChartConfig = {
  income: {
    label: 'Income',
    color: 'oklch(0.62 0.16 160)',
  },
  expenses: {
    label: 'Expenses',
    color: 'oklch(0.577 0.245 27.325)',
  },
}

// ============================================================
// Animation Variants
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

// ============================================================
// Helpers
// ============================================================

function getMethodIcon(method: string) {
  switch (method) {
    case 'cash': return Banknote
    case 'bank': return Building2
    case 'mobile_money': return Smartphone
    default: return CreditCard
  }
}

function getMethodLabel(method: string): string {
  switch (method) {
    case 'cash': return 'Cash'
    case 'bank': return 'Bank'
    case 'mobile_money': return 'Mobile Money'
    default: return method
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    if (isNaN(d.getTime())) return '--:--'
    return format(d, 'HH:mm')
  } catch {
    return '--:--'
  }
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    salaries: '💰',
    utilities: '💡',
    maintenance: '🔧',
    stationery: '📝',
    fuel: '⛽',
    internet: '🌐',
    marketing: '📢',
    rent: '🏠',
    miscellaneous: '📦',
  }
  return icons[category] || '📦'
}

// ============================================================
// Loading Skeletons
// ============================================================

function SummaryCardSkeleton() {
  return (
    <Card className="premium-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <Skeleton className="h-7 w-36 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function BalanceFlowSkeleton() {
  return (
    <Card className="premium-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-28 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TimelineSkeleton() {
  return (
    <Card className="premium-card">
      <CardHeader>
        <Skeleton className="h-5 w-44 mb-1" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="premium-card">
      <CardHeader>
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

// ============================================================
// Date Selector Component
// ============================================================

interface DateSelectorProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  onExportPDF?: () => void
  onExportExcel?: () => void
  onExportCSV?: () => void
}

function DateSelector({ selectedDate, onDateChange, onExportPDF, onExportExcel, onExportCSV }: DateSelectorProps) {
  const goToPrevious = () => onDateChange(subDays(selectedDate, 1))
  const goToNext = () => onDateChange(addDays(selectedDate, 1))
  const goToToday = () => onDateChange(new Date())

  const today = isToday(selectedDate)
  const formattedDate = format(selectedDate, 'EEEE, MMMM dd, yyyy')

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Daily Cashbook</h2>
        <p className="text-muted-foreground text-sm">Track daily cash flow and transactions</p>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPDF} disabled={!onExportPDF}>
              <FileText className="mr-2 h-4 w-4 text-rose-600" />
              Export to PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportExcel} disabled={!onExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportCSV} disabled={!onExportCSV}>
              <File className="mr-2 h-4 w-4 text-amber-600" />
              Export to CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          disabled={today}
          className="gap-1.5 text-xs"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Today
        </Button>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg border p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 min-w-[200px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{formattedDate}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNext}
            disabled={today}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Summary Cards Component
// ============================================================

interface SummaryCardsProps {
  summary: CashbookSummary
}

function SummaryCards({ summary }: SummaryCardsProps) {
  const isPositive = summary.netBalance >= 0

  const cards = [
    {
      title: 'Total Income',
      amount: summary.totalIncome,
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      gradientBg: 'bg-emerald-500',
      trend: summary.totalIncome > 0 ? 'up' as const : 'neutral' as const,
      subtitle: `${summary.totalIncome > 0 ? 'Income received' : 'No income'}`,
    },
    {
      title: 'Total Expenses',
      amount: summary.totalExpenses,
      icon: ArrowDownRight,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/30',
      gradientBg: 'bg-rose-500',
      trend: 'down' as const,
      subtitle: `${summary.totalExpenses > 0 ? 'Expenses paid' : 'No expenses'}`,
    },
    {
      title: 'Net Cash Balance',
      amount: Math.abs(summary.netBalance),
      icon: isPositive ? Wallet : AlertCircle,
      iconColor: isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400',
      iconBg: isPositive ? 'bg-teal-50 dark:bg-teal-950/30' : 'bg-rose-50 dark:bg-rose-950/30',
      gradientBg: isPositive ? 'bg-teal-500' : 'bg-rose-500',
      trend: isPositive ? 'up' as const : 'down' as const,
      subtitle: isPositive ? 'Surplus' : 'Deficit',
      isNet: true,
      isNegative: !isPositive,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Card className="premium-card group relative overflow-hidden">
            {/* Glassmorphism gradient accent */}
            <div className={`absolute top-0 right-0 w-28 h-28 ${card.gradientBg} rounded-full blur-3xl opacity-15 -translate-y-10 translate-x-10 group-hover:opacity-25 transition-opacity duration-500`} />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                <div className={`p-2.5 rounded-xl ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                {card.isNegative && (
                  <span className="text-rose-600 dark:text-rose-400 font-bold text-xl">-</span>
                )}
                <span className={`text-2xl font-bold tracking-tight ${
                  card.isNegative
                    ? 'text-rose-600 dark:text-rose-400'
                    : card.title === 'Total Expenses'
                    ? 'text-foreground'
                    : ''
                }`}>
                  {formatCurrency(card.amount)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                {card.trend === 'up' && (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                {card.trend === 'down' && (
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                )}
                {card.trend === 'neutral' && (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">{card.subtitle}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================
// Balance Flow Component
// ============================================================

interface BalanceFlowProps {
  summary: CashbookSummary
}

function BalanceFlow({ summary }: BalanceFlowProps) {
  const steps = [
    {
      label: 'Opening Balance',
      value: summary.openingBalance,
      color: summary.openingBalance >= 0
        ? 'text-teal-700 dark:text-teal-400'
        : 'text-rose-700 dark:text-rose-400',
      bg: 'bg-teal-50 dark:bg-teal-950/20',
      border: 'border-teal-200 dark:border-teal-800',
      icon: BookOpen,
      iconColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      label: 'Income',
      value: summary.totalIncome,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      prefix: '+',
    },
    {
      label: 'Expenses',
      value: summary.totalExpenses,
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-200 dark:border-rose-800',
      icon: TrendingDown,
      iconColor: 'text-rose-600 dark:text-rose-400',
      prefix: '-',
    },
    {
      label: 'Closing Balance',
      value: summary.closingBalance,
      color: summary.closingBalance >= 0
        ? 'text-teal-700 dark:text-teal-400'
        : 'text-rose-700 dark:text-rose-400',
      bg: summary.closingBalance >= 0
        ? 'bg-teal-50 dark:bg-teal-950/20'
        : 'bg-rose-50 dark:bg-rose-950/20',
      border: summary.closingBalance >= 0
        ? 'border-teal-200 dark:border-teal-800'
        : 'border-rose-200 dark:border-rose-800',
      icon: Wallet,
      iconColor: summary.closingBalance >= 0
        ? 'text-teal-600 dark:text-teal-400'
        : 'text-rose-600 dark:text-rose-400',
      isResult: true,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <Card className="premium-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Balance Flow</CardTitle>
          <CardDescription>Opening → Income → Expenses → Closing</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {/* Desktop layout */}
          <div className="hidden md:flex items-center justify-between gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.label}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                  className={`flex-1 p-4 rounded-xl border ${step.border} ${step.bg} text-center`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <step.icon className={`h-4 w-4 ${step.iconColor}`} />
                    <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
                  </div>
                  <div className={`text-lg font-bold ${step.color}`}>
                    {step.prefix || ''}{formatCurrency(step.value)}
                  </div>
                  {step.isResult && (
                    <Badge
                      variant="outline"
                      className={`mt-2 text-[10px] ${
                        step.value >= 0
                          ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400'
                          : 'border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {step.value >= 0 ? '✓ Healthy' : '⚠ Deficit'}
                    </Badge>
                  )}
                </motion.div>
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="shrink-0"
                  >
                    <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                  </motion.div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile layout - vertical */}
          <div className="md:hidden space-y-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.label}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                  className={`flex items-center justify-between p-3 rounded-xl border ${step.border} ${step.bg}`}
                >
                  <div className="flex items-center gap-2">
                    <step.icon className={`h-4 w-4 ${step.iconColor}`} />
                    <span className="text-sm font-medium text-muted-foreground">{step.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${step.color}`}>
                    {step.prefix || ''}{formatCurrency(step.value)}
                  </span>
                </motion.div>
                {index < steps.length - 1 && index !== 1 && (
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 rotate-90" />
                  </div>
                )}
                {index === 1 && (
                  <Separator className="my-1" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Transaction Timeline Component
// ============================================================

interface TransactionTimelineProps {
  data: CashbookData
}

function TransactionTimeline({ data }: TransactionTimelineProps) {
  // Merge and sort all transactions by time
  const timeline: TimelineEntry[] = useMemo(() => {
    const incomeEntries: TimelineEntry[] = data.income.transactions.map((t) => ({
      id: `inc-${t.id}`,
      type: 'income' as const,
      time: t.time,
      description: t.studentName,
      amount: t.amount,
      reference: t.receiptNumber,
      category: t.course,
      method: t.method,
    }))

    const expenseEntries: TimelineEntry[] = data.expenses.transactions.map((t) => ({
      id: `exp-${t.id}`,
      type: 'expense' as const,
      time: t.time,
      description: t.title,
      amount: t.amount,
      reference: t.category,
      category: t.category,
      method: t.method,
    }))

    return [...incomeEntries, ...expenseEntries].sort((a, b) => {
      const timeA = new Date(a.time).getTime()
      const timeB = new Date(b.time).getTime()
      return timeA - timeB
    })
  }, [data])

  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

  const filteredTimeline = useMemo(() => {
    if (filter === 'all') return timeline
    return timeline.filter((t) => t.type === filter)
  }, [timeline, filter])

  const totalIncome = data.income.transactions.length
  const totalExpenses = data.expenses.transactions.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
    >
      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Transaction Timeline</CardTitle>
            <CardDescription>
              {timeline.length} transaction{timeline.length !== 1 ? 's' : ''} for this day
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter('all')}
            >
              All ({timeline.length})
            </Button>
            <Button
              variant={filter === 'income' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter('income')}
            >
              <ArrowUpRight className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
              {totalIncome}
            </Button>
            <Button
              variant={filter === 'expense' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setFilter('expense')}
            >
              <ArrowDownRight className="h-3 w-3 mr-1 text-rose-600 dark:text-rose-400" />
              {totalExpenses}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTimeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No transactions</p>
              <p className="text-xs mt-1">
                {filter === 'all'
                  ? 'No transactions recorded for this day'
                  : `No ${filter} transactions for this day`}
              </p>
            </div>
          ) : (
            <div className="relative max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border/50" />

              <div className="space-y-0">
                {filteredTimeline.map((entry, index) => {
                  const isIncome = entry.type === 'income'
                  const MethodIcon = getMethodIcon(entry.method)
                  const timeStr = formatTime(entry.time)

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.3 }}
                      className={`relative flex items-start gap-4 py-3 px-2 rounded-lg transition-colors ${
                        index % 2 === 0
                          ? 'bg-muted/20'
                          : ''
                      } hover:bg-muted/40`}
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 shrink-0 mt-0.5">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                            isIncome
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'
                              : 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium truncate">{entry.description}</span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                                isIncome
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                              }`}
                            >
                              {isIncome ? 'Income' : 'Expense'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{timeStr}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <MethodIcon className="h-3 w-3" />
                            <span>{getMethodLabel(entry.method)}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="truncate">
                              {isIncome ? entry.reference : getCategoryIcon(entry.category) + ' ' + entry.reference}
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm font-bold ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{formatCurrency(entry.amount)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Cash Flow Chart Component
// ============================================================

interface CashFlowChartProps {
  selectedDate: Date
}

function CashFlowChart({ selectedDate }: CashFlowChartProps) {
  const [chartData, setChartData] = useState<DayFlow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWeekData() {
      setLoading(true)
      try {
        // Fetch last 7 days
        const days: DayFlow[] = []
        for (let i = 6; i >= 0; i--) {
          const d = subDays(selectedDate, i)
          const dateStr = format(d, 'yyyy-MM-dd')
          try {
            const res = await fetch(`/api/cashbook?date=${dateStr}`)
            if (res.ok) {
              const json = await res.json()
              if (json.success && json.data) {
                days.push({
                  date: dateStr,
                  dayLabel: format(d, 'EEE'),
                  income: json.data.summary.totalIncome,
                  expenses: json.data.summary.totalExpenses,
                  net: json.data.summary.netBalance,
                })
              } else {
                days.push({
                  date: dateStr,
                  dayLabel: format(d, 'EEE'),
                  income: 0,
                  expenses: 0,
                  net: 0,
                })
              }
            } else {
              days.push({
                date: dateStr,
                dayLabel: format(d, 'EEE'),
                income: 0,
                expenses: 0,
                net: 0,
              })
            }
          } catch {
            days.push({
              date: dateStr,
              dayLabel: format(d, 'EEE'),
              income: 0,
              expenses: 0,
              net: 0,
            })
          }
        }
        setChartData(days)
      } catch (err) {
        console.error('Error fetching cash flow chart data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWeekData()
  }, [selectedDate])

  if (loading) {
    return <ChartSkeleton />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="text-base">7-Day Cash Flow</CardTitle>
          <CardDescription>Net cash flow for the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <DollarSign className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No data available</p>
            </div>
          ) : (
            <ChartContainer config={cashFlowChartConfig} className="h-[250px] w-full aspect-auto">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillNetPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.62 0.16 160)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.62 0.16 160)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                <XAxis
                  dataKey="dayLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs fill-muted-foreground"
                  tickFormatter={(value: number) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                    return value.toString()
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, props) => {
                        const v = value as number
                        const isPositive = v >= 0
                        return (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">{name}</span>
                            <span className={`font-mono font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isPositive ? '+' : ''}{formatCurrency(v)}
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="oklch(0.62 0.16 160)"
                  strokeWidth={2}
                  fill="url(#fillNetPositive)"
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: DayFlow }
                    const isPositive = payload.net >= 0
                    return (
                      <circle
                        key={`dot-${payload.date}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={isPositive ? 'oklch(0.62 0.16 160)' : 'oklch(0.577 0.245 27.325)'}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    )
                  }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Weekly Summary Component
// ============================================================

interface WeeklySummaryProps {
  selectedDate: Date
}

function WeeklySummary({ selectedDate }: WeeklySummaryProps) {
  const [weekData, setWeekData] = useState<WeekDayData[]>([])
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })

  useEffect(() => {
    async function fetchWeekData() {
      setLoading(true)
      try {
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
        const results: WeekDayData[] = []

        for (const d of days) {
          const dateStr = format(d, 'yyyy-MM-dd')
          try {
            const res = await fetch(`/api/cashbook?date=${dateStr}`)
            if (res.ok) {
              const json = await res.json()
              if (json.success && json.data) {
                results.push({
                  date: dateStr,
                  dayLabel: format(d, 'EEE'),
                  income: json.data.summary.totalIncome,
                  expenses: json.data.summary.totalExpenses,
                  net: json.data.summary.netBalance,
                })
                continue
              }
            }
          } catch {
            // fallback
          }
          results.push({
            date: dateStr,
            dayLabel: format(d, 'EEE'),
            income: 0,
            expenses: 0,
            net: 0,
          })
        }

        setWeekData(results)
      } catch (err) {
        console.error('Error fetching weekly data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWeekData()
  }, [format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')])

  const weeklyTotals = useMemo(() => {
    const totalIncome = weekData.reduce((sum, d) => sum + d.income, 0)
    const totalExpenses = weekData.reduce((sum, d) => sum + d.expenses, 0)
    const net = totalIncome - totalExpenses
    return { totalIncome, totalExpenses, net }
  }, [weekData])

  if (loading) {
    return <ChartSkeleton />
  }

  const barChartData = weekData.map((d) => ({
    day: d.dayLabel,
    income: d.income,
    expenses: d.expenses,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
    >
      <Card className="premium-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Weekly Summary</CardTitle>
              <CardDescription>
                {format(weekStart, 'MMM dd')} – {format(weekEnd, 'MMM dd, yyyy')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekly totals */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20">
              <p className="text-xs text-muted-foreground mb-1">Income</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(weeklyTotals.totalIncome)}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20">
              <p className="text-xs text-muted-foreground mb-1">Expenses</p>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                {formatCurrency(weeklyTotals.totalExpenses)}
              </p>
            </div>
            <div className={`text-center p-3 rounded-xl border ${
              weeklyTotals.net >= 0
                ? 'bg-teal-50/50 dark:bg-teal-950/10 border-teal-100 dark:border-teal-900/20'
                : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20'
            }`}>
              <p className="text-xs text-muted-foreground mb-1">Net</p>
              <p className={`text-sm font-bold ${
                weeklyTotals.net >= 0
                  ? 'text-teal-700 dark:text-teal-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}>
                {weeklyTotals.net >= 0 ? '+' : ''}{formatCurrency(weeklyTotals.net)}
              </p>
            </div>
          </div>

          {/* Mini bar chart */}
          <ChartContainer config={weeklyBarChartConfig} className="h-[180px] w-full aspect-auto">
            <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                className="text-[10px] fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                className="text-[10px] fill-muted-foreground"
                tickFormatter={(value: number) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                  return value.toString()
                }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name.charAt(0).toUpperCase() + name.slice(1),
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="income" fill="oklch(0.62 0.16 160)" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="expenses" fill="oklch(0.577 0.245 27.325)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ChartContainer>

          {/* Daily breakdown list */}
          <div className="mt-4 space-y-1">
            {weekData.map((d) => {
              const isTodayEntry = d.date === format(selectedDate, 'yyyy-MM-dd')
              return (
                <div
                  key={d.date}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-md text-xs ${
                    isTodayEntry ? 'bg-emerald-50/50 dark:bg-emerald-950/10 font-medium' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isTodayEntry ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    }`} />
                    <span className={`${isTodayEntry ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      {d.dayLabel} {format(parseISO(d.date), 'dd')}
                      {isTodayEntry && ' (Today)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(d.income)}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      -{formatCurrency(d.expenses)}
                    </span>
                    <span className={`font-medium min-w-[80px] text-right ${
                      d.net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {d.net >= 0 ? '+' : ''}{formatCurrency(d.net)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Income Breakdown Component
// ============================================================

interface IncomeBreakdownProps {
  data: CashbookData
}

function IncomeBreakdown({ data }: IncomeBreakdownProps) {
  const byMethod = data.income.byMethod
  const methods = Object.entries(byMethod)

  if (methods.length === 0 && data.income.total === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
    >
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Income by Method</CardTitle>
          <CardDescription>Payment method breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No income recorded</p>
          ) : (
            <div className="space-y-3">
              {methods.map(([method, amount]) => {
                const MethodIcon = getMethodIcon(method)
                const percentage = data.income.total > 0
                  ? ((amount / data.income.total) * 100).toFixed(1)
                  : '0'
                return (
                  <div key={method} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0">
                      <MethodIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{getMethodLabel(method)}</span>
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Expense Breakdown Component
// ============================================================

interface ExpenseBreakdownProps {
  data: CashbookData
}

function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
  const byCategory = data.expenses.byCategory
  const categories = Object.entries(byCategory)

  if (categories.length === 0 && data.expenses.total === 0) {
    return null
  }

  const categoryColors: Record<string, string> = {
    salaries: 'bg-emerald-500',
    utilities: 'bg-amber-500',
    maintenance: 'bg-sky-500',
    stationery: 'bg-violet-500',
    fuel: 'bg-rose-500',
    internet: 'bg-teal-500',
    marketing: 'bg-pink-500',
    rent: 'bg-orange-500',
    miscellaneous: 'bg-gray-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.4 }}
    >
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Expenses by Category</CardTitle>
          <CardDescription>Category breakdown for the day</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded</p>
          ) : (
            <div className="space-y-3">
              {categories.map(([category, amount]) => {
                const percentage = data.expenses.total > 0
                  ? ((amount / data.expenses.total) * 100).toFixed(1)
                  : '0'
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center shrink-0 text-base">
                      {getCategoryIcon(category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{category}</span>
                        <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${categoryColors[category] || 'bg-gray-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Main Cashbook Module
// ============================================================

export function CashbookModule() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [data, setData] = useState<CashbookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCashbook = useCallback(async (date: Date) => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await fetch(`/api/cashbook?date=${dateStr}`)
      if (!res.ok) throw new Error('Failed to fetch cashbook data')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to fetch cashbook data')
      setData(json.data as CashbookData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      toast.error('Failed to load cashbook data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCashbook(selectedDate)
  }, [selectedDate, fetchCashbook])

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  // Export handlers
  const buildTimelineExport = () => {
    if (!data) return []
    const allEntries: ((IncomeTransaction | ExpenseTransaction) & { type: string })[] = [
      ...data.income.transactions.map((t) => ({ ...t, type: 'Income' })),
      ...data.expenses.transactions.map((t) => ({ ...t, type: 'Expense' })),
    ]
    allEntries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    return allEntries
  }

  const handleExportPDF = () => {
    if (!data) { toast.error('No data to export'); return }
    const timeline = buildTimelineExport()
    const exportData = timeline.map((entry) => {
      const isIncome = entry.type === 'Income'
      return {
        time: formatTime(entry.time),
        description: isIncome ? (entry as IncomeTransaction).studentName : (entry as ExpenseTransaction).title,
        type: entry.type,
        amount: isIncome ? `+${formatCurrency(entry.amount)}` : `-${formatCurrency(entry.amount)}`,
        method: getMethodLabel(entry.method),
        reference: isIncome ? (entry as IncomeTransaction).receiptNumber : (entry as ExpenseTransaction).category,
      }
    })
    const dateStr = format(selectedDate, 'EEEE, MMMM dd, yyyy')
    exportToPDF(exportData, `MIBAM_Cashbook_${format(selectedDate, 'yyyy-MM-dd')}`, {
      title: 'MIBAM Daily Cashbook',
      subtitle: `Cashbook for ${dateStr}`,
      headers: [
        { key: 'time', label: 'Time' },
        { key: 'description', label: 'Description' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Amount (UGX)' },
        { key: 'method', label: 'Method' },
        { key: 'reference', label: 'Reference' },
      ],
      summaryRows: [
        { label: 'Opening Balance', value: formatCurrency(data.summary.openingBalance) },
        { label: 'Total Income', value: formatCurrency(data.summary.totalIncome) },
        { label: 'Total Expenses', value: formatCurrency(data.summary.totalExpenses) },
        { label: 'Net Balance', value: formatCurrency(data.summary.netBalance) },
        { label: 'Closing Balance', value: formatCurrency(data.summary.closingBalance) },
      ],
    })
    toast.success('PDF export opened')
  }

  const handleExportExcel = () => {
    if (!data) { toast.error('No data to export'); return }
    const timeline = buildTimelineExport()
    const exportData = timeline.map((entry) => {
      const isIncome = entry.type === 'Income'
      return {
        time: formatTime(entry.time),
        description: isIncome ? (entry as IncomeTransaction).studentName : (entry as ExpenseTransaction).title,
        type: entry.type,
        amount: entry.amount,
        method: getMethodLabel(entry.method),
        reference: isIncome ? (entry as IncomeTransaction).receiptNumber : (entry as ExpenseTransaction).category,
      }
    })
    const dateStr = format(selectedDate, 'EEEE, MMMM dd, yyyy')
    exportToExcel(exportData, `MIBAM_Cashbook_${format(selectedDate, 'yyyy-MM-dd')}`, {
      title: `MIBAM Daily Cashbook - ${dateStr}`,
      headers: [
        { key: 'time', label: 'Time' },
        { key: 'description', label: 'Description' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Amount (UGX)' },
        { key: 'method', label: 'Method' },
        { key: 'reference', label: 'Reference' },
      ],
      summaryRows: [
        { label: 'Opening Balance', value: formatCurrency(data.summary.openingBalance) },
        { label: 'Total Income', value: formatCurrency(data.summary.totalIncome) },
        { label: 'Total Expenses', value: formatCurrency(data.summary.totalExpenses) },
        { label: 'Net Balance', value: formatCurrency(data.summary.netBalance) },
        { label: 'Closing Balance', value: formatCurrency(data.summary.closingBalance) },
      ],
    })
    toast.success('Excel export downloaded')
  }

  const handleExportCSV = () => {
    if (!data) { toast.error('No data to export'); return }
    const timeline = buildTimelineExport()
    const exportData = timeline.map((entry) => {
      const isIncome = entry.type === 'Income'
      return {
        time: formatTime(entry.time),
        description: isIncome ? (entry as IncomeTransaction).studentName : (entry as ExpenseTransaction).title,
        type: entry.type,
        amount: entry.amount,
        method: entry.method,
        reference: isIncome ? (entry as IncomeTransaction).receiptNumber : (entry as ExpenseTransaction).category,
      }
    })
    exportToCSV(exportData, `MIBAM_Cashbook_${format(selectedDate, 'yyyy-MM-dd')}`, [
      { key: 'time', label: 'Time' },
      { key: 'description', label: 'Description' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount (UGX)' },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' },
    ])
    toast.success('CSV export downloaded')
  }

  // ============================================================
  // Error State
  // ============================================================
  if (error) {
    return (
      <div className="space-y-6">
        <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onExportCSV={handleExportCSV} />
        <Card className="premium-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">Failed to load cashbook</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchCashbook(selectedDate)} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================
  // Loading State
  // ============================================================
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onExportCSV={handleExportCSV} />
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
        <BalanceFlowSkeleton />
        <div className="grid gap-4 lg:grid-cols-7">
          <div className="col-span-full lg:col-span-4">
            <TimelineSkeleton />
          </div>
          <div className="col-span-full lg:col-span-3 space-y-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // Render
  // ============================================================
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Date Selector */}
      <motion.div variants={itemVariants}>
        <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onExportCSV={handleExportCSV} />
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants}>
        <SummaryCards summary={data.summary} />
      </motion.div>

      {/* Balance Flow */}
      <BalanceFlow summary={data.summary} />

      {/* Main content grid: Timeline + Side panels */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Transaction Timeline */}
        <div className="col-span-full lg:col-span-4">
          <TransactionTimeline data={data} />
        </div>

        {/* Side panels */}
        <div className="col-span-full lg:col-span-3 space-y-4">
          {/* Income Breakdown */}
          <IncomeBreakdown data={data} />

          {/* Expense Breakdown */}
          <ExpenseBreakdown data={data} />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cash Flow Chart */}
        <CashFlowChart selectedDate={selectedDate} />

        {/* Weekly Summary */}
        <WeeklySummary selectedDate={selectedDate} />
      </div>
    </motion.div>
  )
}
