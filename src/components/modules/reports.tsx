'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Users,
  CreditCard,
  Receipt,
  ArrowLeftRight,
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  X,
  Banknote,
  Building2,
  Smartphone,
  Wallet,
  Lightbulb,
  Fuel,
  Wrench,
  PenTool,
  Wifi,
  Megaphone,
  Home,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, cn, getCategoryColor, getPaymentMethodColor, calculatePercentage } from '@/lib/utils'
import type { ExpenseCategory, PaymentMethod } from '@/lib/types'
import { toast } from 'sonner'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { ChartContainer, type ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ============================================================
// Constants & Types
// ============================================================

type ReportType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'student-balances' | 'fees-collection' | 'expense' | 'cash-flow'

interface ReportTypeConfig {
  id: ReportType
  title: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  apiType: string
  apiPeriod: string
}

const REPORT_TYPES: ReportTypeConfig[] = [
  {
    id: 'daily',
    title: 'Daily Report',
    description: "Today's financial summary with income and expenses",
    icon: Calendar,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    apiType: 'cash-flow',
    apiPeriod: 'daily',
  },
  {
    id: 'weekly',
    title: 'Weekly Report',
    description: 'This week\'s financial overview and trends',
    icon: CalendarDays,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-300 dark:border-teal-700',
    apiType: 'cash-flow',
    apiPeriod: 'weekly',
  },
  {
    id: 'monthly',
    title: 'Monthly Report',
    description: 'Monthly financial performance and analysis',
    icon: CalendarRange,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-300 dark:border-sky-700',
    apiType: 'cash-flow',
    apiPeriod: 'monthly',
  },
  {
    id: 'annual',
    title: 'Annual Report',
    description: 'Yearly financial summary and comparisons',
    icon: CalendarClock,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-300 dark:border-violet-700',
    apiType: 'cash-flow',
    apiPeriod: 'annual',
  },
  {
    id: 'student-balances',
    title: 'Student Balances',
    description: 'Outstanding fees and payment status per student',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    apiType: 'student-balances',
    apiPeriod: 'monthly',
  },
  {
    id: 'fees-collection',
    title: 'Fees Collection',
    description: 'Payment collection analysis and trends',
    icon: CreditCard,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-300 dark:border-rose-700',
    apiType: 'fees-collection',
    apiPeriod: 'monthly',
  },
  {
    id: 'expense',
    title: 'Expense Report',
    description: 'Expense breakdown by category and status',
    icon: Receipt,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    apiType: 'expense',
    apiPeriod: 'monthly',
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow',
    description: 'Income vs expense analysis with net position',
    icon: ArrowLeftRight,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-300 dark:border-pink-700',
    apiType: 'cash-flow',
    apiPeriod: 'monthly',
  },
]

const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string; icon: React.ElementType }[] = [
  { value: 'salaries', label: 'Salaries', icon: Wallet },
  { value: 'utilities', label: 'Utilities', icon: Lightbulb },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench },
  { value: 'stationery', label: 'Stationery', icon: PenTool },
  { value: 'fuel', label: 'Fuel', icon: Fuel },
  { value: 'internet', label: 'Internet', icon: Wifi },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'rent', label: 'Rent', icon: Home },
  { value: 'miscellaneous', label: 'Miscellaneous', icon: Package },
]

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank', label: 'Bank Transfer', icon: Building2 },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
]

const CHART_COLORS = [
  'hsl(160, 84%, 39%)',
  'hsl(173, 80%, 40%)',
  'hsl(45, 93%, 47%)',
  'hsl(199, 89%, 48%)',
  'hsl(262, 83%, 58%)',
  'hsl(346, 77%, 50%)',
  'hsl(25, 95%, 53%)',
  'hsl(330, 81%, 60%)',
  'hsl(210, 14%, 53%)',
]

const PIE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#f97316', '#ec4899', '#6b7280']

// ============================================================
// CSV Export Utility
// ============================================================

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) {
    toast.error('No data to export')
    return
  }

  const headers = Object.keys(data[0])
  const csvRows: string[] = []

  // Header row
  csvRows.push(headers.map(h => `"${h}"`).join(','))

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header]
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    })
    csvRows.push(values.join(','))
  }

  const csvString = csvRows.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('CSV exported successfully')
}

// ============================================================
// Print Utility
// ============================================================

function printReport() {
  window.print()
}

// ============================================================
// Report Type Cards
// ============================================================

function ReportTypeCards({
  selectedType,
  onSelect,
}: {
  selectedType: ReportType | null
  onSelect: (config: ReportTypeConfig) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {REPORT_TYPES.map((config, i) => {
        const isSelected = selectedType === config.id
        const Icon = config.icon
        return (
          <motion.div
            key={config.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
                config.bgColor,
                isSelected
                  ? 'border-emerald-500 dark:border-emerald-400 shadow-md ring-1 ring-emerald-500/30'
                  : config.borderColor
              )}
              onClick={() => onSelect(config)}
            >
              <CardContent className="p-4">
                <div className={cn('mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 dark:bg-black/20', config.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground text-center">{config.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-1 text-center leading-tight">{config.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================
// Report Filters
// ============================================================

function ReportFilters({
  selectedConfig,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  academicYearId,
  setAcademicYearId,
  semesterId,
  setSemesterId,
  courseId,
  setCourseId,
  paymentMethod,
  setPaymentMethod,
  expenseCategory,
  setExpenseCategory,
  onGenerate,
  loading,
}: {
  selectedConfig: ReportTypeConfig | null
  dateFrom: Date | undefined
  setDateFrom: (d: Date | undefined) => void
  dateTo: Date | undefined
  setDateTo: (d: Date | undefined) => void
  academicYearId: string
  setAcademicYearId: (v: string) => void
  semesterId: string
  setSemesterId: (v: string) => void
  courseId: string
  setCourseId: (v: string) => void
  paymentMethod: string
  setPaymentMethod: (v: string) => void
  expenseCategory: string
  setExpenseCategory: (v: string) => void
  onGenerate: () => void
  loading: boolean
}) {
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; semesters: { id: string; name: string }[] }[]>([])
  const [courses, setCourses] = useState<{ id: string; name: string; code: string }[]>([])

  useEffect(() => {
    fetch('/api/academic-years')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setAcademicYears(data.data)
        }
      })
      .catch(() => {})

    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setCourses(data.data)
        }
      })
      .catch(() => {})
  }, [])

  const selectedAcademicYear = academicYears.find(ay => ay.id === academicYearId)
  const semesters = selectedAcademicYear?.semesters || []

  // Determine which filters to show based on report type
  const isStudentReport = selectedConfig?.apiType === 'student-balances'
  const isFeesReport = selectedConfig?.apiType === 'fees-collection'
  const isExpenseReport = selectedConfig?.apiType === 'expense'
  const isCashFlow = selectedConfig?.apiType === 'cash-flow'

  const showAcademicYear = isStudentReport || isFeesReport
  const showSemester = isStudentReport || isFeesReport
  const showCourse = isStudentReport
  const showPaymentMethod = isFeesReport || isCashFlow
  const showExpenseCategory = isExpenseReport

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Report Filters</CardTitle>
              <CardDescription className="text-xs">Configure the report parameters</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('justify-start text-left font-normal w-full', !dateFrom && 'text-muted-foreground')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? formatDate(dateFrom) : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('justify-start text-left font-normal w-full', !dateTo && 'text-muted-foreground')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? formatDate(dateTo) : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Academic Year */}
            {showAcademicYear && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Academic Year</Label>
                <Select value={academicYearId} onValueChange={(v) => { setAcademicYearId(v); setSemesterId('') }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_years">All Academic Years</SelectItem>
                    {academicYears.map(ay => (
                      <SelectItem key={ay.id} value={ay.id}>
                        {ay.name} {ay.id === academicYears.find(a => a.name.includes('2025'))?.id ? '★' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Semester */}
            {showSemester && semesters.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Semester</Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_semesters">All Semesters</SelectItem>
                    {semesters.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Course */}
            {showCourse && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_courses">All Courses</SelectItem>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Payment Method */}
            {showPaymentMethod && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_methods">All Methods</SelectItem>
                    {PAYMENT_METHOD_OPTIONS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <span className="flex items-center gap-2">
                          <m.icon className="h-3.5 w-3.5" />
                          {m.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Expense Category */}
            {showExpenseCategory && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Expense Category</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_categories">All Categories</SelectItem>
                    {EXPENSE_CATEGORY_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <c.icon className="h-3.5 w-3.5" />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={onGenerate}
              disabled={!selectedConfig || loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Report Summary Stats
// ============================================================

function ReportSummaryStats({ stats }: { stats: { label: string; value: string; subtext?: string; icon: React.ElementType; color: string; trend?: 'up' | 'down' | 'neutral' }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card className="premium-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn('p-2 rounded-lg', stat.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {stat.trend === 'up' && (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  )}
                  {stat.trend === 'down' && (
                    <ArrowDownRight className="h-4 w-4 text-rose-500" />
                  )}
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                {stat.subtext && (
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{stat.subtext}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================
// Cash Flow Report View
// ============================================================

function CashFlowReportView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as { openingBalance: number; totalIncome: number; totalExpenses: number; netCashFlow: number; closingBalance: number; incomeTransactions: number; expenseTransactions: number }
  const income = data.income as { total: number; byMethod: Record<string, number> }
  const expenses = data.expenses as { total: number; byCategory: Record<string, number> }

  const stats = [
    { label: 'Opening Balance', value: formatCurrency(summary.openingBalance), icon: DollarSign, color: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400', trend: 'neutral' as const },
    { label: 'Total Income', value: formatCurrency(summary.totalIncome), subtext: `${summary.incomeTransactions} transactions`, icon: TrendingUp, color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400', trend: 'up' as const },
    { label: 'Total Expenses', value: formatCurrency(summary.totalExpenses), subtext: `${summary.expenseTransactions} transactions`, icon: TrendingDown, color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400', trend: 'down' as const },
    { label: 'Net Cash Flow', value: formatCurrency(summary.netCashFlow), subtext: `Closing: ${formatCurrency(summary.closingBalance)}`, icon: ArrowLeftRight, color: summary.netCashFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400', trend: summary.netCashFlow >= 0 ? 'up' as const : 'down' as const },
  ]

  // Chart data for income vs expense
  const barChartData = [
    { name: 'Income', amount: summary.totalIncome, fill: 'var(--color-income)' },
    { name: 'Expenses', amount: summary.totalExpenses, fill: 'var(--color-expenses)' },
    { name: 'Net', amount: Math.abs(summary.netCashFlow), fill: summary.netCashFlow >= 0 ? 'var(--color-income)' : 'var(--color-expenses)' },
  ]

  const barChartConfig: ChartConfig = {
    income: { label: 'Income', color: '#10b981' },
    expenses: { label: 'Expenses', color: '#f43f5e' },
  }

  // Income by method pie data
  const incomeByMethodData = Object.entries(income.byMethod || {}).map(([method, amount], i) => ({
    name: method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: amount as number,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  // Expenses by category pie data
  const expenseByCatData = Object.entries(expenses.byCategory || {}).map(([cat, amount], i) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: amount as number,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <ReportSummaryStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Bar Chart */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base">Income vs Expenses</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[250px] w-full">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value: number) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                    return `${value}`
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Income Breakdown */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                <PieChartIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-base">Income by Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {incomeByMethodData.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={incomeByMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {incomeByMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No income data for this period</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown by Category */}
      {expenseByCatData.length > 0 && (
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <Receipt className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {expenseByCatData.sort((a, b) => b.value - a.value).map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.value)}</p>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {calculatePercentage(item.value, expenses.total)}%
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// Student Balances Report View
// ============================================================

function StudentBalancesReportView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as { totalStudents: number; totalExpected: number; totalPaid: number; totalOutstanding: number; collectionRate: string }
  const students = (data.students as { studentId: string; name: string; course: string; courseCode: string; programType: string; expectedTotal: number; totalPaid: number; balance: number; status: string }[]) || []
  const byCourse = (data.byCourse as { course: string; code: string; students: number; expected: number; paid: number; outstanding: number }[]) || []

  const stats = [
    { label: 'Total Students', value: String(summary.totalStudents), icon: Users, color: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400', trend: 'neutral' as const },
    { label: 'Total Expected', value: formatCurrency(summary.totalExpected), icon: DollarSign, color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400', trend: 'neutral' as const },
    { label: 'Total Paid', value: formatCurrency(summary.totalPaid), subtext: `${summary.collectionRate}% collection rate`, icon: CreditCard, color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400', trend: 'up' as const },
    { label: 'Outstanding', value: formatCurrency(summary.totalOutstanding), icon: TrendingDown, color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400', trend: 'down' as const },
  ]

  // Chart data for by-course breakdown
  const courseChartData = byCourse.map(c => ({
    name: c.code || c.course.substring(0, 8),
    expected: c.expected,
    paid: c.paid,
    outstanding: c.outstanding,
  }))

  const courseChartConfig: ChartConfig = {
    expected: { label: 'Expected', color: '#f59e0b' },
    paid: { label: 'Paid', color: '#10b981' },
    outstanding: { label: 'Outstanding', color: '#f43f5e' },
  }

  return (
    <div className="space-y-6">
      <ReportSummaryStats stats={stats} />

      {/* By Course Chart */}
      {courseChartData.length > 0 && (
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base">Fees by Course</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={courseChartConfig} className="h-[280px] w-full">
              <BarChart data={courseChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: number) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                    return `${value}`
                  }}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />} />
                <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={[0, 0, 0, 0]} maxBarSize={40} />
                <Bar dataKey="outstanding" stackId="a" fill="var(--color-outstanding)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Legend />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Student Balances Table */}
      <Card className="premium-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Student Balances</CardTitle>
          <CardDescription>Detailed balance breakdown per student</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Course</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.slice(0, 50).map((student, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{student.studentId}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{student.courseCode}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(student.expectedTotal)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(student.totalPaid)}</TableCell>
                    <TableCell className={cn('text-right text-sm font-medium', student.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
                      {formatCurrency(student.balance)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center">
                      <Badge variant="outline" className={cn('text-[10px]', student.balance <= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800')}>
                        {student.balance <= 0 ? 'Paid' : 'Owing'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {students.length > 50 && (
            <div className="p-3 text-center text-xs text-muted-foreground border-t">
              Showing 50 of {students.length} students. Export CSV for full data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Fees Collection Report View
// ============================================================

function FeesCollectionView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as { totalCollected: number; totalTransactions: number; averagePayment: number }
  const byMethod = (data.byMethod as { method: string; count: number; total: number }[]) || []
  const byCourse = (data.byCourse as { course: string; code: string; count: number; total: number }[]) || []
  const payments = (data.payments as { receiptNumber: string; studentId: string; studentName: string; course: string; amount: number; method: string; reference: string | null; date: string }[]) || []

  const stats = [
    { label: 'Total Collected', value: formatCurrency(summary.totalCollected), icon: DollarSign, color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400', trend: 'up' as const },
    { label: 'Transactions', value: String(summary.totalTransactions), icon: CreditCard, color: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400', trend: 'neutral' as const },
    { label: 'Avg Payment', value: formatCurrency(summary.averagePayment), icon: TrendingUp, color: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400', trend: 'neutral' as const },
  ]

  // By Method chart
  const methodChartData = byMethod.map(m => ({
    name: m.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: m.total,
    count: m.count,
    color: m.method === 'cash' ? '#10b981' : m.method === 'bank' ? '#0ea5e9' : '#f59e0b',
  }))

  // By Course chart
  const courseChartData = byCourse.map(c => ({
    name: c.code || c.course.substring(0, 8),
    amount: c.total,
    count: c.count,
  }))

  const courseChartConfig: ChartConfig = {
    amount: { label: 'Amount', color: '#10b981' },
  }

  return (
    <div className="space-y-6">
      <ReportSummaryStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Method */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <PieChartIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base">Collection by Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {methodChartData.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={methodChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {methodChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No payment data</div>
            )}
            {/* Method details */}
            <div className="mt-4 space-y-2">
              {methodChartData.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-sm font-medium">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{formatCurrency(m.value)}</span>
                    <span className="text-xs text-muted-foreground ml-2">({m.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Course */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                <BarChart3 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-base">Collection by Course</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={courseChartConfig} className="h-[250px] w-full">
              <BarChart data={courseChartData} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: number) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                    return `${value}`
                  }}
                />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={60} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />} />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 6, 6, 0]} maxBarSize={25} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="premium-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment Details</CardTitle>
          <CardDescription>All payments within the selected period</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Course</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 50).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{p.studentName}</p>
                        <p className="text-xs text-muted-foreground">{p.studentId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.course}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={cn('text-[10px]', getPaymentMethodColor(p.method))}>
                        {p.method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(p.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {payments.length > 50 && (
            <div className="p-3 text-center text-xs text-muted-foreground border-t">
              Showing 50 of {payments.length} payments. Export CSV for full data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Expense Report View
// ============================================================

function ExpenseReportView({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary as { totalExpenses: number; totalPending: number; totalRejected: number; approvedCount: number; pendingCount: number; rejectedCount: number }
  const byCategory = (data.byCategory as { category: string; count: number; total: number }[]) || []
  const byMethod = (data.byMethod as { method: string; count: number; total: number }[]) || []
  const expenses = (data.expenses as { id: string; title: string; category: string; amount: number; method: string; status: string; createdBy: string; approvedBy: string | null; date: string }[]) || []

  const stats = [
    { label: 'Approved Expenses', value: formatCurrency(summary.totalExpenses), subtext: `${summary.approvedCount} items`, icon: CheckCircle2, color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400', trend: 'neutral' as const },
    { label: 'Pending Approval', value: formatCurrency(summary.totalPending), subtext: `${summary.pendingCount} items`, icon: Clock, color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400', trend: 'neutral' as const },
    { label: 'Rejected', value: formatCurrency(summary.totalRejected), subtext: `${summary.rejectedCount} items`, icon: XCircle, color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400', trend: 'down' as const },
    { label: 'Total Items', value: String(summary.approvedCount + summary.pendingCount + summary.rejectedCount), icon: Receipt, color: 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400', trend: 'neutral' as const },
  ]

  // By Category chart
  const catChartData = byCategory.map(c => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    amount: c.total,
    count: c.count,
    fill: PIE_COLORS[EXPENSE_CATEGORY_OPTIONS.findIndex(o => o.value === c.category) % PIE_COLORS.length],
  }))

  const catChartConfig: ChartConfig = Object.fromEntries(
    EXPENSE_CATEGORY_OPTIONS.map((c, i) => [c.value, { label: c.label, color: PIE_COLORS[i % PIE_COLORS.length] }])
  )

  return (
    <div className="space-y-6">
      <ReportSummaryStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category Chart */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <PieChartIcon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <CardTitle className="text-base">Expenses by Category</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {catChartData.length > 0 ? (
              <ChartContainer config={catChartConfig} className="h-[280px] w-full">
                <PieChart>
                  <Pie
                    data={catChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {catChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />} />
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No expense data</div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="premium-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base">Category Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar">
              {byCategory.sort((a, b) => b.total - a.total).map((c, i) => {
                const percentage = calculatePercentage(c.total, summary.totalExpenses)
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.category.charAt(0).toUpperCase() + c.category.slice(1)}</span>
                      <span className="text-sm font-semibold">{formatCurrency(c.total)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-2 rounded-full bg-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{c.count} items</span>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="premium-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expense Items</CardTitle>
          <CardDescription>All expenses within the selected period</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="hidden md:table-cell">Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 50).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{e.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', getCategoryColor(e.category))}>
                        {e.category.charAt(0).toUpperCase() + e.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={cn('text-[10px]', getPaymentMethodColor(e.method))}>
                        {e.method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{e.createdBy}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]',
                        e.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                        e.status === 'pending' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                        'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      )}>
                        {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(e.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {expenses.length > 50 && (
            <div className="p-3 text-center text-xs text-muted-foreground border-t">
              Showing 50 of {expenses.length} expenses. Export CSV for full data.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Loading Skeleton
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Report type cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-10 w-10 rounded-xl mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto mb-1" />
              <Skeleton className="h-3 w-32 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Skeleton className="h-9 w-40" />
          </div>
        </CardContent>
      </Card>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-4" />
              </div>
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// No Report Selected State
// ============================================================

function NoReportSelected() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="h-20 w-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
        <BarChart3 className="h-10 w-10 text-emerald-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Select a Report Type</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Choose a report type above and configure the filters to generate your financial report.
      </p>
    </motion.div>
  )
}

// ============================================================
// Export Toolbar
// ============================================================

function ExportToolbar({
  reportData,
  reportType,
  period,
}: {
  reportData: Record<string, unknown> | null
  reportType: ReportTypeConfig | null
  period: string
}) {
  if (!reportData) return null

  const handleCSVExport = () => {
    if (!reportData || !reportType) return

    let dataToExport: Record<string, unknown>[] = []
    const type = reportType.apiType

    if (type === 'cash-flow') {
      const income = reportData.income as { byMethod: Record<string, number> } | undefined
      const expenses = reportData.expenses as { byCategory: Record<string, number> } | undefined
      const summary = reportData.summary as { openingBalance: number; totalIncome: number; totalExpenses: number; netCashFlow: number; closingBalance: number }

      dataToExport = [
        { Category: 'Opening Balance', Amount: summary.openingBalance },
        ...Object.entries(income?.byMethod || {}).map(([method, amount]) => ({
          Category: `Income - ${method.replace('_', ' ')}`,
          Amount: amount,
        })),
        { Category: 'Total Income', Amount: summary.totalIncome },
        ...Object.entries(expenses?.byCategory || {}).map(([cat, amount]) => ({
          Category: `Expense - ${cat}`,
          Amount: amount,
        })),
        { Category: 'Total Expenses', Amount: summary.totalExpenses },
        { Category: 'Net Cash Flow', Amount: summary.netCashFlow },
        { Category: 'Closing Balance', Amount: summary.closingBalance },
      ]
    } else if (type === 'student-balances') {
      const students = reportData.students as { studentId: string; name: string; course: string; expectedTotal: number; totalPaid: number; balance: number }[]
      dataToExport = students.map(s => ({
        'Student ID': s.studentId,
        'Name': s.name,
        'Course': s.course,
        'Total Fees': s.expectedTotal,
        'Total Paid': s.totalPaid,
        'Balance': s.balance,
      }))
    } else if (type === 'fees-collection') {
      const payments = reportData.payments as { receiptNumber: string; studentId: string; studentName: string; course: string; amount: number; method: string; date: string }[]
      dataToExport = payments.map(p => ({
        'Receipt #': p.receiptNumber,
        'Student ID': p.studentId,
        'Student Name': p.studentName,
        'Course': p.course,
        'Amount': p.amount,
        'Method': p.method,
        'Date': p.date,
      }))
    } else if (type === 'expense') {
      const expenses = reportData.expenses as { title: string; category: string; amount: number; method: string; status: string; createdBy: string; approvedBy: string | null; date: string }[]
      dataToExport = expenses.map(e => ({
        'Title': e.title,
        'Category': e.category,
        'Amount': e.amount,
        'Method': e.method,
        'Status': e.status,
        'Created By': e.createdBy,
        'Approved By': e.approvedBy || '',
        'Date': e.date,
      }))
    }

    const filename = `MIBAM_${reportType.title.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
    exportToCSV(dataToExport, filename)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 print:hidden"
    >
      <Button variant="outline" size="sm" onClick={handleCSVExport}>
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={printReport}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
      <Button variant="outline" size="sm" onClick={printReport}>
        <FileText className="h-4 w-4 mr-2" />
        PDF
      </Button>
    </motion.div>
  )
}

// ============================================================
// Main Reports Module
// ============================================================

export function ReportsModule() {
  // Report type selection
  const [selectedConfig, setSelectedConfig] = useState<ReportTypeConfig | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [academicYearId, setAcademicYearId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')

  // Report data
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('')

  const handleSelectReportType = (config: ReportTypeConfig) => {
    setSelectedConfig(config)
    setReportData(null)
  }

  const handleGenerateReport = useCallback(async () => {
    if (!selectedConfig) return

    setLoading(true)
    setReportData(null)

    try {
      const params = new URLSearchParams()
      params.set('type', selectedConfig.apiType)
      params.set('period', selectedConfig.apiPeriod)

      // Use the dateFrom as the reference date for the API
      if (dateFrom) {
        params.set('date', dateFrom.toISOString())
      }

      const res = await fetch(`/api/reports?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate report')
      }

      setReportData(data.data)
      setReportPeriod(data.data.period || selectedConfig.apiPeriod)
      toast.success(`${selectedConfig.title} generated successfully`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [selectedConfig, dateFrom])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate, preview, and export financial reports for MIBAM.
          </p>
        </div>
        <ExportToolbar reportData={reportData} reportType={selectedConfig} period={reportPeriod} />
      </motion.div>

      {/* Report Type Selection */}
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Select Report Type</CardTitle>
              <CardDescription className="text-xs">Choose the type of report you want to generate</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReportTypeCards
            selectedType={selectedConfig?.id || null}
            onSelect={handleSelectReportType}
          />
        </CardContent>
      </Card>

      {/* Report Filters (shown when a type is selected) */}
      <AnimatePresence>
        {selectedConfig && (
          <ReportFilters
            selectedConfig={selectedConfig}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            academicYearId={academicYearId}
            setAcademicYearId={setAcademicYearId}
            semesterId={semesterId}
            setSemesterId={setSemesterId}
            courseId={courseId}
            setCourseId={setCourseId}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            expenseCategory={expenseCategory}
            setExpenseCategory={setExpenseCategory}
            onGenerate={handleGenerateReport}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Report Preview */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="premium-card">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold mb-1">Generating Report</h3>
                <p className="text-sm text-muted-foreground">Please wait while we compile your report data...</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!loading && reportData && selectedConfig && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-1"
          >
            {/* Report Header */}
            <div className="flex items-center justify-between mb-4 print:mb-2">
              <div>
                <h3 className="text-lg font-bold">{selectedConfig.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Period: {reportPeriod} • Generated: {formatDate(new Date())}
                </p>
              </div>
            </div>

            {/* MIBAM Header for print */}
            <div className="hidden print:block mb-6 text-center">
              <h1 className="text-2xl font-bold">MITOOMA INSTITUTE OF BUSINESS AND MANAGEMENT</h1>
              <p className="text-sm text-muted-foreground">P.O. Box 44, Mitooma, Uganda</p>
              <p className="text-lg font-semibold mt-2">{selectedConfig.title} — {reportPeriod}</p>
            </div>

            {/* Render appropriate report view */}
            {selectedConfig.apiType === 'cash-flow' && <CashFlowReportView data={reportData} />}
            {selectedConfig.apiType === 'student-balances' && <StudentBalancesReportView data={reportData} />}
            {selectedConfig.apiType === 'fees-collection' && <FeesCollectionView data={reportData} />}
            {selectedConfig.apiType === 'expense' && <ExpenseReportView data={reportData} />}
          </motion.div>
        )}

        {!loading && !reportData && selectedConfig && <NoReportSelected key="no-data" />}
        {!loading && !reportData && !selectedConfig && <NoReportSelected key="no-selection" />}
      </AnimatePresence>
    </div>
  )
}
