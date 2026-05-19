'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
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
  BookOpen,
  Scale,
  CreditCard,
  ArrowLeftRight,
  AlertCircle,
  Clock,
  RefreshCw,
  Calendar,
  Users,
  Receipt,
  Wallet,
  Banknote,
  Building2,
  Smartphone,
  Lightbulb,
  Fuel,
  Wrench,
  PenTool,
  Wifi,
  Megaphone,
  Home,
  Package,
  CheckCircle2,
  X,
} from 'lucide-react'
import { formatCurrency, formatDate, cn, getCategoryColor, getPaymentMethodColor, calculatePercentage } from '@/lib/utils'
import type { ExpenseCategory } from '@/lib/types'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { ChartContainer, type ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis,
  Area, AreaChart, Pie, PieChart, Cell, Legend,
  Line, LineChart, ResponsiveContainer,
} from 'recharts'

// ============================================================
// Types
// ============================================================

type ReportView =
  | 'index'
  | 'day-book'
  | 'balance-sheet'
  | 'fee-collection'
  | 'income-expenditure'
  | 'cash-flow'
  | 'outstanding-payments'

// ============================================================
// Constants
// ============================================================

const PIE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#f97316', '#ec4899', '#6b7280']

const REPORT_CARDS: {
  id: ReportView
  title: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}[] = [
  {
    id: 'day-book',
    title: 'Daily Transaction Day Book',
    description: 'All transactions with running balance by date range',
    icon: BookOpen,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet',
    description: 'Assets, liabilities and equity as at a specific date',
    icon: Scale,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    borderColor: 'border-sky-200 dark:border-sky-800',
  },
  {
    id: 'fee-collection',
    title: 'Fee Collection Report',
    description: 'Student fee payments by method, course and status',
    icon: CreditCard,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
  },
  {
    id: 'income-expenditure',
    title: 'Income & Expenditure',
    description: 'Income vs expenses summary with net surplus/deficit',
    icon: BarChart3,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow Statement',
    description: 'Opening balance → movements → closing balance',
    icon: ArrowLeftRight,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    id: 'outstanding-payments',
    title: 'Outstanding Payments',
    description: 'Unpaid and overdue student fee balances',
    icon: AlertCircle,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
  },
]

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: React.ElementType }[] = [
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

// ============================================================
// Export Utilities
// ============================================================

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) { toast.error('No data to export'); return }
  const headers = Object.keys(data[0])
  const rows = [
    headers.map(h => `"${h}"`).join(','),
    ...data.map(row =>
      headers.map(h => {
        const v = row[h]
        if (v === null || v === undefined) return '""'
        return `"${String(v).replace(/"/g, '""')}"`
      }).join(',')
    ),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
  toast.success('CSV exported successfully')
}

function exportToExcel(data: Record<string, unknown>[], filename: string) {
  if (!data.length) { toast.error('No data to export'); return }
  const headers = Object.keys(data[0])
  const headerRow = headers.map(h => `<th>${h}</th>`).join('')
  const bodyRows = data.map(row =>
    `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
  ).join('')
  const html = `<table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${filename}.xls`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
  toast.success('Excel file exported successfully')
}

// ============================================================
// PDF Export Helper – builds complete A4 HTML from full data
// ============================================================

const INST = {
  name: 'MITOOMA INSTITUTE OF BUSINESS AND MANAGEMENT',
  address: 'P.O. Box 44, Mitooma, Uganda',
  phone: '+256 XXX XXX XXX',
}

interface PDFCol {
  label: string
  key: string
  align?: 'left' | 'right' | 'center'
  width?: string
  fmt?: (v: unknown) => string
}

function buildReportPDF(opts: {
  title: string
  period?: string
  summaryRows?: { label: string; value: string }[]
  sections: { heading?: string; cols: PDFCol[]; rows: Record<string, unknown>[] }[]
}) {
  const win = window.open('', '_blank')
  if (!win) { toast.error('Allow popups to export PDF'); return }

  const generated = new Date().toLocaleString('en-UG', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const summaryHTML = (opts.summaryRows?.length ?? 0) > 0
    ? `<div class="sum-grid">${opts.summaryRows!.map(r =>
        `<div class="sum-card"><div class="s-lbl">${r.label}</div><div class="s-val">${r.value}</div></div>`
      ).join('')}</div>`
    : ''

  const sectionsHTML = opts.sections.map(sec => {
    const colgroup = sec.cols.map(c => `<col style="width:${c.width ?? 'auto'}">`).join('')
    const thead = sec.cols.map(c =>
      `<th style="text-align:${c.align ?? 'left'}">${c.label}</th>`
    ).join('')
    const tbody = sec.rows.map((row, ri) => {
      const cells = sec.cols.map(c => {
        const raw = row[c.key]
        const val = c.fmt ? c.fmt(raw) : (raw === null || raw === undefined ? '' : String(raw))
        return `<td style="text-align:${c.align ?? 'left'}">${val}</td>`
      }).join('')
      const cls = (row.__rowClass as string | undefined) ?? (ri % 2 === 1 ? 'stripe' : '')
      return `<tr class="${cls}">${cells}</tr>`
    }).join('')
    return `
      ${sec.heading ? `<div class="sec-head">${sec.heading}</div>` : ''}
      <table><colgroup>${colgroup}</colgroup>
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${opts.title} — MIBAM</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4;margin:15mm;}
  body{font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#111;font-size:11px;line-height:1.45;background:#fff;}
  .page{max-width:780px;margin:0 auto;padding:16px;}
  .rpt-hdr{border-bottom:2px solid #047857;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;}
  .inst-name{font-size:14px;font-weight:700;color:#047857;letter-spacing:.2px;}
  .inst-sub{font-size:9.5px;color:#666;margin-top:2px;}
  .rpt-meta{text-align:right;}
  .rpt-title{font-size:13px;font-weight:700;color:#111;}
  .rpt-period{font-size:9.5px;color:#555;margin-top:2px;}
  .rpt-gen{font-size:8.5px;color:#999;margin-top:1px;}
  .sum-grid{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;}
  .sum-card{flex:1 1 130px;border:1px solid #d1fae5;background:#f0fdf4;border-radius:3px;padding:7px 9px;}
  .s-lbl{font-size:8.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;}
  .s-val{font-size:12px;font-weight:700;color:#111;margin-top:1px;}
  .sec-head{font-size:10px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:.4px;margin:12px 0 5px;padding-bottom:3px;border-bottom:1px solid #d1fae5;}
  table{width:100%;border-collapse:collapse;table-layout:auto;margin-bottom:10px;page-break-inside:auto;}
  thead{display:table-header-group;}
  tfoot{display:table-footer-group;}
  thead th{background:#047857;color:#fff;padding:5px 6px;font-size:9.5px;font-weight:600;white-space:nowrap;}
  tbody td{padding:4.5px 6px;border-bottom:1px solid #e5e7eb;font-size:10px;vertical-align:middle;}
  tbody tr.stripe td{background:#f9fafb;}
  tbody tr{page-break-inside:avoid;page-break-after:auto;}
  tr.row-total td{background:#047857;color:#fff;font-weight:700;padding:5px 6px;}
  tr.row-subtotal td{background:#f0fdf4;font-weight:600;padding:5px 6px;border-top:1.5px solid #047857;}
  tr.row-opening td,tr.row-closing td{background:#eff6ff;font-weight:600;font-style:italic;}
  tr.row-overdue td{background:#fff1f2;}
  tr.row-separator td{border:none;padding:3px 0;}
  .rpt-ftr{border-top:1px solid #e5e7eb;margin-top:16px;padding-top:8px;text-align:center;font-size:8.5px;color:#aaa;}
  .print-ctrl{text-align:center;padding:18px;background:#f4f4f4;}
  .print-btn{padding:9px 22px;background:#047857;color:#fff;border:none;border-radius:5px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
  @media print{body{background:#fff;}.print-ctrl{display:none;}.page{padding:0;max-width:100%;}}
</style>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script>
</head>
<body>
<div class="page">
  <div class="rpt-hdr">
    <div>
      <div class="inst-name">${INST.name}</div>
      <div class="inst-sub">${INST.address} &bull; Tel: ${INST.phone}</div>
    </div>
    <div class="rpt-meta">
      <div class="rpt-title">${opts.title}</div>
      ${opts.period ? `<div class="rpt-period">Period: ${opts.period}</div>` : ''}
      <div class="rpt-gen">Generated: ${generated}</div>
    </div>
  </div>
  ${summaryHTML}
  ${sectionsHTML}
  <div class="rpt-ftr">MIBAM Finance Management System &mdash; Computer generated report.</div>
</div>
<div class="print-ctrl">
  <button class="print-btn" onclick="window.print()">&#128438;&nbsp; Print / Save as PDF</button>
</div>
</body></html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
}

// ============================================================
// Shared Sub-Components
// ============================================================

function StatCard({
  label, value, subtext, icon: Icon, colorClass, trend, trendValue,
}: {
  label: string; value: string; subtext?: string; icon: React.ElementType
  colorClass: string; trend?: 'up' | 'down' | 'neutral'; trendValue?: string
}) {
  return (
    <Card className="premium-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn('p-2 rounded-lg', colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1 text-xs">
            {trend === 'up' && <><ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">{trendValue}</span></>}
            {trend === 'down' && <><ArrowDownRight className="h-3.5 w-3.5 text-rose-500" /><span className="text-rose-600 dark:text-rose-400">{trendValue}</span></>}
          </div>
        </div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {subtext && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtext}</p>}
      </CardContent>
    </Card>
  )
}

function LastUpdatedBadge({ ts }: { ts: Date | null }) {
  const [label, setLabel] = useState('–')
  useEffect(() => {
    if (!ts) return
    const update = () => {
      const secs = Math.floor((Date.now() - ts.getTime()) / 1000)
      if (secs < 5) setLabel('just now')
      else if (secs < 60) setLabel(`${secs}s ago`)
      else setLabel(`${Math.floor(secs / 60)}m ago`)
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [ts])
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      Last updated: {label}
    </span>
  )
}

function DatePickerField({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('justify-start text-left font-normal w-full text-sm', !value && 'text-muted-foreground')}>
            <Calendar className="mr-2 h-3.5 w-3.5" />
            {value ? formatDate(value) : 'Select date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent mode="single" selected={value} onSelect={onChange} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function ExportBar({
  onCSV, onExcel, onPrint, loading,
}: {
  onCSV: () => void; onExcel: () => void; onPrint: () => void; loading?: boolean
}) {
  return (
    <div className="flex items-center gap-2 print:hidden flex-wrap">
      <Button variant="outline" size="sm" onClick={onCSV} disabled={loading}>
        <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />CSV
      </Button>
      <Button variant="outline" size="sm" onClick={onExcel} disabled={loading}>
        <FileText className="h-3.5 w-3.5 mr-1.5" />Excel
      </Button>
      <Button variant="outline" size="sm" onClick={onPrint} disabled={loading}>
        <Printer className="h-3.5 w-3.5 mr-1.5" />PDF / Print
      </Button>
    </div>
  )
}

function ReportPageHeader({
  title, description, icon: Icon, colorClass, bgColor,
  onBack, children,
}: {
  title: string; description: string; icon: React.ElementType
  colorClass: string; bgColor: string; onBack: () => void; children?: React.ReactNode
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back
        </Button>
        <div className={cn('p-2.5 rounded-xl', bgColor)}>
          <Icon className={cn('h-5 w-5', colorClass)} />
        </div>
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  )
}

/* Print-only header that shows in PDF */
function PrintHeader({ title }: { title: string }) {
  return (
    <div className="hidden print:block mb-6 text-center border-b pb-4">
      <h1 className="text-2xl font-bold">MITOOMA INSTITUTE OF BUSINESS AND MANAGEMENT</h1>
      <p className="text-sm">P.O. Box 44, Mitooma, Uganda | Tel: +256 XXX XXX XXX</p>
      <h2 className="text-lg font-semibold mt-2">{title}</h2>
      <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString()}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
      <p className="text-muted-foreground text-sm">Loading report data…</p>
    </div>
  )
}

function EmptyState({ message = 'No data available for the selected filters.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

// ============================================================
// REPORTS INDEX – Main Dashboard
// ============================================================

interface SummaryData {
  currentMonthIncome: number
  lastMonthIncome: number
  incomeTrend: number
  currentMonthExpenses: number
  lastMonthExpenses: number
  expenseTrend: number
  netBalance: number
  outstandingAmount: number
  outstandingCount: number
  feeCollectionPie: { collected: number; outstanding: number }
  last6Months: { month: string; income: number; expense: number }[]
  last12Months: { month: string; balance: number }[]
  generatedAt: string
}

function ReportsIndexView({ onNavigate }: { onNavigate: (v: ReportView) => void }) {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/summary')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setLastUpdated(new Date())
      }
    } catch {
      toast.error('Failed to load summary data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
    const id = setInterval(fetchSummary, 30_000)
    return () => clearInterval(id)
  }, [fetchSummary])

  const incomeChartConfig: ChartConfig = {
    income: { label: 'Income', color: '#10b981' },
    expense: { label: 'Expense', color: '#f43f5e' },
  }

  const balanceChartConfig: ChartConfig = {
    balance: { label: 'Balance', color: '#0ea5e9' },
  }

  const pieData = data
    ? [
        { name: 'Collected', value: data.feeCollectionPie.collected, color: '#10b981' },
        { name: 'Outstanding', value: data.feeCollectionPie.outstanding, color: '#f43f5e' },
      ]
    : []

  const filteredCards = REPORT_CARDS.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = typeFilter === 'all' || c.id === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-sm text-muted-foreground">Financial reports and analytics for MIBAM</p>
        </div>
        <div className="flex items-center gap-3">
          <LastUpdatedBadge ts={lastUpdated} />
          <Button variant="outline" size="sm" onClick={fetchSummary} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Summary Stat Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-8 w-8 rounded-lg mb-2" /><Skeleton className="h-6 w-24 mb-1" /><Skeleton className="h-3 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Income (this month)"
            value={formatCurrency(data.currentMonthIncome)}
            subtext={`vs ${formatCurrency(data.lastMonthIncome)} last month`}
            icon={TrendingUp}
            colorClass="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
            trend={data.incomeTrend >= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.incomeTrend)}%`}
          />
          <StatCard
            label="Expenses (this month)"
            value={formatCurrency(data.currentMonthExpenses)}
            subtext={`vs ${formatCurrency(data.lastMonthExpenses)} last month`}
            icon={TrendingDown}
            colorClass="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
            trend={data.expenseTrend <= 0 ? 'up' : 'down'}
            trendValue={`${Math.abs(data.expenseTrend)}%`}
          />
          <StatCard
            label="Net Balance"
            value={formatCurrency(data.netBalance)}
            subtext="All-time accumulated"
            icon={DollarSign}
            colorClass={data.netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'}
          />
          <StatCard
            label="Outstanding Fees"
            value={formatCurrency(data.outstandingAmount)}
            subtext={`${data.outstandingCount} student${data.outstandingCount !== 1 ? 's' : ''} owing`}
            icon={AlertCircle}
            colorClass="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
            trend="down"
          />
        </div>
      ) : null}

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Income vs Expense Bar */}
          <Card className="premium-card lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30"><BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
                <CardTitle className="text-sm">Income vs Expenses — Last 6 Months</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={incomeChartConfig} className="h-[220px] w-full">
                <BarChart data={data.last6Months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={v => formatCurrency(v as number)} />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Fee Collection Pie */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30"><PieChartIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" /></div>
                <CardTitle className="text-sm">Fee Collection</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {(pieData[0]?.value ?? 0) + (pieData[1]?.value ?? 0) > 0 ? (
                <ChartContainer config={{}} className="h-[220px] w-full">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={v => formatCurrency(v as number)} />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No fee data</div>
              )}
            </CardContent>
          </Card>

          {/* Cash Flow Line */}
          <Card className="premium-card lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30"><ArrowLeftRight className="h-4 w-4 text-sky-600 dark:text-sky-400" /></div>
                <CardTitle className="text-sm">Cash Balance Trend — Last 12 Months</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={balanceChartConfig} className="h-[180px] w-full">
                <AreaChart data={data.last12Months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={v => formatCurrency(v as number)} />} />
                  <Area type="monotone" dataKey="balance" stroke="var(--color-balance)" fill="url(#balanceGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Type List */}
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base">Available Reports</CardTitle>
              <CardDescription className="text-xs">Select a report to view detailed data</CardDescription>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search reports…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-3 h-9 text-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-52 h-9 text-sm">
                <SelectValue placeholder="All report types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Report Types</SelectItem>
                {REPORT_CARDS.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {(searchTerm || typeFilter !== 'all') && (
              <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setTypeFilter('all') }} className="h-9">
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredCards.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No reports match your filters.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card, i) => {
                const Icon = card.icon
                return (
                  <motion.div key={card.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card
                      className={cn('cursor-pointer border-2 transition-all duration-200 hover:shadow-md group', card.bgColor, card.borderColor, 'hover:border-emerald-400 dark:hover:border-emerald-600')}
                      onClick={() => onNavigate(card.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className={cn('p-2.5 rounded-xl bg-white/60 dark:bg-black/20 shrink-0', card.color)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight mb-1">{card.title}</h3>
                            <p className="text-xs text-muted-foreground leading-snug">{card.description}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="w-full mt-4 group-hover:bg-emerald-50 group-hover:border-emerald-300 dark:group-hover:bg-emerald-950/30 dark:group-hover:border-emerald-700 transition-colors">
                          View Report
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// DAY BOOK REPORT
// ============================================================

interface DayBookEntry {
  date: string; referenceNo: string; description: string; account: string
  debit: number; credit: number; runningBalance: number; type: string
}
interface DayBookData {
  period: string; openingBalance: number; closingBalance: number
  totalCredits: number; totalDebits: number; entries: DayBookEntry[]; generatedAt: string
}

function DayBookView({ onBack }: { onBack: () => void }) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => { const d = new Date(); d.setDate(1); return d })
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [txType, setTxType] = useState('all')
  const [data, setData] = useState<DayBookData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (dateFrom) p.set('dateFrom', dateFrom.toISOString())
      if (dateTo) p.set('dateTo', dateTo.toISOString())
      p.set('type', txType)
      const res = await fetch(`/api/reports/day-book?${p}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error || 'Failed to load day book')
    } catch { toast.error('Failed to load day book') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, txType])

  useEffect(() => { fetch_() }, [fetch_])

  const card = REPORT_CARDS.find(c => c.id === 'day-book')!

  const csvData = (): Record<string, unknown>[] =>
    (data?.entries ?? []).map(e => ({
      Date: formatDate(e.date), 'Reference No': e.referenceNo,
      Description: e.description, Account: e.account,
      Debit: e.debit, Credit: e.credit, 'Running Balance': e.runningBalance,
    }))

  const handlePDF = () => {
    if (!data) return
    const fmt = (n: number) => formatCurrency(n)
    const rows: Record<string, unknown>[] = [
      { __rowClass: 'row-opening', date: '', ref: '', desc: 'Opening Balance', acct: '', debit: '', credit: '', bal: fmt(data.openingBalance) },
      ...data.entries.map(e => ({
        date: formatDate(e.date), ref: e.referenceNo, desc: e.description, acct: e.account,
        debit: e.debit > 0 ? fmt(e.debit) : '—',
        credit: e.credit > 0 ? fmt(e.credit) : '—',
        bal: fmt(e.runningBalance),
      })),
      { __rowClass: 'row-closing', date: '', ref: '', desc: 'Closing Balance', acct: '',
        debit: fmt(data.totalDebits), credit: fmt(data.totalCredits), bal: fmt(data.closingBalance) },
    ]
    buildReportPDF({
      title: 'Daily Transaction Day Book',
      period: data.period,
      summaryRows: [
        { label: 'Opening Balance', value: fmt(data.openingBalance) },
        { label: 'Total Credits (Income)', value: fmt(data.totalCredits) },
        { label: 'Total Debits (Expenses)', value: fmt(data.totalDebits) },
        { label: 'Closing Balance', value: fmt(data.closingBalance) },
      ],
      sections: [{
        cols: [
          { label: 'Date', key: 'date', width: '80px' },
          { label: 'Reference No', key: 'ref', width: '100px' },
          { label: 'Description', key: 'desc' },
          { label: 'Account', key: 'acct', width: '80px' },
          { label: 'Debit', key: 'debit', align: 'right', width: '90px' },
          { label: 'Credit', key: 'credit', align: 'right', width: '90px' },
          { label: 'Balance', key: 'bal', align: 'right', width: '90px' },
        ],
        rows,
      }],
    })
  }

  return (
    <div className="space-y-6">
      <PrintHeader title="Daily Transaction Day Book" />
      <ReportPageHeader title={card.title} description={card.description} icon={card.icon} colorClass={card.color} bgColor={card.bgColor} onBack={onBack}>
        <ExportBar onCSV={() => exportToCSV(csvData(), 'MIBAM_DayBook')} onExcel={() => exportToExcel(csvData(), 'MIBAM_DayBook')} onPrint={handlePDF} loading={loading} />
      </ReportPageHeader>

      {/* Filters */}
      <Card className="premium-card print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <DatePickerField label="From Date" value={dateFrom} onChange={setDateFrom} />
            <DatePickerField label="To Date" value={dateTo} onChange={setDateTo} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Transaction Type</Label>
              <Select value={txType} onValueChange={setTxType}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetch_} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Opening Balance" value={formatCurrency(data.openingBalance)} icon={DollarSign} colorClass="bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400" />
            <StatCard label="Total Credits (Income)" value={formatCurrency(data.totalCredits)} icon={TrendingUp} colorClass="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" trend="up" />
            <StatCard label="Total Debits (Expenses)" value={formatCurrency(data.totalDebits)} icon={TrendingDown} colorClass="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" trend="down" />
            <StatCard label="Closing Balance" value={formatCurrency(data.closingBalance)} icon={Wallet} colorClass={data.closingBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'} />
          </div>

          {/* Period badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Period: <strong>{data.period}</strong></span>
            <span>•</span>
            <span>{data.entries.length} transactions</span>
          </div>

          {/* Transactions Table */}
          <Card className="premium-card">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead className="w-[130px]">Reference No</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Opening balance row */}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={6} className="text-xs text-muted-foreground italic">Opening Balance</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(data.openingBalance)}</TableCell>
                  </TableRow>
                  {data.entries.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No transactions in this period</TableCell></TableRow>
                  ) : data.entries.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(e.date)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.referenceNo}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{e.description}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{e.account}</TableCell>
                      <TableCell className="text-right text-sm text-rose-600 dark:text-rose-400">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</TableCell>
                      <TableCell className={cn('text-right text-sm font-semibold', e.runningBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>{formatCurrency(e.runningBalance)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Closing balance row */}
                  <TableRow className="bg-muted/30 font-bold border-t-2">
                    <TableCell colSpan={4} className="text-sm">Closing Balance</TableCell>
                    <TableCell className="text-right text-sm text-rose-600">{formatCurrency(data.totalDebits)}</TableCell>
                    <TableCell className="text-right text-sm text-emerald-600">{formatCurrency(data.totalCredits)}</TableCell>
                    <TableCell className="text-right text-sm font-bold">{formatCurrency(data.closingBalance)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================
// BALANCE SHEET REPORT
// ============================================================

interface BalanceSheetData {
  asAtLabel: string
  assets: { cashAndEquivalents: number; feesReceivable: number; receivableBreakdown: { course: string; code: string; students: number; amount: number }[]; total: number }
  liabilities: { pendingExpenses: number; total: number }
  equity: { accumulatedSurplus: number; total: number }
  totalLiabilitiesAndEquity: number
  generatedAt: string
}

function BalanceSheetView({ onBack }: { onBack: () => void }) {
  const [asAt, setAsAt] = useState<Date | undefined>(new Date())
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (asAt) p.set('asAt', asAt.toISOString())
      const res = await fetch(`/api/reports/balance-sheet?${p}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error || 'Failed to load balance sheet')
    } catch { toast.error('Failed to load balance sheet') }
    finally { setLoading(false) }
  }, [asAt])

  useEffect(() => { fetch_() }, [fetch_])

  const card = REPORT_CARDS.find(c => c.id === 'balance-sheet')!

  const csvData = (): Record<string, unknown>[] => !data ? [] : [
    { Section: 'ASSETS', Item: 'Cash and Cash Equivalents', Amount: data.assets.cashAndEquivalents },
    ...data.assets.receivableBreakdown.map(r => ({ Section: 'ASSETS', Item: `Fees Receivable – ${r.course} (${r.students} students)`, Amount: r.amount })),
    { Section: 'ASSETS', Item: 'Total Assets', Amount: data.assets.total },
    { Section: 'LIABILITIES', Item: 'Pending Expenses', Amount: data.liabilities.pendingExpenses },
    { Section: 'LIABILITIES', Item: 'Total Liabilities', Amount: data.liabilities.total },
    { Section: 'EQUITY', Item: 'Accumulated Surplus', Amount: data.equity.accumulatedSurplus },
    { Section: 'EQUITY', Item: 'Total Equity', Amount: data.equity.total },
    { Section: '', Item: 'Total Liabilities & Equity', Amount: data.totalLiabilitiesAndEquity },
  ]

  const handlePDF = () => {
    if (!data) return
    const fmt = (n: number) => formatCurrency(n)
    const rows: Record<string, unknown>[] = [
      { section: 'ASSETS', item: 'Cash and Cash Equivalents', amount: fmt(data.assets.cashAndEquivalents) },
      ...data.assets.receivableBreakdown.map(r => ({
        section: '', item: `  Fees Receivable – ${r.course} (${r.students} students)`, amount: fmt(r.amount),
      })),
      { __rowClass: 'row-total', section: '', item: 'TOTAL ASSETS', amount: fmt(data.assets.total) },
      { __rowClass: 'row-separator', section: '', item: '', amount: '' },
      { section: 'LIABILITIES', item: 'Pending / Accrued Expenses', amount: fmt(data.liabilities.pendingExpenses) },
      { __rowClass: 'row-total', section: '', item: 'TOTAL LIABILITIES', amount: fmt(data.liabilities.total) },
      { __rowClass: 'row-separator', section: '', item: '', amount: '' },
      { section: 'EQUITY', item: 'Accumulated Surplus / (Deficit)', amount: fmt(data.equity.accumulatedSurplus) },
      { __rowClass: 'row-total', section: '', item: 'TOTAL EQUITY', amount: fmt(data.equity.total) },
      { __rowClass: 'row-separator', section: '', item: '', amount: '' },
      { __rowClass: 'row-total', section: '', item: 'TOTAL LIABILITIES & EQUITY', amount: fmt(data.totalLiabilitiesAndEquity) },
    ]
    buildReportPDF({
      title: 'Balance Sheet',
      period: `As at ${data.asAtLabel}`,
      sections: [{
        cols: [
          { label: 'Section', key: 'section', width: '120px' },
          { label: 'Account / Item', key: 'item' },
          { label: 'Amount (UGX)', key: 'amount', align: 'right', width: '150px' },
        ],
        rows,
      }],
    })
  }

  const BSRow = ({ label, value, bold, indent, subtext }: { label: string; value: number; bold?: boolean; indent?: boolean; subtext?: string }) => (
    <div className={cn('flex items-center justify-between py-2 px-3 rounded', indent ? 'ml-4 text-sm text-muted-foreground' : bold ? 'font-semibold bg-muted/30' : 'text-sm')}>
      <div>
        <span>{label}</span>
        {subtext && <span className="ml-2 text-xs text-muted-foreground">{subtext}</span>}
      </div>
      <span className={cn(bold && 'font-bold')}>{formatCurrency(value)}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <PrintHeader title="Balance Sheet" />
      <ReportPageHeader title={card.title} description={card.description} icon={card.icon} colorClass={card.color} bgColor={card.bgColor} onBack={onBack}>
        <ExportBar onCSV={() => exportToCSV(csvData(), 'MIBAM_BalanceSheet')} onExcel={() => exportToExcel(csvData(), 'MIBAM_BalanceSheet')} onPrint={handlePDF} loading={loading} />
      </ReportPageHeader>

      {/* Filters */}
      <Card className="premium-card print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-56">
              <DatePickerField label="As-at Date" value={asAt} onChange={setAsAt} />
            </div>
            <Button onClick={fetch_} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ASSETS */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30"><TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
                <div><CardTitle className="text-base">Assets</CardTitle><CardDescription className="text-xs">As at {data.asAtLabel}</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <BSRow label="Cash and Cash Equivalents" value={data.assets.cashAndEquivalents} />
              <div className="border-t pt-1">
                <p className="text-xs font-medium text-muted-foreground px-3 py-1">Fees Receivable</p>
                {data.assets.receivableBreakdown.map((r, i) => (
                  <BSRow key={i} label={r.course} value={r.amount} indent subtext={`${r.students} students`} />
                ))}
                {data.assets.receivableBreakdown.length === 0 && <p className="text-xs text-muted-foreground px-7 pb-2">No outstanding fees</p>}
              </div>
              <Separator />
              <BSRow label="TOTAL ASSETS" value={data.assets.total} bold />
            </CardContent>
          </Card>

          {/* LIABILITIES + EQUITY */}
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30"><Scale className="h-4 w-4 text-rose-600 dark:text-rose-400" /></div>
                <div><CardTitle className="text-base">Liabilities &amp; Equity</CardTitle><CardDescription className="text-xs">As at {data.asAtLabel}</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-3 py-1 border-b">Liabilities</p>
              <BSRow label="Pending/Accrued Expenses" value={data.liabilities.pendingExpenses} />
              <BSRow label="Total Liabilities" value={data.liabilities.total} bold />
              <Separator />
              <p className="text-xs font-medium text-muted-foreground px-3 py-1">Equity</p>
              <BSRow label="Accumulated Surplus / (Deficit)" value={data.equity.accumulatedSurplus} />
              <BSRow label="Total Equity" value={data.equity.total} bold />
              <Separator />
              <BSRow label="TOTAL LIABILITIES & EQUITY" value={data.totalLiabilitiesAndEquity} bold />
            </CardContent>
          </Card>

          {/* Pie summary */}
          <Card className="premium-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Asset Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'Cash & Equivalents', value: data.assets.cashAndEquivalents, color: '#10b981' },
                  { label: 'Fees Receivable', value: data.assets.feesReceivable, color: '#f59e0b' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-card flex-1 min-w-[140px]">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-muted-foreground">{data.assets.total > 0 ? calculatePercentage(item.value, data.assets.total) : 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================
// FEE COLLECTION REPORT
// ============================================================

interface FeeCollectionData {
  period: string
  summary: { totalCollected: number; totalTransactions: number; averagePayment: number }
  byMethod: { method: string; count: number; total: number }[]
  byCourse: { course: string; code: string; count: number; total: number }[]
  payments: { receiptNumber: string; studentId: string; studentName: string; course: string; amount: number; method: string; reference: string | null; date: string }[]
  generatedAt: string
}

const FEE_PAGE_SIZE = 50

function FeeCollectionView({ onBack }: { onBack: () => void }) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => { const d = new Date(); d.setDate(1); return d })
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [paymentMethod, setPaymentMethod] = useState('all')
  const [data, setData] = useState<FeeCollectionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setPage(0)
    try {
      const p = new URLSearchParams({ type: 'fees-collection', period: 'monthly' })
      if (dateFrom) p.set('dateFrom', dateFrom.toISOString())
      if (dateTo) p.set('dateTo', dateTo.toISOString())
      if (paymentMethod !== 'all') p.set('paymentMethod', paymentMethod)
      const res = await fetch(`/api/reports?${p}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error || 'Failed to load fee collection report')
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, paymentMethod])

  useEffect(() => { fetch_() }, [fetch_])

  const card = REPORT_CARDS.find(c => c.id === 'fee-collection')!

  const csvData = (): Record<string, unknown>[] =>
    (data?.payments ?? []).map(p => ({
      'Receipt #': p.receiptNumber, 'Student ID': p.studentId, 'Student Name': p.studentName,
      Course: p.course, Amount: p.amount, Method: p.method.replace('_', ' '),
      Reference: p.reference ?? '', Date: formatDate(p.date),
    }))

  const handlePDF = () => {
    if (!data) return
    const fmt = (n: number) => formatCurrency(n)
    buildReportPDF({
      title: 'Fee Collection Report',
      period: data.period,
      summaryRows: [
        { label: 'Total Collected', value: fmt(data.summary.totalCollected) },
        { label: 'Transactions', value: String(data.summary.totalTransactions) },
        { label: 'Average Payment', value: fmt(data.summary.averagePayment) },
      ],
      sections: [
        {
          heading: 'Collection by Method',
          cols: [
            { label: 'Method', key: 'method' },
            { label: 'Count', key: 'count', align: 'center', width: '60px' },
            { label: 'Amount (UGX)', key: 'amount', align: 'right', width: '150px' },
          ],
          rows: data.byMethod.map(m => ({
            method: m.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            count: m.count, amount: fmt(m.total),
          })),
        },
        {
          heading: 'Collection by Course',
          cols: [
            { label: 'Course', key: 'course' },
            { label: 'Code', key: 'code', width: '80px' },
            { label: 'Count', key: 'count', align: 'center', width: '60px' },
            { label: 'Amount (UGX)', key: 'amount', align: 'right', width: '150px' },
          ],
          rows: data.byCourse.map(c => ({ course: c.course, code: c.code, count: c.count, amount: fmt(c.total) })),
        },
        {
          heading: `All Payments (${data.payments.length})`,
          cols: [
            { label: 'Receipt #', key: 'receipt', width: '90px' },
            { label: 'Student Name', key: 'name', width: '150px' },
            { label: 'Course', key: 'course', width: '100px' },
            { label: 'Amount (UGX)', key: 'amount', align: 'right', width: '90px' },
            { label: 'Method', key: 'method', width: '70px' },
            { label: 'Date', key: 'date', width: '80px' },
          ],
          rows: data.payments.map(p => ({
            receipt: p.receiptNumber, name: p.studentName, course: p.course,
            amount: fmt(p.amount), method: p.method.replace('_', ' '), date: formatDate(p.date),
          })),
        },
      ],
    })
  }

  const methodColors: Record<string, string> = { cash: '#10b981', bank: '#0ea5e9', mobile_money: '#f59e0b' }
  const pieMethodData = (data?.byMethod ?? []).map((m, i) => ({
    name: m.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: m.total, color: methodColors[m.method] ?? PIE_COLORS[i],
  }))
  const courseChartConfig: ChartConfig = { amount: { label: 'Amount', color: '#8b5cf6' } }
  const courseData = (data?.byCourse ?? []).map(c => ({ name: c.code || c.course.slice(0, 8), amount: c.total, count: c.count }))

  return (
    <div className="space-y-6">
      <PrintHeader title="Fee Collection Report" />
      <ReportPageHeader title={card.title} description={card.description} icon={card.icon} colorClass={card.color} bgColor={card.bgColor} onBack={onBack}>
        <ExportBar onCSV={() => exportToCSV(csvData(), 'MIBAM_FeeCollection')} onExcel={() => exportToExcel(csvData(), 'MIBAM_FeeCollection')} onPrint={handlePDF} loading={loading} />
      </ReportPageHeader>

      {/* Filters */}
      <Card className="premium-card print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <DatePickerField label="From Date" value={dateFrom} onChange={setDateFrom} />
            <DatePickerField label="To Date" value={dateTo} onChange={setDateTo} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetch_} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Total Collected" value={formatCurrency(data.summary.totalCollected)} icon={DollarSign} colorClass="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" trend="up" />
            <StatCard label="Transactions" value={String(data.summary.totalTransactions)} icon={Receipt} colorClass="bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400" />
            <StatCard label="Average Payment" value={formatCurrency(data.summary.averagePayment)} icon={TrendingUp} colorClass="bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By Method Pie */}
            <Card className="premium-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Collection by Method</CardTitle></CardHeader>
              <CardContent>
                {pieMethodData.length > 0 ? (
                  <>
                    <ChartContainer config={{}} className="h-[220px] w-full">
                      <PieChart>
                        <Pie data={pieMethodData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieMethodData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent formatter={v => formatCurrency(v as number)} />} />
                        <Legend />
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-2 mt-3">
                      {pieMethodData.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg border bg-card text-sm">
                          <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} /><span>{m.name}</span></div>
                          <span className="font-semibold">{formatCurrency(m.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <EmptyState message="No payment data" />}
              </CardContent>
            </Card>

            {/* By Course Bar */}
            <Card className="premium-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Collection by Course</CardTitle></CardHeader>
              <CardContent>
                {courseData.length > 0 ? (
                  <ChartContainer config={courseChartConfig} className="h-[280px] w-full">
                    <BarChart data={courseData} layout="vertical" margin={{ top: 5, right: 10, left: 55, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={55} />
                      <ChartTooltip content={<ChartTooltipContent formatter={v => formatCurrency(v as number)} />} />
                      <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 6, 6, 0]} maxBarSize={22} />
                    </BarChart>
                  </ChartContainer>
                ) : <EmptyState message="No course data" />}
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card className="premium-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Details ({data.payments.length})</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead><TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Course</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Method</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.slice(page * FEE_PAGE_SIZE, (page + 1) * FEE_PAGE_SIZE).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                      <TableCell><p className="font-medium text-sm">{p.studentName}</p><p className="text-xs text-muted-foreground">{p.studentId}</p></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.course}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline" className={cn('text-[10px]', getPaymentMethodColor(p.method))}>{p.method.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(p.date)}</TableCell>
                    </TableRow>
                  ))}
                  {data.payments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No payments in this period</TableCell></TableRow>}
                </TableBody>
              </Table>
              {data.payments.length > FEE_PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
                  <span>Showing {page * FEE_PAGE_SIZE + 1}–{Math.min((page + 1) * FEE_PAGE_SIZE, data.payments.length)} of {data.payments.length} payments</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
                    <span className="px-2">Page {page + 1} / {Math.ceil(data.payments.length / FEE_PAGE_SIZE)}</span>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * FEE_PAGE_SIZE >= data.payments.length}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================
// INCOME & EXPENDITURE REPORT
// ============================================================

interface IEData {
  period: string
  income: { total: number; byMethod: { source: string; amount: number; count: number }[]; byCourse: { source: string; amount: number; count: number }[] }
  expenditure: { total: number; byCategory: { category: string; amount: number; count: number; items: { title: string; amount: number; date: string }[] }[] }
  netSurplus: number
  isDeficit: boolean
  generatedAt: string
}

function IncomeExpenditureView({ onBack }: { onBack: () => void }) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => { const d = new Date(); d.setDate(1); return d })
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [category, setCategory] = useState('all')
  const [data, setData] = useState<IEData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (dateFrom) p.set('dateFrom', dateFrom.toISOString())
      if (dateTo) p.set('dateTo', dateTo.toISOString())
      if (category !== 'all') p.set('category', category)
      const res = await fetch(`/api/reports/income-expenditure?${p}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error || 'Failed to load report')
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, category])

  useEffect(() => { fetch_() }, [fetch_])

  const card = REPORT_CARDS.find(c => c.id === 'income-expenditure')!

  const csvData = (): Record<string, unknown>[] => !data ? [] : [
    { Section: 'INCOME', Category: '', Amount: '' },
    ...(data.income.byMethod ?? []).map(m => ({ Section: 'Income', Category: m.source, Amount: m.amount, Count: m.count })),
    { Section: '', Category: 'Total Income', Amount: data.income.total },
    { Section: 'EXPENDITURE', Category: '', Amount: '' },
    ...(data.expenditure.byCategory ?? []).map(c => ({ Section: 'Expense', Category: c.category.charAt(0).toUpperCase() + c.category.slice(1), Amount: c.amount, Count: c.count })),
    { Section: '', Category: 'Total Expenditure', Amount: data.expenditure.total },
    { Section: '', Category: data.isDeficit ? 'Net Deficit' : 'Net Surplus', Amount: data.netSurplus },
  ]

  const handlePDF = () => {
    if (!data) return
    const fmt = (n: number) => formatCurrency(n)
    buildReportPDF({
      title: 'Income & Expenditure Statement',
      period: data.period,
      summaryRows: [
        { label: 'Total Income', value: fmt(data.income.total) },
        { label: 'Total Expenditure', value: fmt(data.expenditure.total) },
        { label: data.isDeficit ? 'Net Deficit' : 'Net Surplus', value: fmt(Math.abs(data.netSurplus)) },
      ],
      sections: [
        {
          heading: 'Income',
          cols: [
            { label: 'Source', key: 'source' },
            { label: 'Transactions', key: 'count', align: 'center', width: '100px' },
            { label: 'Amount (UGX)', key: 'amount', align: 'right', width: '150px' },
          ],
          rows: [
            ...(data.income.byMethod ?? []).map(m => ({ source: m.source, count: m.count, amount: fmt(m.amount) })),
            { __rowClass: 'row-total', source: 'TOTAL INCOME', count: '', amount: fmt(data.income.total) },
          ],
        },
        {
          heading: 'Expenditure by Category',
          cols: [
            { label: 'Category', key: 'cat' },
            { label: 'Items', key: 'count', align: 'center', width: '60px' },
            { label: 'Amount (UGX)', key: 'amount', align: 'right', width: '150px' },
          ],
          rows: [
            ...(data.expenditure.byCategory ?? []).map(c => ({
              cat: c.category.charAt(0).toUpperCase() + c.category.slice(1), count: c.count, amount: fmt(c.amount),
            })),
            { __rowClass: 'row-total', cat: 'TOTAL EXPENDITURE', count: '', amount: fmt(data.expenditure.total) },
            { __rowClass: 'row-total', cat: data.isDeficit ? 'NET DEFICIT' : 'NET SURPLUS', count: '', amount: fmt(Math.abs(data.netSurplus)) },
          ],
        },
      ],
    })
  }

  const expCatData = (data?.expenditure.byCategory ?? []).map((c, i) => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.amount, color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const IncomeRow = ({ label, amount, count, total }: { label: string; amount: number; count?: number; total: number }) => (
    <div className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/30">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-sm">{label}</span>
        {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{total > 0 ? calculatePercentage(amount, total) : 0}%</span>
        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(amount)}</span>
      </div>
    </div>
  )

  const ExpRow = ({ label, amount, count, total }: { label: string; amount: number; count?: number; total: number }) => (
    <div className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-muted/30">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        <span className="text-sm">{label}</span>
        {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{total > 0 ? calculatePercentage(amount, total) : 0}%</span>
        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">{formatCurrency(amount)}</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PrintHeader title="Income & Expenditure Statement" />
      <ReportPageHeader title={card.title} description={card.description} icon={card.icon} colorClass={card.color} bgColor={card.bgColor} onBack={onBack}>
        <ExportBar onCSV={() => exportToCSV(csvData(), 'MIBAM_IncomeExpenditure')} onExcel={() => exportToExcel(csvData(), 'MIBAM_IncomeExpenditure')} onPrint={handlePDF} loading={loading} />
      </ReportPageHeader>

      {/* Filters */}
      <Card className="premium-card print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <DatePickerField label="From Date" value={dateFrom} onChange={setDateFrom} />
            <DatePickerField label="To Date" value={dateTo} onChange={setDateTo} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Expense Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetch_} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Total Income" value={formatCurrency(data.income.total)} icon={TrendingUp} colorClass="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" trend="up" />
            <StatCard label="Total Expenditure" value={formatCurrency(data.expenditure.total)} icon={TrendingDown} colorClass="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" trend="down" />
            <StatCard label={data.isDeficit ? 'Net Deficit' : 'Net Surplus'} value={formatCurrency(Math.abs(data.netSurplus))} icon={data.isDeficit ? ArrowDownRight : ArrowUpRight} colorClass={data.isDeficit ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'} trend={data.isDeficit ? 'down' : 'up'} />
          </div>

          {/* I&E Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Income section */}
            <Card className="premium-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-emerald-600 dark:text-emerald-400">Income</CardTitle>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.income.total)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground px-3 pb-1">By Collection Method</p>
                {data.income.byMethod.map((m, i) => <IncomeRow key={i} label={m.source} amount={m.amount} count={m.count} total={data.income.total} />)}
                {data.income.byMethod.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No income in this period</p>}
                {data.income.byCourse.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium text-muted-foreground px-3 pb-1">By Course</p>
                    {data.income.byCourse.map((c, i) => <IncomeRow key={i} label={c.source} amount={c.amount} count={c.count} total={data.income.total} />)}
                  </>
                )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 dark:bg-emerald-950/30 rounded font-semibold">
                  <span className="text-sm">Total Income</span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(data.income.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Expenditure section */}
            <Card className="premium-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-rose-600 dark:text-rose-400">Expenditure</CardTitle>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(data.expenditure.total)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {data.expenditure.byCategory.map((c, i) => <ExpRow key={i} label={c.category.charAt(0).toUpperCase() + c.category.slice(1)} amount={c.amount} count={c.count} total={data.expenditure.total} />)}
                {data.expenditure.byCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No expenditure in this period</p>}
                <Separator className="my-2" />
                <div className="flex items-center justify-between py-2 px-3 bg-rose-50 dark:bg-rose-950/30 rounded font-semibold">
                  <span className="text-sm">Total Expenditure</span>
                  <span className="text-sm text-rose-600 dark:text-rose-400">{formatCurrency(data.expenditure.total)}</span>
                </div>
                <Separator className="my-2" />
                <div className={cn('flex items-center justify-between py-2 px-3 rounded font-bold', data.isDeficit ? 'bg-rose-100 dark:bg-rose-950/50' : 'bg-emerald-100 dark:bg-emerald-950/50')}>
                  <span className="text-sm">{data.isDeficit ? 'Net Deficit' : 'Net Surplus'}</span>
                  <span className={cn('text-sm', data.isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>{formatCurrency(Math.abs(data.netSurplus))}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenditure Pie */}
          {expCatData.length > 0 && (
            <Card className="premium-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expenditure by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {expCatData.sort((a, b) => b.value - a.value).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(c.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// CASH FLOW REPORT
// ============================================================

interface CashFlowData {
  period: string
  summary: { openingBalance: number; totalIncome: number; totalExpenses: number; netCashFlow: number; closingBalance: number; incomeTransactions: number; expenseTransactions: number }
  income: { total: number; byMethod: Record<string, number> }
  expenses: { total: number; byCategory: Record<string, number> }
  generatedAt: string
}

function CashFlowView({ onBack }: { onBack: () => void }) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => { const d = new Date(); d.setDate(1); return d })
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [period, setPeriod] = useState('monthly')
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ type: 'cash-flow', period })
      if (dateFrom) p.set('date', dateFrom.toISOString())
      const res = await fetch(`/api/reports?${p}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error || 'Failed to load cash flow report')
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, period])

  useEffect(() => { fetch_() }, [fetch_])

  const card = REPORT_CARDS.find(c => c.id === 'cash-flow')!

  const incomeByMethod = Object.entries(data?.income.byMethod ?? {}).map(([method, amount], i) => ({
    name: method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), value: amount as number, color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const expByCategory = Object.entries(data?.expenses.byCategory ?? {}).map(([cat, amount], i) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1), value: amount as number, color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const barData = data ? [
    { name: 'Opening', amount: data.summary.openingBalance, fill: '#0ea5e9' },
    { name: 'Income', amount: data.summary.totalIncome, fill: '#10b981' },
    { name: 'Expenses', amount: data.summary.totalExpenses, fill: '#f43f5e' },
    { name: 'Closing', amount: data.summary.closingBalance, fill: data.summary.closingBalance >= 0 ? '#10b981' : '#f43f5e' },
  ] : []

  const csvData = (): Record<string, unknown>[] => !data ? [] : [
    { Section: 'Cash Flow Statement', Item: '', Amount: '' },
    { Section: '', Item: 'Opening Balance', Amount: data.summary.openingBalance },
    { Section: 'Operating Activities (Income)', Item: '', Amount: '' },
    ...Object.entries(data.income.byMethod ?? {}).map(([m, a]) => ({ Section: '', Item: `  ${m.replace('_', ' ')}`, Amount: a })),
    { Section: '', Item: 'Total Income', Amount: data.summary.totalIncome },
    { Section: 'Operating Activities (Expenses)', Item: '', Amount: '' },
    ...Object.entries(data.expenses.byCategory ?? {}).map(([c, a]) => ({ Section: '', Item: `  ${c}`, Amount: a })),
    { Section: '', Item: 'Total Expenses', Amount: data.summary.totalExpenses },
    { Section: '', Item: 'Net Cash Flow', Amount: data.summary.netCashFlow },
    { Section: '', Item: 'Closing Balance', Amount: data.summary.closingBalance },
  ]

  const handlePDF = () => {
    if (!data) return
    const fmt = (n: number) => formatCurrency(n)
    buildReportPDF({
      title: 'Cash Flow Statement',
      period: data.period,
      summaryRows: [
        { label: 'Opening Balance', value: fmt(data.summary.openingBalance) },
        { label: 'Total Income', value: fmt(data.summary.totalIncome) },
        { label: 'Total Expenses', value: fmt(data.summary.totalExpenses) },
        { label: 'Closing Balance', value: fmt(data.summary.closingBalance) },
      ],
      sections: [{
        cols: [
          { label: 'Description', key: 'desc' },
          { label: 'Amount (UGX)', key: 'amount', align: 'right', width: '150px' },
        ],
        rows: [
          { __rowClass: 'row-opening', desc: 'Opening Balance', amount: fmt(data.summary.openingBalance) },
          { __rowClass: 'row-separator', desc: 'Operating Activities — Income', amount: '' },
          ...Object.entries(data.income.byMethod ?? {}).map(([m, a]) => ({
            desc: `  ${m.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`, amount: fmt(a as number),
          })),
          { __rowClass: 'row-subtotal', desc: 'Total Income', amount: fmt(data.summary.totalIncome) },
          { __rowClass: 'row-separator', desc: 'Operating Activities — Expenses', amount: '' },
          ...Object.entries(data.expenses.byCategory ?? {}).map(([c, a]) => ({
            desc: `  ${c.charAt(0).toUpperCase() + c.slice(1)}`, amount: fmt(a as number),
          })),
          { __rowClass: 'row-subtotal', desc: 'Total Expenses', amount: fmt(data.summary.totalExpenses) },
          { __rowClass: 'row-separator', desc: '', amount: '' },
          { __rowClass: 'row-total', desc: 'Net Cash Flow', amount: fmt(data.summary.netCashFlow) },
          { __rowClass: 'row-closing', desc: 'Closing Balance', amount: fmt(data.summary.closingBalance) },
        ],
      }],
    })
  }

  const CFRow = ({ label, value, indent, bold, positive }: { label: string; value: number; indent?: boolean; bold?: boolean; positive?: boolean }) => (
    <div className={cn('flex items-center justify-between py-2 px-3 rounded', indent && 'ml-4 text-sm', bold && 'font-semibold bg-muted/30', !bold && !indent && 'text-sm')}>
      <span>{label}</span>
      <span className={cn(positive === true && 'text-emerald-600 dark:text-emerald-400', positive === false && 'text-rose-600 dark:text-rose-400', bold && 'font-bold')}>{formatCurrency(value)}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <PrintHeader title="Cash Flow Statement" />
      <ReportPageHeader title={card.title} description={card.description} icon={card.icon} colorClass={card.color} bgColor={card.bgColor} onBack={onBack}>
        <ExportBar onCSV={() => exportToCSV(csvData(), 'MIBAM_CashFlow')} onExcel={() => exportToExcel(csvData(), 'MIBAM_CashFlow')} onPrint={handlePDF} loading={loading} />
      </ReportPageHeader>

      {/* Filters */}
      <Card className="premium-card print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DatePickerField label="Reference Date" value={dateFrom} onChange={setDateFrom} />
            <div />
            <Button onClick={fetch_} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Opening Balance" value={formatCurrency(data.summary.openingBalance)} icon={DollarSign} colorClass="bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400" />
            <StatCard label="Total Income" value={formatCurrency(data.summary.totalIncome)} subtext={`${data.summary.incomeTransactions} transactions`} icon={TrendingUp} colorClass="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" trend="up" />
            <StatCard label="Total Expenses" value={formatCurrency(data.summary.totalExpenses)} subtext={`${data.summary.expenseTransactions} transactions`} icon={TrendingDown} colorClass="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" trend="down" />
            <StatCard label="Closing Balance" value={formatCurrency(data.summary.closingBalance)} subtext={`Net: ${formatCurrency(data.summary.netCashFlow)}`} icon={Wallet} colorClass={data.summary.closingBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cash Flow Waterfall */}
            <Card className="premium-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Flow Overview</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{ amount: { label: 'Amount', color: '#10b981' } }} className="h-[240px] w-full">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={v => formatCurrency(v as number)} />} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Structured Statement */}
            <Card className="premium-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Statement — {data.period}</CardTitle></CardHeader>
              <CardContent className="space-y-0.5">
                <CFRow label="Opening Balance" value={data.summary.openingBalance} bold />
                <Separator className="my-1" />
                <p className="text-xs font-medium text-muted-foreground px-3 py-1">Operating Activities — Income</p>
                {Object.entries(data.income.byMethod ?? {}).map(([m, a], i) => (
                  <CFRow key={i} label={m.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} value={a as number} indent positive={true} />
                ))}
                <CFRow label="Total Income" value={data.summary.totalIncome} bold positive={true} />
                <Separator className="my-1" />
                <p className="text-xs font-medium text-muted-foreground px-3 py-1">Operating Activities — Expenses</p>
                {Object.entries(data.expenses.byCategory ?? {}).map(([c, a], i) => (
                  <CFRow key={i} label={c.charAt(0).toUpperCase() + c.slice(1)} value={a as number} indent positive={false} />
                ))}
                <CFRow label="Total Expenses" value={data.summary.totalExpenses} bold positive={false} />
                <Separator className="my-1" />
                <CFRow label="Net Cash Flow" value={data.summary.netCashFlow} bold positive={data.summary.netCashFlow >= 0} />
                <CFRow label="Closing Balance" value={data.summary.closingBalance} bold positive={data.summary.closingBalance >= 0} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// OUTSTANDING PAYMENTS REPORT
// ============================================================

interface OutstandingItem {
  studentId: string; name: string; course: string; courseCode: string; academicYear: string
  enrolledAt: string; totalFees: number; totalPaid: number; outstanding: number; daysOverdue: number; status: string
}
interface OutstandingData {
  period: string
  summary: { totalStudents: number; totalOutstanding: number; totalOverdue: number; overdueCount: number }
  items: OutstandingItem[]
  generatedAt: string
}

function OutstandingPaymentsView({ onBack }: { onBack: () => void }) {
  const [overdueStatus, setOverdueStatus] = useState('all')
  const [courseId, setCourseId] = useState('all')
  const [courses, setCourses] = useState<{ id: string; name: string; code: string }[]>([])
  const [data, setData] = useState<OutstandingData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(j => { if (j.success && j.data) setCourses(j.data) }).catch(() => {})
  }, [])

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ overdueStatus })
      if (courseId !== 'all') p.set('courseId', courseId)
      const res = await fetch(`/api/reports/outstanding-payments?${p}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else toast.error(json.error || 'Failed to load report')
    } catch { toast.error('Failed to load report') }
    finally { setLoading(false) }
  }, [overdueStatus, courseId])

  useEffect(() => { fetch_() }, [fetch_])

  const card = REPORT_CARDS.find(c => c.id === 'outstanding-payments')!

  const csvData = (): Record<string, unknown>[] =>
    (data?.items ?? []).map(s => ({
      'Student ID': s.studentId, Name: s.name, Course: s.course, 'Academic Year': s.academicYear,
      'Total Fees': s.totalFees, 'Total Paid': s.totalPaid, Outstanding: s.outstanding,
      'Days Overdue': s.daysOverdue, Status: s.status,
    }))

  const handlePDF = () => {
    if (!data) return
    const fmt = (n: number) => formatCurrency(n)
    buildReportPDF({
      title: 'Outstanding Payments Report',
      period: data.period,
      summaryRows: [
        { label: 'Students Owing', value: String(data.summary.totalStudents) },
        { label: 'Total Outstanding', value: fmt(data.summary.totalOutstanding) },
        { label: 'Overdue Amount', value: fmt(data.summary.totalOverdue) },
        { label: 'Overdue Students', value: String(data.summary.overdueCount) },
      ],
      sections: [{
        cols: [
          { label: 'Student Name', key: 'name', width: '140px' },
          { label: 'ID', key: 'id', width: '90px' },
          { label: 'Course', key: 'course', width: '75px' },
          { label: 'Total Fees', key: 'fees', align: 'right', width: '80px' },
          { label: 'Paid', key: 'paid', align: 'right', width: '80px' },
          { label: 'Outstanding', key: 'outstanding', align: 'right', width: '80px' },
          { label: 'Days Overdue', key: 'days', align: 'center', width: '60px' },
          { label: 'Status', key: 'status', width: '55px' },
        ],
        rows: data.items.map(s => ({
          __rowClass: s.daysOverdue > 30 ? 'row-overdue' : '',
          name: s.name, id: s.studentId, course: s.courseCode,
          fees: fmt(s.totalFees), paid: fmt(s.totalPaid), outstanding: fmt(s.outstanding),
          days: s.daysOverdue > 0 ? `${s.daysOverdue}d` : '—',
          status: s.daysOverdue > 30 ? 'Overdue' : 'Pending',
        })),
      }],
    })
  }

  const statusBadge = (status: string, days: number) => {
    if (days > 30) return <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800">Overdue</Badge>
    return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">Pending</Badge>
  }

  return (
    <div className="space-y-6">
      <PrintHeader title="Outstanding Payments Report" />
      <ReportPageHeader title={card.title} description={card.description} icon={card.icon} colorClass={card.color} bgColor={card.bgColor} onBack={onBack}>
        <ExportBar onCSV={() => exportToCSV(csvData(), 'MIBAM_OutstandingPayments')} onExcel={() => exportToExcel(csvData(), 'MIBAM_OutstandingPayments')} onPrint={handlePDF} loading={loading} />
      </ReportPageHeader>

      {/* Filters */}
      <Card className="premium-card print:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Overdue Status</Label>
              <Select value={overdueStatus} onValueChange={setOverdueStatus}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outstanding</SelectItem>
                  <SelectItem value="overdue">Overdue (&gt;30 days)</SelectItem>
                  <SelectItem value="current">Current (≤30 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div />
            <Button onClick={fetch_} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <LoadingState /> : !data ? <EmptyState /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Students Owing" value={String(data.summary.totalStudents)} icon={Users} colorClass="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" />
            <StatCard label="Total Outstanding" value={formatCurrency(data.summary.totalOutstanding)} icon={DollarSign} colorClass="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" trend="down" />
            <StatCard label="Overdue Amount" value={formatCurrency(data.summary.totalOverdue)} icon={AlertCircle} colorClass="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" />
            <StatCard label="Overdue Students" value={String(data.summary.overdueCount)} icon={Clock} colorClass="bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" />
          </div>

          <Card className="premium-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding Fee Balances ({data.items.length})</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Course</TableHead>
                    <TableHead className="text-right">Total Fees</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Days Overdue</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No outstanding payments found</TableCell></TableRow>
                  ) : data.items.map((s, i) => (
                    <TableRow key={i} className={s.daysOverdue > 30 ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}>
                      <TableCell><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.studentId}</p></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{s.courseCode}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(s.totalFees)}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(s.totalPaid)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(s.outstanding)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-sm">{s.daysOverdue > 0 ? <span className={s.daysOverdue > 30 ? 'text-rose-600 dark:text-rose-400 font-medium' : ''}>{s.daysOverdue}d</span> : '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{statusBadge(s.status, s.daysOverdue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main ReportsModule – handles sub-routing via ?report= param
// ============================================================

export function ReportsModule() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const reportView = (searchParams.get('report') || 'index') as ReportView

  const navigate = useCallback((view: ReportView) => {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'index') {
      params.delete('report')
    } else {
      params.set('report', view)
    }
    router.push(`?${params.toString()}`, { scroll: false } as Parameters<typeof router.push>[1])
  }, [searchParams, router])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={reportView}
        initial={{ opacity: 0, x: reportView === 'index' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: reportView === 'index' ? 20 : -20 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {reportView === 'index' && <ReportsIndexView onNavigate={navigate} />}
        {reportView === 'day-book' && <DayBookView onBack={() => navigate('index')} />}
        {reportView === 'balance-sheet' && <BalanceSheetView onBack={() => navigate('index')} />}
        {reportView === 'fee-collection' && <FeeCollectionView onBack={() => navigate('index')} />}
        {reportView === 'income-expenditure' && <IncomeExpenditureView onBack={() => navigate('index')} />}
        {reportView === 'cash-flow' && <CashFlowView onBack={() => navigate('index')} />}
        {reportView === 'outstanding-payments' && <OutstandingPaymentsView onBack={() => navigate('index')} />}
      </motion.div>
    </AnimatePresence>
  )
}
