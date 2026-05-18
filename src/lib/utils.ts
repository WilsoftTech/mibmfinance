import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Ugandan Shillings (UGX) with commas
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a date string or Date object nicely
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM dd, yyyy')
}

/**
 * Format a date string or Date object with time
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM dd, yyyy HH:mm')
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Generate a MIBAM student ID
 * Format: MIBAM/YYYY/NNN
 */
export function generateStudentId(index: number): string {
  const year = new Date().getFullYear()
  const sequential = String(index).padStart(3, '0')
  return `MIBAM/${year}/${sequential}`
}

/**
 * Generate a receipt number
 * Format: RCT-YYYY-NNNN
 */
export function generateReceiptNumber(index: number): string {
  const year = new Date().getFullYear()
  const sequential = String(index).padStart(4, '0')
  return `RCT-${year}-${sequential}`
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * Format a number with commas (no currency)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100 * 100) / 100
}

/**
 * Get a color for an expense category
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    salaries: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    utilities: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    maintenance: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    stationery: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    fuel: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    internet: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    rent: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    miscellaneous: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return colors[category] || colors.miscellaneous
}

/**
 * Get a color for payment method
 */
export function getPaymentMethodColor(method: string): string {
  const colors: Record<string, string> = {
    cash: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    bank: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    mobile_money: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return colors[method] || 'bg-gray-100 text-gray-800'
}

/**
 * Get status color for expense
 */
export function getExpenseStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get status color for student
 */
export function getStudentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    suspended: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    graduated: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
