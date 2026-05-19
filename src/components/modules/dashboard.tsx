'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wallet,
  Receipt,
  Activity,
  UserPlus,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Banknote,
  Smartphone,
  Building2,
  ChevronRight,
  Clock,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatRelativeTime, getInitials } from '@/lib/utils'
import { AIInsightsWidget } from '@/components/modules/ai-insights'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

// ============================================================
// Types
// ============================================================

interface DashboardKPIs {
  totalStudents: number
  activeStudents: number
  totalFeesCollected: number
  outstandingBalances: number
  monthlyRevenue: number
  monthlyExpenses: number
  netIncome: number
  revenueGrowth: number
  expenseGrowth: number
  feesCollectedGrowth: number
}

interface MonthlyChartData {
  month: string
  income: number
  expenses: number
}

interface PaymentMethodData {
  method: string
  amount: number
  count: number
}

interface ExpenseCategoryData {
  category: string
  amount: number
  count: number
}

interface RecentTransaction {
  id: string
  type: 'income' | 'expense'
  description: string
  amount: number
  method: string
  date: string
  reference: string
}

interface OutstandingStudent {
  id: string
  firstName: string
  lastName: string
  studentId: string
  courseName: string
  paid: number
  balance: number
}

interface DashboardData {
  kpis: DashboardKPIs
  charts: {
    monthlyIncomeVsExpenses: MonthlyChartData[]
    paymentMethodDistribution: PaymentMethodData[]
    expenseCategories: ExpenseCategoryData[]
    studentsByStatus: { status: string; count: number }[]
    studentsByCourse: { course: string; code: string; count: number }[]
  }
  recentTransactions: RecentTransaction[]
  topOutstandingStudents: OutstandingStudent[]
}

// ============================================================
// Chart Configs
// ============================================================

const revenueExpenseChartConfig: ChartConfig = {
  income: {
    label: 'Income',
    color: 'oklch(0.62 0.16 160)',
  },
  expenses: {
    label: 'Expenses',
    color: 'oklch(0.577 0.245 27.325)',
  },
}

const paymentMethodChartConfig: ChartConfig = {
  cash: {
    label: 'Cash',
    color: 'oklch(0.62 0.16 160)',
  },
  bank: {
    label: 'Bank',
    color: 'oklch(0.58 0.12 175)',
  },
  mobile_money: {
    label: 'Mobile Money',
    color: 'oklch(0.72 0.16 60)',
  },
}

const expenseCategoryChartConfig: ChartConfig = {
  salaries: { label: 'Salaries', color: 'oklch(0.62 0.16 160)' },
  utilities: { label: 'Utilities', color: 'oklch(0.72 0.16 60)' },
  maintenance: { label: 'Maintenance', color: 'oklch(0.58 0.12 175)' },
  stationery: { label: 'Stationery', color: 'oklch(0.60 0.18 300)' },
  fuel: { label: 'Fuel', color: 'oklch(0.577 0.245 27.325)' },
  internet: { label: 'Internet', color: 'oklch(0.65 0.14 200)' },
  marketing: { label: 'Marketing', color: 'oklch(0.65 0.20 340)' },
  rent: { label: 'Rent', color: 'oklch(0.65 0.16 35)' },
  miscellaneous: { label: 'Miscellaneous', color: 'oklch(0.55 0.05 155)' },
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
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ============================================================
// Helpers
// ============================================================

function formatGrowth(value: number): string {
  if (value === 0) return '0%'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function getMethodIcon(method: string) {
  switch (method) {
    case 'cash':
      return Banknote
    case 'bank':
      return Building2
    case 'mobile_money':
      return Smartphone
    default:
      return CreditCard
  }
}

function getMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash'
    case 'bank':
      return 'Bank Transfer'
    case 'mobile_money':
      return 'Mobile Money'
    default:
      return method
  }
}

const PIE_COLORS = [
  'oklch(0.62 0.16 160)',  // emerald
  'oklch(0.58 0.12 175)',  // teal
  'oklch(0.72 0.16 60)',   // amber
]

// ============================================================
// Loading Skeletons
// ============================================================

function KPICardSkeleton() {
  return (
    <Card className="premium-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-28" />
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
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <Card className="premium-card">
      <CardHeader>
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// KPI Card Component
// ============================================================

interface KPICardProps {
  title: string
  value: string
  numericValue?: number
  format?: 'number' | 'currency'
  subtitle?: string
  growth?: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  index: number
}

function KPICard({ title, value, numericValue, format: fmt, subtitle, growth, icon: Icon, iconColor, iconBg, index }: KPICardProps) {
  const isPositive = growth !== undefined && growth >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="premium-card card-hover-scale group relative overflow-hidden">
        {/* Subtle gradient accent */}
        <div className={`absolute top-0 right-0 w-24 h-24 ${iconBg} rounded-full blur-3xl opacity-30 -translate-y-8 translate-x-8 group-hover:opacity-50 transition-opacity duration-500`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2.5 rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-2xl font-bold tracking-tight">
            {numericValue !== undefined ? (
              <AnimatedNumber
                value={numericValue}
                format={fmt || 'number'}
                duration={1500}
                delay={index * 80}
              />
            ) : (
              value
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {growth !== undefined && (
              <>
                {isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatGrowth(growth)}
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </>
            )}
            {subtitle && !growth && growth !== 0 && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================
// Custom Pie Label
// ============================================================

interface CustomPieLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
}

const RADIAN = Math.PI / 180

function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: CustomPieLabelProps) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null

  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs fill-muted-foreground"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ============================================================
// Main Dashboard Page
// ============================================================

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0)
  const { setCurrentPage, setQuickStats } = useAppStore()
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to fetch dashboard data')
      setData(json.data as DashboardData)
      setLastUpdated(new Date())
      // Update quick stats in store for footer
      if (json.data?.kpis) {
        setQuickStats({
          totalStudents: json.data.kpis.totalStudents || 0,
          todayCollections: json.data.kpis.monthlyRevenue || 0,
          pendingExpenses: Math.abs(json.data.kpis.outstandingBalances || 0),
          netBalance: json.data.kpis.netIncome || 0,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [setQuickStats])

  // Initial fetch
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => {
      fetchDashboard(false)
    }, 300000) // 5 minutes

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current)
    }
  }, [fetchDashboard])

  // Tick seconds since last update
  useEffect(() => {
    if (!lastUpdated) return
    tickRef.current = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)

    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [lastUpdated])

  // Listen for global refresh event (from keyboard shortcuts)
  useEffect(() => {
    const handleRefresh = () => fetchDashboard(false)
    window.addEventListener('mibam-refresh', handleRefresh)
    return () => window.removeEventListener('mibam-refresh', handleRefresh)
  }, [fetchDashboard])

  // Format last updated text
  const getLastUpdatedText = () => {
    if (!lastUpdated) return ''
    if (secondsSinceUpdate < 5) return 'Just now'
    if (secondsSinceUpdate < 60) return `${secondsSinceUpdate}s ago`
    const mins = Math.floor(secondsSinceUpdate / 60)
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  // ============================================================
  // Error State
  // ============================================================
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your financial activity at Mitooma Institute of Business and Management.
          </p>
        </div>
        <Card className="premium-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDashboard} variant="outline" className="gap-2">
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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your financial activity at Mitooma Institute of Business and Management.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-full lg:col-span-4">
            <ChartSkeleton />
          </div>
          <div className="col-span-full lg:col-span-3">
            <ChartSkeleton />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ListSkeleton />
          <ListSkeleton />
        </div>
      </div>
    )
  }

  // ============================================================
  // Derived data
  // ============================================================
  const kpis = data.kpis
  const chartData = data.charts
  const recentTransactions = data.recentTransactions
  const topOutstanding = data.topOutstandingStudents

  // Last 6 months for the area chart
  const last6Months = chartData.monthlyIncomeVsExpenses.slice(-6)

  // Payment method data for pie chart
  const paymentPieData = chartData.paymentMethodDistribution.map((p) => ({
    name: getMethodLabel(p.method),
    value: p.amount,
    count: p.count,
    methodKey: p.method,
  }))

  // Expense category data for bar chart
  const expenseBarData = [...chartData.expenseCategories]
    .sort((a, b) => b.amount - a.amount)
    .map((e) => ({
      name: e.category.charAt(0).toUpperCase() + e.category.slice(1),
      amount: e.amount,
      count: e.count,
      categoryKey: e.category,
    }))

  // ============================================================
  // KPI cards config
  // ============================================================
  const kpiCards: KPICardProps[] = [
    {
      title: 'Total Students',
      value: kpis.totalStudents.toLocaleString(),
      numericValue: kpis.totalStudents,
      format: 'number',
      subtitle: `${kpis.activeStudents} active`,
      growth: undefined,
      icon: Users,
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-50 dark:bg-teal-950/30',
      index: 0,
    },
    {
      title: 'Fees Collected',
      value: formatCurrency(kpis.monthlyRevenue),
      numericValue: kpis.monthlyRevenue,
      format: 'currency',
      growth: kpis.feesCollectedGrowth,
      icon: DollarSign,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      index: 1,
    },
    {
      title: 'Outstanding Balances',
      value: formatCurrency(kpis.outstandingBalances),
      numericValue: kpis.outstandingBalances,
      format: 'currency',
      subtitle: 'Total owed by students',
      growth: undefined,
      icon: Wallet,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/30',
      index: 2,
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(kpis.monthlyRevenue),
      numericValue: kpis.monthlyRevenue,
      format: 'currency',
      growth: kpis.revenueGrowth,
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      index: 3,
    },
    {
      title: 'Monthly Expenses',
      value: formatCurrency(kpis.monthlyExpenses),
      numericValue: kpis.monthlyExpenses,
      format: 'currency',
      growth: kpis.expenseGrowth,
      icon: TrendingDown,
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/30',
      index: 4,
    },
    {
      title: 'Net Income',
      value: formatCurrency(kpis.netIncome),
      numericValue: kpis.netIncome,
      format: 'currency',
      growth: kpis.revenueGrowth,
      icon: Activity,
      iconColor: kpis.netIncome >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400',
      iconBg: kpis.netIncome >= 0
        ? 'bg-emerald-50 dark:bg-emerald-950/30'
        : 'bg-rose-50 dark:bg-rose-950/30',
      index: 5,
    },
  ]

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
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Overview of your financial activity at Mitooma Institute of Business and Management.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {getLastUpdatedText()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboard(false)}
              className="gap-2 w-fit"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card) => (
          <KPICard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts Row 1: Revenue vs Expenses + Payment Methods */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue vs Expenses Area Chart */}
        <motion.div variants={itemVariants} className="col-span-full lg:col-span-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
              <CardDescription>Monthly income and expenses comparison (last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueExpenseChartConfig} className="h-[300px] w-full aspect-auto">
                <AreaChart data={last6Months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.62 0.16 160)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.62 0.16 160)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.577 0.245 27.325)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.577 0.245 27.325)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                  <XAxis
                    dataKey="month"
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
                        formatter={(value, name) => (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">{name}</span>
                            <span className="font-mono font-medium">
                              {formatCurrency(value as number)}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Legend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="oklch(0.62 0.16 160)"
                    strokeWidth={2}
                    fill="url(#fillIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="oklch(0.577 0.245 27.325)"
                    strokeWidth={2}
                    fill="url(#fillExpenses)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Methods Pie Chart */}
        <motion.div variants={itemVariants} className="col-span-full lg:col-span-3">
          <Card className="premium-card h-full">
            <CardHeader>
              <CardTitle className="text-base">Payment Methods</CardTitle>
              <CardDescription>Distribution of payment channels</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={paymentMethodChartConfig} className="h-[220px] w-full aspect-auto">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    strokeWidth={0}
                  >
                    {paymentPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ChartContainer>
              {/* Payment method breakdown */}
              <div className="mt-4 space-y-3">
                {paymentPieData.map((item, index) => {
                  const MethodIcon = getMethodIcon(item.methodKey)
                  const totalAmount = paymentPieData.reduce((sum, p) => sum + p.value, 0)
                  const percentage = totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(1) : '0'
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <MethodIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{percentage}%</span>
                        <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2: Expense Categories + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Expense Categories Bar Chart */}
        <motion.div variants={itemVariants} className="col-span-full lg:col-span-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-base">Expense Categories</CardTitle>
              <CardDescription>Breakdown of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={expenseCategoryChartConfig}
                className="h-[280px] w-full aspect-auto"
              >
                <BarChart
                  data={expenseBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value: number) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                      return value.toString()
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    className="text-xs fill-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={24}
                  >
                    {expenseBarData.map((entry) => (
                      <Cell
                        key={`bar-${entry.categoryKey}`}
                        fill={
                          expenseCategoryChartConfig[entry.categoryKey as keyof typeof expenseCategoryChartConfig]?.color
                          || 'oklch(0.55 0.05 155)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="col-span-full lg:col-span-3">
          <Card className="premium-card h-full">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 px-3 flex-col gap-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800 dark:hover:text-emerald-400 transition-all"
                  onClick={() => setCurrentPage('payments')}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs font-medium">Record Payment</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-3 flex-col gap-2 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 dark:hover:bg-teal-950/20 dark:hover:border-teal-800 dark:hover:text-teal-400 transition-all"
                  onClick={() => setCurrentPage('students')}
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="text-xs font-medium">Add Student</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-3 flex-col gap-2 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 dark:hover:bg-rose-950/20 dark:hover:border-rose-800 dark:hover:text-rose-400 transition-all"
                  onClick={() => setCurrentPage('expenses')}
                >
                  <Receipt className="h-5 w-5" />
                  <span className="text-xs font-medium">Add Expense</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-3 flex-col gap-2 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 dark:hover:bg-amber-950/20 dark:hover:border-amber-800 dark:hover:text-amber-400 transition-all"
                  onClick={() => setCurrentPage('reports')}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs font-medium">View Reports</span>
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Collection Rate</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {kpis.outstandingBalances + kpis.totalFeesCollected > 0
                      ? `${((kpis.totalFeesCollected / (kpis.outstandingBalances + kpis.totalFeesCollected)) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Outstanding</span>
                  </div>
                  <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                    {formatCurrency(kpis.outstandingBalances)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Recent Transactions + Outstanding Students */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Transactions */}
        <motion.div variants={itemVariants} className="col-span-full lg:col-span-4">
          <Card className="premium-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <CardDescription>Latest payments and expenses</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setCurrentPage('payments')}
              >
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No recent transactions</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {recentTransactions.map((tx) => {
                    const isIncome = tx.type === 'income'
                    const MethodIcon = getMethodIcon(tx.method)
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setCurrentPage(isIncome ? 'payments' : 'expenses')}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : 'bg-rose-100 dark:bg-rose-900/30'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{tx.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <MethodIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {getMethodLabel(tx.method)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                &middot; {formatRelativeTime(tx.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p
                            className={`text-sm font-semibold ${
                              isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tx.reference}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Outstanding Balances */}
        <motion.div variants={itemVariants} className="col-span-full lg:col-span-3">
          <Card className="premium-card h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Outstanding Balances</CardTitle>
                <CardDescription>Students with highest balances due</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setCurrentPage('students')}
              >
                View all <ChevronRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {topOutstanding.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No outstanding balances</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {topOutstanding.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setCurrentPage('students')}
                    >
                      <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                        {getInitials(`${student.firstName} ${student.lastName}`)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {student.courseName}
                          </span>
                        </div>
                        {/* Progress bar showing paid vs owed */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{
                                width: `${
                                  (student.paid + student.balance) > 0
                                    ? (student.paid / (student.paid + student.balance)) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {(student.paid + student.balance) > 0
                              ? `${((student.paid / (student.paid + student.balance)) * 100).toFixed(0)}%`
                              : '0%'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                          {formatCurrency(student.balance)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Paid: {formatCurrency(student.paid)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Financial Insights */}
      <motion.div variants={itemVariants}>
        <AIInsightsWidget />
      </motion.div>
    </motion.div>
  )
}
