'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard,
  Search,
  Plus,
  Eye,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Building2,
  Smartphone,
  Calendar,
  CalendarIcon,
  X,
  CheckCircle2,
  UserCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Wallet,
  Clock,
  Loader2,
  Filter,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, formatDateTime, cn } from '@/lib/utils'
import type { Payment, Student, PaymentMethod, PaginatedResponse } from '@/lib/types'
import { toast } from 'sonner'
import { exportToExcel, exportToPDF, exportToCSV, generatePDFTable } from '@/lib/export-utils'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ============================================================
// Constants
// ============================================================
const MIBAM_INFO = {
  name: 'MITOOMA INSTITUTE OF BUSINESS AND MANAGEMENT',
  shortName: 'MIBAM',
  address: 'P.O. Box 123, Mitooma, Western Uganda',
  phone: '+256 772 123 456',
  email: 'info@mibam.ac.ug',
  motto: 'Excellence in Business Education',
}

const PAYMENT_METHOD_CONFIG: Record<
  PaymentMethod,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  cash: {
    label: 'Cash',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: Banknote,
  },
  bank: {
    label: 'Bank',
    color: 'text-teal-700 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    icon: Building2,
  },
  mobile_money: {
    label: 'Mobile Money',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: Smartphone,
  },
}

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4']
const PAGE_SIZE = 10

// ============================================================
// Utility: Number to Words (UGX)
// ============================================================
function numberToWords(num: number): string {
  if (num === 0) return 'Zero'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ]
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ]
  const scales = ['', 'Thousand', 'Million', 'Billion']

  function convertChunk(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    }
    return (
      ones[Math.floor(n / 100)] +
      ' Hundred' +
      (n % 100 ? ' and ' + convertChunk(n % 100) : '')
    )
  }

  let result = ''
  let scaleIndex = 0

  while (num > 0) {
    const chunk = num % 1000
    if (chunk > 0) {
      result = convertChunk(chunk) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (result ? ' ' + result : '')
    }
    num = Math.floor(num / 1000)
    scaleIndex++
  }

  return result + ' Shillings Only'
}

// ============================================================
// Student with balance type (from API)
// ============================================================
interface StudentWithBalance extends Student {
  totalPaid: number
  balance: number
  course: {
    id: string
    name: string
    code: string
    tuitionFee: number
    duration: number
  }
  academicYear?: { id: string; name: string }
  semester?: { id: string; name: string }
  _count?: { payments: number }
}

// ============================================================
// Payment with student (from API)
// ============================================================
interface PaymentWithStudent extends Payment {
  student: {
    id: string
    studentId: string
    firstName: string
    lastName: string
    course?: { name: string; code: string }
  }
  receivedByUser?: { id: string; name: string }
}

// ============================================================
// Receipt Data
// ============================================================
interface ReceiptData {
  payment: PaymentWithStudent
  studentFinancialSummary?: {
    expectedTotal: number
    totalPaid: number
    balance: number
    totalPayments: number
  }
}

// ============================================================
// Sub-Component: Payment Statistics Bar
// ============================================================
function PaymentStatsBar({ payments }: { payments: PaymentWithStudent[] }) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const todayTotal = payments
    .filter((p) => new Date(p.receivedAt) >= today)
    .reduce((sum, p) => sum + p.amount, 0)

  const weekTotal = payments
    .filter((p) => new Date(p.receivedAt) >= weekStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const monthTotal = payments
    .filter((p) => new Date(p.receivedAt) >= monthStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const totalAll = payments.reduce((sum, p) => sum + p.amount, 0)

  const stats = [
    {
      title: 'Collected Today',
      value: formatCurrency(todayTotal),
      icon: Clock,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/40',
    },
    {
      title: 'This Week',
      value: formatCurrency(weekTotal),
      icon: Calendar,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/30',
      border: 'border-teal-200 dark:border-teal-800/40',
    },
    {
      title: 'This Month',
      value: formatCurrency(monthTotal),
      icon: Wallet,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/40',
    },
    {
      title: 'Collection Rate',
      value: totalAll > 0 ? '87.3%' : '0%',
      icon: TrendingUp,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      border: 'border-violet-200 dark:border-violet-800/40',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`border ${stat.border} overflow-hidden`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </span>
                  <div className={`p-1.5 rounded-md ${stat.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-lg font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================
// Sub-Component: Payment Method Badge
// ============================================================
function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const config = PAYMENT_METHOD_CONFIG[method]
  const Icon = config.icon
  return (
    <Badge
      variant="secondary"
      className={`${config.bgColor} ${config.color} border-0 gap-1 font-medium`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ============================================================
// Sub-Component: Table Skeleton
// ============================================================
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Sub-Component: Empty State
// ============================================================
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <CreditCard className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold text-muted-foreground">
        {hasFilters ? 'No payments match your filters' : 'No payments recorded yet'}
      </h3>
      <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
        {hasFilters
          ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
          : 'Click the "Record Payment" button to record the first payment.'}
      </p>
    </motion.div>
  )
}

// ============================================================
// Sub-Component: Receipt View
// ============================================================
function ReceiptView({
  receiptData,
  onClose,
}: {
  receiptData: ReceiptData
  onClose: () => void
}) {
  const { payment, studentFinancialSummary } = receiptData
  const student = payment.student
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    const printContent = receiptRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to print receipts')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${payment.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1a1a1a; }
          .receipt { max-width: 700px; margin: 0 auto; border: 2px solid #0d9488; padding: 30px; }
          .header { text-align: center; border-bottom: 3px double #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 18px; letter-spacing: 2px; color: #0d9488; margin-bottom: 4px; }
          .header p { font-size: 11px; color: #666; margin: 2px 0; }
          .receipt-number { text-align: center; background: #f0fdfa; border: 1px solid #0d9488; padding: 10px; margin: 15px 0; border-radius: 6px; }
          .receipt-number span { font-size: 22px; font-weight: 700; color: #0d9488; letter-spacing: 1px; }
          .section { margin-bottom: 15px; }
          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; font-weight: 600; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
          .row .label { color: #666; min-width: 140px; }
          .row .value { font-weight: 500; text-align: right; }
          .amount-section { background: #f0fdfa; border: 2px solid #0d9488; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: center; }
          .amount-section .amount { font-size: 28px; font-weight: 700; color: #0d9488; }
          .amount-section .words { font-size: 12px; color: #555; margin-top: 4px; font-style: italic; }
          .balance-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #fefce8; border: 1px solid #eab308; border-radius: 6px; margin: 10px 0; font-size: 13px; }
          .balance-row .label { color: #92400e; }
          .balance-row .value { font-weight: 700; color: #92400e; }
          .signature { margin-top: 40px; padding-top: 10px; }
          .signature-line { width: 200px; border-top: 1px solid #999; margin-bottom: 4px; }
          .signature-label { font-size: 11px; color: #666; }
          .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #ccc; }
          .footer p { font-size: 10px; color: #888; }
          @media print { body { padding: 0; } .receipt { border-width: 1px; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }, [payment.receiptNumber])

  const handleDownloadPDF = useCallback(() => {
    const printContent = receiptRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to download receipts')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${payment.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1a1a1a; }
          .receipt { max-width: 700px; margin: 0 auto; border: 2px solid #0d9488; padding: 30px; }
          .header { text-align: center; border-bottom: 3px double #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 18px; letter-spacing: 2px; color: #0d9488; margin-bottom: 4px; }
          .header p { font-size: 11px; color: #666; margin: 2px 0; }
          .receipt-number { text-align: center; background: #f0fdfa; border: 1px solid #0d9488; padding: 10px; margin: 15px 0; border-radius: 6px; }
          .receipt-number span { font-size: 22px; font-weight: 700; color: #0d9488; letter-spacing: 1px; }
          .section { margin-bottom: 15px; }
          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; font-weight: 600; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
          .row .label { color: #666; min-width: 140px; }
          .row .value { font-weight: 500; text-align: right; }
          .amount-section { background: #f0fdfa; border: 2px solid #0d9488; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: center; }
          .amount-section .amount { font-size: 28px; font-weight: 700; color: #0d9488; }
          .amount-section .words { font-size: 12px; color: #555; margin-top: 4px; font-style: italic; }
          .balance-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #fefce8; border: 1px solid #eab308; border-radius: 6px; margin: 10px 0; font-size: 13px; }
          .balance-row .label { color: #92400e; }
          .balance-row .value { font-weight: 700; color: #92400e; }
          .signature { margin-top: 40px; padding-top: 10px; }
          .signature-line { width: 200px; border-top: 1px solid #999; margin-bottom: 4px; }
          .signature-label { font-size: 11px; color: #666; }
          .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px dashed #ccc; }
          .footer p { font-size: 10px; color: #888; }
          @media print { body { padding: 0; } .receipt { border-width: 1px; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    toast.success('Receipt opened. Use Ctrl+P (or Cmd+P) to save as PDF.')
  }, [payment.receiptNumber])

  return (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden" showCloseButton={true}>
      <DialogHeader className="sr-only">
        <DialogTitle>Payment Receipt - {payment.receiptNumber}</DialogTitle>
        <DialogDescription>Official receipt for payment received</DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[80vh]">
        <div ref={receiptRef} className="p-6">
          {/* Receipt Content */}
          <div className="border-2 border-teal-600 dark:border-teal-500 rounded-lg p-6">
            {/* Header */}
            <div className="text-center border-b-[3px] border-double border-teal-600 dark:border-teal-500 pb-4 mb-5">
              <h1 className="text-lg font-bold tracking-[3px] text-teal-700 dark:text-teal-400">
                {MIBAM_INFO.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">{MIBAM_INFO.address}</p>
              <p className="text-xs text-muted-foreground">
                Tel: {MIBAM_INFO.phone} | Email: {MIBAM_INFO.email}
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1 italic">
                &ldquo;{MIBAM_INFO.motto}&rdquo;
              </p>
            </div>

            {/* Receipt Number */}
            <div className="text-center bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 py-3 px-4 rounded-lg mb-5">
              <p className="text-[10px] uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1">
                Official Receipt
              </p>
              <span className="text-2xl font-bold text-teal-700 dark:text-teal-300 tracking-wider">
                {payment.receiptNumber}
              </span>
            </div>

            {/* Date & Time */}
            <div className="flex justify-between text-sm mb-5 text-muted-foreground">
              <span>Date: {formatDate(payment.receivedAt)}</span>
              <span>Time: {new Date(payment.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Student Details */}
            <div className="mb-5">
              <p className="text-[11px] uppercase tracking-widest text-teal-600 dark:text-teal-400 border-b border-border pb-1 mb-3 font-semibold">
                Student Details
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground min-w-[130px]">Student Name:</span>
                  <span className="font-medium">
                    {student.firstName} {student.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground min-w-[130px]">Student ID:</span>
                  <span className="font-medium font-mono">{student.studentId}</span>
                </div>
                {student.course && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground min-w-[130px]">Course:</span>
                    <span className="font-medium">
                      {student.course.name} ({student.course.code})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Amount */}
            <div className="bg-teal-50 dark:bg-teal-950/30 border-2 border-teal-200 dark:border-teal-800/60 rounded-lg p-4 text-center mb-5">
              <p className="text-[10px] uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1">
                Amount Paid
              </p>
              <p className="text-3xl font-bold text-teal-700 dark:text-teal-300">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                {numberToWords(payment.amount)}
              </p>
            </div>

            {/* Payment Details */}
            <div className="mb-5">
              <p className="text-[11px] uppercase tracking-widest text-teal-600 dark:text-teal-400 border-b border-border pb-1 mb-3 font-semibold">
                Payment Details
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground min-w-[130px]">Payment Method:</span>
                  <PaymentMethodBadge method={payment.paymentMethod as PaymentMethod} />
                </div>
                {payment.reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground min-w-[130px]">Reference:</span>
                    <span className="font-medium font-mono text-xs">{payment.reference}</span>
                  </div>
                )}
                {payment.semester && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground min-w-[130px]">Semester:</span>
                    <span className="font-medium">{payment.semester}</span>
                  </div>
                )}
                {payment.academicYear && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground min-w-[130px]">Academic Year:</span>
                    <span className="font-medium">{payment.academicYear}</span>
                  </div>
                )}
                {payment.notes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground min-w-[130px]">Notes:</span>
                    <span className="font-medium text-xs">{payment.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Balance */}
            {studentFinancialSummary && (
              <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 mb-5">
                <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  Balance Remaining:
                </span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(studentFinancialSummary.balance)}
                </span>
              </div>
            )}

            {/* Received By */}
            <div className="mb-5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Received by:</span>
                <span className="font-medium">
                  {payment.receivedByUser?.name || 'N/A'}
                </span>
              </div>
            </div>

            {/* Signature Line */}
            <div className="mt-8">
              <div className="w-52 border-t border-muted-foreground/40 mb-1" />
              <p className="text-xs text-muted-foreground">Signature (Received by)</p>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t border-dashed border-border">
              <p className="text-[10px] text-muted-foreground">
                This is an official receipt from {MIBAM_INFO.shortName}. Please retain for your records.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Generated on {formatDateTime(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="border-t bg-muted/30 p-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          className="border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30"
        >
          <Download className="h-4 w-4 mr-1" />
          Save PDF
        </Button>
        <Button
          size="sm"
          onClick={handlePrint}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Printer className="h-4 w-4 mr-1" />
          Print Receipt
        </Button>
      </div>
    </DialogContent>
  )
}

// ============================================================
// Sub-Component: Record Payment Dialog
// ============================================================
function RecordPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (payment: PaymentWithStudent) => void
}) {
  const { currentUser } = useAppStore()
  const [students, setStudents] = useState<StudentWithBalance[]>([])
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; semesters: { id: string; name: string }[] }[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentWithBalance | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)

  // Form fields
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [semester, setSemester] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [notes, setNotes] = useState('')

  // Fetch academic years on mount
  useEffect(() => {
    if (open) {
      fetch('/api/academic-years')
        .then((r) => r.json())
        .then((res) => {
          if (res.data) setAcademicYears(res.data)
        })
        .catch(() => {})
    }
  }, [open])

  // Search students with debounce
  useEffect(() => {
    if (!studentSearch || studentSearch.length < 2) {
      setStudents([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoadingStudents(true)
      try {
        const res = await fetch(`/api/students?q=${encodeURIComponent(studentSearch)}&limit=20`)
        const data = await res.json()
        if (data.data) {
          setStudents(data.data)
          setShowStudentDropdown(true)
        }
      } catch {
        setStudents([])
      } finally {
        setIsLoadingStudents(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [studentSearch])

  const handleSelectStudent = (student: StudentWithBalance) => {
    setSelectedStudent(student)
    setStudentSearch(`${student.firstName} ${student.lastName} (${student.studentId})`)
    setShowStudentDropdown(false)
  }

  const handleAmountChange = (value: string) => {
    const num = value.replace(/[^0-9]/g, '')
    setAmount(num)
  }

  const resetForm = useCallback(() => {
    setStudentSearch('')
    setSelectedStudent(null)
    setAmount('')
    setPaymentMethod('cash')
    setReference('')
    setSemester('')
    setAcademicYear('')
    setNotes('')
    setShowStudentDropdown(false)
  }, [])

  const handleSubmit = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const numAmount = Number(amount)

    // Check if amount exceeds balance
    if (selectedStudent.balance > 0 && numAmount > selectedStudent.balance) {
      toast.error(`Amount cannot exceed the student's balance of ${formatCurrency(selectedStudent.balance)}`)
      return
    }

    if (paymentMethod !== 'cash' && !reference.trim()) {
      toast.error(`Reference is required for ${PAYMENT_METHOD_CONFIG[paymentMethod].label} payments`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount: numAmount,
          paymentMethod,
          reference: reference.trim() || null,
          semester: semester || null,
          academicYear: academicYear || null,
          notes: notes.trim() || null,
          receivedBy: currentUser?.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment')
      }

      toast.success('Payment recorded successfully!', {
        description: `Receipt: ${data.data.receiptNumber}`,
      })

      onSuccess(data.data)
      resetForm()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate expected total and balance for selected student
  const expectedTotal = selectedStudent
    ? selectedStudent.course.tuitionFee * selectedStudent.course.duration
    : 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a new student payment. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Student Selection */}
          <div className="space-y-2 relative">
            <Label className="text-sm font-medium">
              Student <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or student ID..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value)
                  if (selectedStudent) {
                    setSelectedStudent(null)
                  }
                }}
                onFocus={() => {
                  if (students.length > 0) setShowStudentDropdown(true)
                }}
                className="pl-9"
              />
              {isLoadingStudents && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Student Dropdown */}
            <AnimatePresence>
              {showStudentDropdown && students.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar"
                >
                  {students.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-center justify-between gap-2"
                      onClick={() => handleSelectStudent(s)}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.studentId} &middot; {s.course?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Bal: {formatCurrency(s.balance)}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected Student Card */}
            <AnimatePresence>
              {selectedStudent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {selectedStudent.firstName} {selectedStudent.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedStudent.studentId}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedStudent(null)
                            setStudentSearch('')
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Course</p>
                          <p className="font-medium">{selectedStudent.course?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Fees</p>
                          <p className="font-medium">{formatCurrency(expectedTotal)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(selectedStudent.balance)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Amount (UGX) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                UGX
              </span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount ? Number(amount).toLocaleString('en-US') : ''}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-12 text-lg font-semibold"
              />
            </div>
            {amount && (
              <p className="text-xs text-muted-foreground italic">
                {numberToWords(Number(amount))}
              </p>
            )}
            {selectedStudent && selectedStudent.balance > 0 && amount && Number(amount) > selectedStudent.balance && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Amount exceeds student balance of {formatCurrency(selectedStudent.balance)}
              </div>
            )}
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Payment Method <span className="text-destructive">*</span>
              </Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">
                    <span className="flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5 text-amber-600" />
                      Cash
                    </span>
                  </SelectItem>
                  <SelectItem value="bank">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-teal-600" />
                      Bank Transfer
                    </span>
                  </SelectItem>
                  <SelectItem value="mobile_money">
                    <span className="flex items-center gap-2">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                      Mobile Money
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Reference {paymentMethod !== 'cash' && <span className="text-destructive">*</span>}
              </Label>
              <Input
                placeholder={
                  paymentMethod === 'cash'
                    ? 'Optional'
                    : paymentMethod === 'bank'
                      ? 'Bank reference #'
                      : 'Mobile money ref'
                }
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          {/* Semester & Academic Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Academic Year</Label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay.id} value={ay.name}>
                      {ay.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              placeholder="Any additional notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStudent || !amount}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main Component: PaymentsModule
// ============================================================
export function PaymentsModule() {
  const { currentUser } = useAppStore()

  // Data state
  const [payments, setPayments] = useState<PaymentWithStudent[]>([])
  const [totalPayments, setTotalPayments] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all')
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [isExporting, setIsExporting] = useState(false)

  // Dialog state
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  // Fetch academic years for filter
  useEffect(() => {
    fetch('/api/academic-years')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setAcademicYears(res.data)
      })
      .catch(() => {})
  }, [])

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      if (searchQuery) params.set('q', searchQuery)
      if (methodFilter && methodFilter !== 'all') params.set('paymentMethod', methodFilter)
      if (startDate || dateFrom) params.set('startDate', startDate || (dateFrom ? dateFrom.toISOString() : ''))
      if (endDate || dateTo) params.set('endDate', endDate || (dateTo ? dateTo.toISOString() : ''))
      if (academicYearFilter && academicYearFilter !== 'all') params.set('academicYearId', academicYearFilter)
      if (minAmount) params.set('minAmount', minAmount)
      if (maxAmount) params.set('maxAmount', maxAmount)

      const res = await fetch(`/api/payments?${params.toString()}`)
      const data = await res.json()

      if (data.data) {
        setPayments(data.data)
        setTotalPayments(data.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }, [page, searchQuery, methodFilter, startDate, endDate, academicYearFilter, minAmount, maxAmount, dateFrom, dateTo])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, methodFilter, startDate, endDate, academicYearFilter, minAmount, maxAmount, dateFrom, dateTo])

  const totalPages = Math.ceil(totalPayments / PAGE_SIZE)

  // Count active filters for badge
  const activeFilterCount = [
    methodFilter !== 'all',
    !!(startDate || dateFrom),
    !!(endDate || dateTo),
    academicYearFilter !== 'all',
    !!minAmount,
    !!maxAmount,
  ].filter(Boolean).length

  const hasActiveFilters = activeFilterCount > 0 || !!searchQuery

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setMethodFilter('all')
    setStartDate('')
    setEndDate('')
    setAcademicYearFilter('all')
    setMinAmount('')
    setMaxAmount('')
    setDateFrom(undefined)
    setDateTo(undefined)
    setPage(1)
  }, [])

  // Export: fetch ALL filtered payments for export
  const fetchAllPaymentsForExport = useCallback(async (): Promise<PaymentWithStudent[]> => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '10000') // Fetch all
      if (searchQuery) params.set('q', searchQuery)
      if (methodFilter && methodFilter !== 'all') params.set('paymentMethod', methodFilter)
      if (startDate || dateFrom) params.set('startDate', startDate || (dateFrom ? dateFrom.toISOString() : ''))
      if (endDate || dateTo) params.set('endDate', endDate || (dateTo ? dateTo.toISOString() : ''))
      if (academicYearFilter && academicYearFilter !== 'all') params.set('academicYearId', academicYearFilter)
      if (minAmount) params.set('minAmount', minAmount)
      if (maxAmount) params.set('maxAmount', maxAmount)

      const res = await fetch(`/api/payments?${params.toString()}`)
      const data = await res.json()
      return data.data || []
    } catch {
      toast.error('Failed to fetch payments for export')
      return []
    }
  }, [searchQuery, methodFilter, startDate, endDate, academicYearFilter, minAmount, maxAmount, dateFrom, dateTo])

  // Handle Excel export
  const handleExportExcel = useCallback(async () => {
    setIsExporting(true)
    try {
      const allPayments = await fetchAllPaymentsForExport()
      if (allPayments.length === 0) return

      const exportData = allPayments.map((p) => ({
        receiptNumber: p.receiptNumber,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        studentId: p.student.studentId,
        course: p.student.course?.name || 'N/A',
        amount: p.amount,
        paymentMethod: PAYMENT_METHOD_CONFIG[p.paymentMethod as PaymentMethod]?.label || p.paymentMethod,
        reference: p.reference || '',
        semester: p.semester || '',
        academicYear: p.academicYear || '',
        receivedAt: p.receivedAt,
        receivedBy: p.receivedByUser?.name || 'N/A',
        notes: p.notes || '',
      }))

      const timestamp = new Date().toISOString().slice(0, 10)
      exportToExcel(exportData, `MIBAM_Payments_${timestamp}`, 'Payments')
    } finally {
      setIsExporting(false)
    }
  }, [fetchAllPaymentsForExport])

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true)
    try {
      const allPayments = await fetchAllPaymentsForExport()
      if (allPayments.length === 0) return

      const tableHtml = generatePDFTable(allPayments, {
        headers: [
          { key: 'receiptNumber', label: 'Receipt #' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'amount', label: 'Amount (UGX)', align: 'right' },
          { key: 'paymentMethod', label: 'Method' },
          { key: 'reference', label: 'Reference' },
          { key: 'receivedAt', label: 'Date' },
        ],
        currencyColumns: ['amount'],
        dateColumns: ['receivedAt'],
      })

      const timestamp = new Date().toISOString().slice(0, 10)
      const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0)
      const summaryHtml = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: #f0fdfa; border-radius: 6px; border: 1px solid #99f6e4;">
          <div><strong>Total Payments:</strong> ${allPayments.length}</div>
          <div><strong>Total Amount:</strong> UGX ${totalAmount.toLocaleString('en-US')}</div>
        </div>
      `

      exportToPDF(
        'Payments Report',
        summaryHtml + tableHtml,
        `MIBAM_Payments_${timestamp}`
      )
    } finally {
      setIsExporting(false)
    }
  }, [fetchAllPaymentsForExport])

  // Handle CSV export
  const handleExportCSV = useCallback(async () => {
    setIsExporting(true)
    try {
      const allPayments = await fetchAllPaymentsForExport()
      if (allPayments.length === 0) return

      const exportData = allPayments.map((p) => ({
        receiptNumber: p.receiptNumber,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        studentId: p.student.studentId,
        course: p.student.course?.name || 'N/A',
        amount: p.amount,
        paymentMethod: PAYMENT_METHOD_CONFIG[p.paymentMethod as PaymentMethod]?.label || p.paymentMethod,
        reference: p.reference || '',
        semester: p.semester || '',
        academicYear: p.academicYear || '',
        receivedAt: p.receivedAt,
        receivedBy: p.receivedByUser?.name || 'N/A',
        notes: p.notes || '',
      }))

      const timestamp = new Date().toISOString().slice(0, 10)
      exportToCSV(exportData, `MIBAM_Payments_${timestamp}`)
    } finally {
      setIsExporting(false)
    }
  }, [fetchAllPaymentsForExport])

  // View receipt
  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`)
      const data = await res.json()

      if (data.data) {
        setReceiptData({
          payment: data.data,
          studentFinancialSummary: data.data.studentFinancialSummary,
        })
        setReceiptDialogOpen(true)
      }
    } catch {
      toast.error('Failed to load receipt details')
    }
  }

  // Handle new payment success - show receipt
  const handlePaymentSuccess = (payment: PaymentWithStudent) => {
    // Fetch full payment details for receipt
    handleViewReceipt(payment.id)
    fetchPayments()
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground">
            Record, track, and manage student payments and receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting}
                className="border-teal-200 dark:border-teal-800"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                Export to Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                <FileDown className="h-4 w-4 mr-2 text-red-500" />
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
                <FileText className="h-4 w-4 mr-2 text-teal-600" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => setRecordDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Statistics Bar */}
      {!isLoading && payments.length > 0 && <PaymentStatsBar payments={payments} />}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          {/* Main row: Search + Filter Toggle + Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by receipt # or student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn('relative', showFilters && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Total: <strong className="text-foreground">{totalPayments}</strong> payments</span>
            </div>
          </div>

          {/* Expandable Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                  {/* Payment Method Filter */}
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-3.5 w-3.5 text-amber-600" />
                          Cash
                        </span>
                      </SelectItem>
                      <SelectItem value="bank">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-teal-600" />
                          Bank
                        </span>
                      </SelectItem>
                      <SelectItem value="mobile_money">
                        <span className="flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                          Mobile Money
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Academic Year Filter */}
                  <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {academicYears.map((ay) => (
                        <SelectItem key={ay.id} value={ay.id}>
                          {ay.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date From - Calendar Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'justify-start text-left font-normal',
                          !dateFrom && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? formatDate(dateFrom) : 'From date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={(d) => {
                          setDateFrom(d)
                          if (d) setStartDate(d.toISOString().slice(0, 10))
                          else setStartDate('')
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Date To - Calendar Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'justify-start text-left font-normal',
                          !dateTo && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? formatDate(dateTo) : 'To date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={(d) => {
                          setDateTo(d)
                          if (d) setEndDate(d.toISOString().slice(0, 10))
                          else setEndDate('')
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Amount Range Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Min Amount (UGX)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Max Amount (UGX)</Label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex justify-end mt-3">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : payments.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[140px] font-semibold">Receipt #</TableHead>
                      <TableHead className="font-semibold">Student Name</TableHead>
                      <TableHead className="font-semibold">Student ID</TableHead>
                      <TableHead className="text-right font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Method</TableHead>
                      <TableHead className="font-semibold">Reference</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {payments.map((payment, i) => (
                        <motion.tr
                          key={payment.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ delay: i * 0.03 }}
                          className="group border-b transition-colors hover:bg-muted/30"
                        >
                          <TableCell>
                            <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">
                              {payment.receiptNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                                {payment.student.firstName[0]}{payment.student.lastName[0]}
                              </div>
                              <span className="font-medium text-sm">
                                {payment.student.firstName} {payment.student.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              {payment.student.studentId}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-sm">
                              {formatCurrency(payment.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <PaymentMethodBadge method={payment.paymentMethod as PaymentMethod} />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-mono">
                              {payment.reference || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(payment.receivedAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                                onClick={() => handleViewReceipt(payment.id)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Receipt
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleViewReceipt(payment.id)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {payments.map((payment, i) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">
                          {payment.receiptNumber}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                            {payment.student.firstName[0]}{payment.student.lastName[0]}
                          </div>
                          <span className="font-medium text-sm">
                            {payment.student.firstName} {payment.student.lastName}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(payment.amount)}</p>
                        <PaymentMethodBadge method={payment.paymentMethod as PaymentMethod} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{payment.student.studentId}</span>
                      <span>{formatDate(payment.receivedAt)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleViewReceipt(payment.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Receipt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewReceipt(payment.id)}
                      >
                        <Printer className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && totalPayments > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalPayments)} of{' '}
            {totalPayments} payments
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 w-8 p-0 ${
                      page === pageNum
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : ''
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={recordDialogOpen}
        onOpenChange={setRecordDialogOpen}
        onSuccess={handlePaymentSuccess}
      />

      {/* Receipt View Dialog */}
      {receiptData && (
        <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <ReceiptView
            receiptData={receiptData}
            onClose={() => setReceiptDialogOpen(false)}
          />
        </Dialog>
      )}
    </div>
  )
}
