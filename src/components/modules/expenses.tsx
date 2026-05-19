'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  TrendingDown,
  DollarSign,
  Banknote,
  CreditCard,
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
  Loader2,
  MoreHorizontal,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  File,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, getCategoryColor, getExpenseStatusColor, cn } from '@/lib/utils'
import type { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod } from '@/lib/types'
import { toast } from 'sonner'
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/export-utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ChartContainer, type ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

// ============================================================
// Constants & Helpers
// ============================================================

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
  { value: 'salaries', label: 'Salaries', icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
  { value: 'utilities', label: 'Utilities', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800' },
  { value: 'stationery', label: 'Stationery', icon: PenTool, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800' },
  { value: 'fuel', label: 'Fuel', icon: Fuel, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' },
  { value: 'internet', label: 'Internet', icon: Wifi, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800' },
  { value: 'marketing', label: 'Marketing', icon: Megaphone, color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800' },
  { value: 'rent', label: 'Rent', icon: Home, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800' },
  { value: 'miscellaneous', label: 'Miscellaneous', icon: Package, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800' },
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank', label: 'Bank Transfer', icon: CreditCard },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
]

const STATUS_OPTIONS: { value: ExpenseStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const CHART_CONFIG: ChartConfig = {
  amount: {
    label: 'Expenses',
    color: 'hsl(160, 84%, 39%)',
  },
}

function getCategoryInfo(category: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[8]
}

function getPaymentMethodInfo(method: PaymentMethod) {
  return PAYMENT_METHODS.find(m => m.value === method) || PAYMENT_METHODS[0]
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
}

// ============================================================
// Category Summary Cards
// ============================================================

function CategorySummaryCards({
  categoryTotals,
  selectedCategory,
  onSelectCategory,
}: {
  categoryTotals: Record<string, { total: number; count: number }>
  selectedCategory: string
  onSelectCategory: (cat: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {EXPENSE_CATEGORIES.map((cat, i) => {
        const data = categoryTotals[cat.value] || { total: 0, count: 0 }
        const isSelected = selectedCategory === cat.value
        const Icon = cat.icon
        return (
          <motion.div
            key={cat.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md border',
                cat.bgColor,
                isSelected && 'ring-2 ring-emerald-500 dark:ring-emerald-400 shadow-md'
              )}
              onClick={() => onSelectCategory(isSelected ? '' : cat.value)}
            >
              <CardContent className="p-3 text-center">
                <div className={cn('mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 dark:bg-black/20', cat.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-foreground/80 truncate">{cat.label}</p>
                <p className="text-sm font-bold mt-0.5">{formatCurrency(data.total)}</p>
                <p className="text-[10px] text-muted-foreground">{data.count} {data.count === 1 ? 'item' : 'items'}</p>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================
// Monthly Trend Chart
// ============================================================

function MonthlyTrendChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <Card className="premium-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30">
            <TrendingDown className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <CardTitle className="text-base">Monthly Expense Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Last 6 months overview</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG} className="h-[220px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value: number) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                return `${value}`
              }}
            />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value: number) => formatCurrency(value)}
              />}
            />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Add/Edit Expense Dialog
// ============================================================

interface ExpenseFormData {
  title: string
  amount: string
  category: ExpenseCategory | ''
  paymentMethod: PaymentMethod | ''
  description: string
  date: Date | undefined
}

function ExpenseFormDialog({
  open,
  onOpenChange,
  editingExpense,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingExpense: Expense | null
  onSuccess: () => void
}) {
  const { currentUser } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ExpenseFormData>({
    title: '',
    amount: '',
    category: '',
    paymentMethod: '',
    description: '',
    date: undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingExpense) {
      setForm({
        title: editingExpense.title,
        amount: String(editingExpense.amount),
        category: editingExpense.category,
        paymentMethod: editingExpense.paymentMethod,
        description: editingExpense.description || '',
        date: new Date(editingExpense.date),
      })
    } else {
      setForm({
        title: '',
        amount: '',
        category: '',
        paymentMethod: '',
        description: '',
        date: new Date(),
      })
    }
    setErrors({})
  }, [editingExpense, open])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Valid amount is required'
    if (!form.category) errs.category = 'Category is required'
    if (!form.paymentMethod) errs.paymentMethod = 'Payment method is required'
    if (!form.date) errs.date = 'Date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !currentUser) return
    setLoading(true)

    try {
      const payload = {
        title: form.title.trim(),
        amount: Number(form.amount),
        category: form.category,
        paymentMethod: form.paymentMethod,
        description: form.description.trim() || null,
        date: form.date?.toISOString(),
        ...(editingExpense ? {} : { createdBy: currentUser.id }),
      }

      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
      const method = editingExpense ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense')
      }

      toast.success(editingExpense ? 'Expense updated successfully' : 'Expense created successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {editingExpense ? 'Update the expense details below.' : 'Fill in the details to record a new expense.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="expense-title">Title *</Label>
            <Input
              id="expense-title"
              placeholder="e.g., Monthly electricity bill"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount (UGX) *</Label>
              <Input
                id="expense-amount"
                type="number"
                placeholder="0"
                min="0"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm(prev => ({ ...prev, category: v as ExpenseCategory }))}
              >
                <SelectTrigger className={errors.category ? 'border-destructive w-full' : 'w-full'}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <cat.icon className="h-3.5 w-3.5" />
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Payment Method *</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) => setForm(prev => ({ ...prev, paymentMethod: v as PaymentMethod }))}
              >
                <SelectTrigger className={errors.paymentMethod ? 'border-destructive w-full' : 'w-full'}>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2">
                        <m.icon className="h-3.5 w-3.5" />
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentMethod && <p className="text-xs text-destructive">{errors.paymentMethod}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal w-full',
                      !form.date && 'text-muted-foreground',
                      errors.date && 'border-destructive'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.date ? formatDate(form.date) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date}
                    onSelect={(date) => setForm(prev => ({ ...prev, date: date || undefined }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="expense-description">Description</Label>
            <Textarea
              id="expense-description"
              placeholder="Additional details about this expense..."
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingExpense ? 'Update Expense' : 'Create Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// View Expense Details Dialog
// ============================================================

function ViewExpenseDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
}) {
  if (!expense) return null

  const catInfo = getCategoryInfo(expense.category)
  const methodInfo = getPaymentMethodInfo(expense.paymentMethod)
  const CatIcon = catInfo.icon
  const MethodIcon = methodInfo.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Expense Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title & Status */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{expense.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Created {formatDate(expense.createdAt)}
              </p>
            </div>
            <Badge className={cn('text-xs', getExpenseStatusColor(expense.status))}>
              {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
            </Badge>
          </div>

          <Separator />

          {/* Amount */}
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(expense.amount)}</p>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Category</p>
              <div className="flex items-center gap-2">
                <CatIcon className={cn('h-4 w-4', catInfo.color)} />
                <span className="text-sm font-medium">{catInfo.label}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Payment Method</p>
              <div className="flex items-center gap-2">
                <MethodIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{methodInfo.label}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Date</p>
              <span className="text-sm font-medium">{formatDate(expense.date)}</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Created By</p>
              <span className="text-sm font-medium">
                {expense.creator?.name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm leading-relaxed">{expense.description}</p>
              </div>
            </>
          )}

          {/* Approver Info */}
          {expense.status !== 'pending' && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {expense.status === 'approved' ? 'Approved By' : 'Rejected By'}
                </p>
                <span className="text-sm font-medium">
                  {expense.approver?.name || 'Unknown'}
                </span>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Delete Confirmation
// ============================================================

function DeleteExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!expense) return
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense')
      toast.success('Expense deleted successfully')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{expense?.title}&rdquo;? This action cannot be undone.
            {expense?.status === 'approved' && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                Note: Approved expenses cannot be deleted.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || expense?.status === 'approved'}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================================================
// Loading Skeleton
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Category cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <Skeleton className="h-8 w-8 rounded-lg mx-auto mb-1.5" />
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-4 w-20 mx-auto mb-1" />
              <Skeleton className="h-2 w-10 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>

      {/* Table skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
        <Receipt className="h-8 w-8 text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No expenses found</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
        {hasFilters
          ? 'No expenses match your current filters. Try adjusting or clearing your filters.'
          : 'Get started by adding your first expense record.'}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      )}
    </motion.div>
  )
}

// ============================================================
// Main Expenses Module
// ============================================================

export function ExpensesModule() {
  const { currentUser } = useAppStore()

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categoryTotals, setCategoryTotals] = useState<Record<string, { total: number; count: number }>>({})
  const [monthlyData, setMonthlyData] = useState<{ month: string; amount: number }[]>([])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [viewExpense, setViewExpense] = useState<Expense | null>(null)
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null)

  // Show filters panel
  const [showFilters, setShowFilters] = useState(false)

  // Check if user can approve
  const canApprove = currentUser?.role === 'super_admin' || currentUser?.role === 'accountant' || currentUser?.role === 'principal'

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (filterCategory) params.set('category', filterCategory)
      if (filterStatus) params.set('status', filterStatus)
      if (filterPaymentMethod) params.set('paymentMethod', filterPaymentMethod)
      if (dateFrom) params.set('startDate', dateFrom.toISOString())
      if (dateTo) params.set('endDate', dateTo.toISOString())
      params.set('page', String(page))
      params.set('limit', String(pageSize))

      const res = await fetch(`/api/expenses?${params.toString()}`)
      const data = await res.json()

      if (data.success && data.data) {
        setExpenses(data.data as Expense[])
        setTotal(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterCategory, filterStatus, filterPaymentMethod, dateFrom, dateTo, page])

  // Fetch category totals (all expenses, unfiltered)
  const fetchCategoryTotals = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses?limit=1000&status=approved')
      const data = await res.json()
      if (data.success && data.data) {
        const totals: Record<string, { total: number; count: number }> = {}
        EXPENSE_CATEGORIES.forEach(c => { totals[c.value] = { total: 0, count: 0 } })
        ;(data.data as Expense[]).forEach((exp: Expense) => {
          if (!totals[exp.category]) totals[exp.category] = { total: 0, count: 0 }
          totals[exp.category].total += exp.amount
          totals[exp.category].count += 1
        })
        setCategoryTotals(totals)
      }
    } catch {
      // Silently fail for summary
    }
  }, [])

  // Fetch monthly data
  const fetchMonthlyData = useCallback(async () => {
    try {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const res = await fetch(`/api/expenses?limit=1000&status=approved&startDate=${sixMonthsAgo.toISOString()}`)
      const data = await res.json()
      if (data.success && data.data) {
        const monthlyMap: Record<string, number> = {}
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = d.toLocaleString('default', { month: 'short' })
          monthlyMap[key] = 0
        }
        ;(data.data as Expense[]).forEach((exp: Expense) => {
          const d = new Date(exp.date)
          const key = d.toLocaleString('default', { month: 'short' })
          if (key in monthlyMap) {
            monthlyMap[key] += exp.amount
          }
        })
        setMonthlyData(Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })))
      }
    } catch {
      // Silently fail for chart
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  useEffect(() => {
    fetchCategoryTotals()
    fetchMonthlyData()
  }, [fetchCategoryTotals, fetchMonthlyData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, filterCategory, filterStatus, filterPaymentMethod, dateFrom, dateTo])

  const totalPages = Math.ceil(total / pageSize)

  const handleApprove = async (expense: Expense, status: 'approved' | 'rejected') => {
    if (!currentUser) return
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          approvedBy: currentUser.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      toast.success(`Expense ${status === 'approved' ? 'approved' : 'rejected'} successfully`)
      fetchExpenses()
      fetchCategoryTotals()
      fetchMonthlyData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterCategory('')
    setFilterStatus('')
    setFilterPaymentMethod('')
    setDateFrom(undefined)
    setDateTo(undefined)
    setPage(1)
  }

  const hasFilters = !!(searchQuery || filterCategory || filterStatus || filterPaymentMethod || dateFrom || dateTo)

  // Compute totals for the current view
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingCount = expenses.filter(e => e.status === 'pending').length

  // Export handlers
  const fetchAllExpenses = async (): Promise<Expense[]> => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (filterCategory) params.set('category', filterCategory)
      if (filterStatus) params.set('status', filterStatus)
      if (filterPaymentMethod) params.set('paymentMethod', filterPaymentMethod)
      if (dateFrom) params.set('startDate', dateFrom.toISOString())
      if (dateTo) params.set('endDate', dateTo.toISOString())
      params.set('limit', '10000')
      const res = await fetch(`/api/expenses?${params.toString()}`)
      const data = await res.json()
      if (data.success && data.data) return data.data as Expense[]
    } catch {
      // fallback
    }
    return expenses
  }

  const handleExportExcel = async () => {
    const allExpenses = await fetchAllExpenses()
    if (!allExpenses.length) { toast.error('No data to export'); return }
    const exportData = allExpenses.map((e) => ({
      title: e.title,
      category: formatCategoryLabel(e.category),
      amount: formatCurrency(e.amount),
      paymentMethod: e.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      date: formatDate(e.date),
      status: e.status.charAt(0).toUpperCase() + e.status.slice(1),
      createdBy: e.creator?.name || 'Unknown',
      description: e.description || '',
    }))
    const totalExportAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0)
    exportToExcel(exportData, `MIBAM_Expenses_${new Date().toISOString().slice(0, 10)}`, {
      title: 'MIBAM Expense Report',
      headers: [
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount (UGX)' },
        { key: 'paymentMethod', label: 'Payment Method' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status' },
        { key: 'createdBy', label: 'Created By' },
        { key: 'description', label: 'Description' },
      ],
      summaryRows: [
        { label: 'Total Expenses', value: formatCurrency(totalExportAmount) },
        { label: 'Number of Records', value: String(allExpenses.length) },
      ],
    })
    toast.success('Excel export downloaded')
  }

  const handleExportPDF = async () => {
    const allExpenses = await fetchAllExpenses()
    if (!allExpenses.length) { toast.error('No data to export'); return }
    const totalExportAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0)
    const categoryTotalsExport: Record<string, number> = {}
    allExpenses.forEach((e) => {
      categoryTotalsExport[e.category] = (categoryTotalsExport[e.category] || 0) + e.amount
    })
    const exportData = allExpenses.map((e) => ({
      title: e.title,
      category: formatCategoryLabel(e.category),
      amount: formatCurrency(e.amount),
      paymentMethod: e.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      date: formatDate(e.date),
      status: e.status.charAt(0).toUpperCase() + e.status.slice(1),
      createdBy: e.creator?.name || 'Unknown',
    }))
    exportToPDF(exportData, `MIBAM_Expenses_${new Date().toISOString().slice(0, 10)}`, {
      title: 'MIBAM Expense Report',
      subtitle: `Expense Report - ${formatDate(new Date())}`,
      headers: [
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount (UGX)' },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status' },
        { key: 'createdBy', label: 'Created By' },
      ],
      summaryRows: [
        { label: 'Total Expenses', value: formatCurrency(totalExportAmount) },
        { label: 'Number of Records', value: String(allExpenses.length) },
        ...Object.entries(categoryTotalsExport).map(([cat, total]) => ({
          label: `${formatCategoryLabel(cat)} Total`,
          value: formatCurrency(total),
        })),
      ],
    })
    toast.success('PDF export opened')
  }

  const handleExportCSV = async () => {
    const allExpenses = await fetchAllExpenses()
    if (!allExpenses.length) { toast.error('No data to export'); return }
    const exportData = allExpenses.map((e) => ({
      title: e.title,
      category: formatCategoryLabel(e.category),
      amount: e.amount,
      paymentMethod: e.paymentMethod,
      date: formatDate(e.date),
      status: e.status,
      createdBy: e.creator?.name || 'Unknown',
      description: e.description || '',
    }))
    exportToCSV(exportData, `MIBAM_Expenses_${new Date().toISOString().slice(0, 10)}`, [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount (UGX)' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'createdBy', label: 'Created By' },
      { key: 'description', label: 'Description' },
    ])
    toast.success('CSV export downloaded')
  }

  if (loading && expenses.length === 0) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">
            Track and manage institutional expenses, approvals, and categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                Export to Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4 text-rose-600" />
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV}>
                <File className="mr-2 h-4 w-4 text-amber-600" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => { setEditingExpense(null); setFormOpen(true) }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </motion.div>

      {/* Category Summary Cards */}
      <CategorySummaryCards
        categoryTotals={categoryTotals}
        selectedCategory={filterCategory}
        onSelectCategory={(cat) => setFilterCategory(cat)}
      />

      {/* Monthly Trend Chart */}
      <MonthlyTrendChart data={monthlyData} />

      {/* Expenses Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="premium-card">
          <CardContent className="p-0">
            {/* Table Header with Search & Filters */}
            <div className="p-4 md:p-6 border-b space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                  <div className="relative flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant={showFilters ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(showFilters && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Page Total: <strong className="text-foreground">{formatCurrency(totalAmount)}</strong></span>
                  {pendingCount > 0 && (
                    <Badge variant="outline" className="ml-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                      {pendingCount} pending
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expandable Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                      {/* Status Filter */}
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_statuses">All Statuses</SelectItem>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Payment Method Filter */}
                      <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_methods">All Methods</SelectItem>
                          {PAYMENT_METHODS.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Date From */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('justify-start text-left font-normal', !dateFrom && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? formatDate(dateFrom) : 'From date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {/* Date To */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('justify-start text-left font-normal', !dateTo && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateTo ? formatDate(dateTo) : 'To date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {hasFilters && (
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
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {expenses.length === 0 ? (
                <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[200px]">Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Payment</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {expenses.map((expense, i) => {
                        const catInfo = getCategoryInfo(expense.category)
                        const CatIcon = catInfo.icon
                        const methodInfo = getPaymentMethodInfo(expense.paymentMethod)
                        const MethodIcon = methodInfo.icon

                        return (
                          <motion.tr
                            key={expense.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className="hover:bg-muted/50 border-b transition-colors"
                          >
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="truncate max-w-[180px]">{expense.title}</span>
                                <span className="text-xs text-muted-foreground md:hidden">
                                  {formatCurrency(expense.amount)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn('text-xs gap-1', getCategoryColor(expense.category))}
                              >
                                <CatIcon className="h-3 w-3" />
                                {catInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className="hidden md:inline">{formatCurrency(expense.amount)}</span>
                              <span className="md:hidden text-xs">{formatCurrency(expense.amount)}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-1.5">
                                <MethodIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{methodInfo.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {formatDate(expense.date)}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-xs', getExpenseStatusColor(expense.status))}>
                                {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Quick Approve/Reject for pending */}
                                {expense.status === 'pending' && canApprove && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                      onClick={() => handleApprove(expense, 'approved')}
                                      title="Approve"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                      onClick={() => handleApprove(expense, 'rejected')}
                                      title="Reject"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setViewExpense(expense)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    {expense.status === 'pending' && (
                                      <DropdownMenuItem onClick={() => { setEditingExpense(expense); setFormOpen(true) }}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                    )}
                                    {expense.status === 'pending' && canApprove && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleApprove(expense, 'approved')}
                                          className="text-emerald-600 dark:text-emerald-400"
                                        >
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleApprove(expense, 'rejected')}
                                          className="text-rose-600 dark:text-rose-400"
                                        >
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Reject
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteExpense(expense)}
                                      variant="destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total} expenses
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
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
                          className={cn('h-8 w-8 p-0', page === pageNum && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
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
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingExpense={editingExpense}
        onSuccess={() => {
          fetchExpenses()
          fetchCategoryTotals()
          fetchMonthlyData()
        }}
      />

      <ViewExpenseDialog
        open={!!viewExpense}
        onOpenChange={(open) => !open && setViewExpense(null)}
        expense={viewExpense}
      />

      <DeleteExpenseDialog
        open={!!deleteExpense}
        onOpenChange={(open) => !open && setDeleteExpense(null)}
        expense={deleteExpense}
        onSuccess={() => {
          fetchExpenses()
          fetchCategoryTotals()
          fetchMonthlyData()
        }}
      />
    </div>
  )
}
