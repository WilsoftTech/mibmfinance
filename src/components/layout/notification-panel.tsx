'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Receipt,
  Check,
  X,
  Trash2,
  BellOff,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// ============================================================
// Types
// ============================================================

type NotificationType = 'payment_received' | 'expense_pending' | 'expense_approved' | 'student_enrolled' | 'balance_overdue'

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  read: boolean
}

// ============================================================
// Helpers
// ============================================================

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'payment_received': return { icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' }
    case 'expense_pending': return { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' }
    case 'expense_approved': return { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' }
    case 'student_enrolled': return { icon: UserPlus, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30' }
    case 'balance_overdue': return { icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' }
    default: return { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' }
  }
}

// Generate simulated notifications from recent data
function generateNotifications(): Notification[] {
  const now = new Date()
  return [
    {
      id: 'n1',
      type: 'payment_received',
      title: 'Payment Received',
      description: 'Payment of UGX 1,500,000 received from Nakamya Sarah',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'n2',
      type: 'expense_pending',
      title: 'Expense Pending Approval',
      description: 'Expense "Monthly internet subscription" pending approval',
      timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'n3',
      type: 'student_enrolled',
      title: 'New Student Enrolled',
      description: 'New student Mugisha David enrolled in Diploma in Business Administration',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'n4',
      type: 'expense_approved',
      title: 'Expense Approved',
      description: 'Expense "Staff salary advance" approved by Turyahabwe Joshua',
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'n5',
      type: 'payment_received',
      title: 'Payment Received',
      description: 'Payment of UGX 800,000 received from Atuhaire Grace',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'n6',
      type: 'balance_overdue',
      title: 'Outstanding Balance',
      description: 'Ainemukama Peter has outstanding balance of UGX 2,300,000',
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'n7',
      type: 'expense_pending',
      title: 'Expense Pending Approval',
      description: 'Expense "Office supplies purchase" pending approval',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
  ]
}

// ============================================================
// Notification Panel Component
// ============================================================

export function NotificationPanel() {
  const { setNotifications } = useAppStore()
  const [notifications, setLocalNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch / generate notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      // In production, this would be an API call
      // For now, generate from recent data
      const res = await fetch('/api/payments?limit=5')
      let notifs = generateNotifications()

      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data && json.data.length > 0) {
          // Add real payment notifications
          const paymentNotifs: Notification[] = json.data.slice(0, 3).map((p: Record<string, unknown>, i: number) => ({
            id: `real-pay-${i}`,
            type: 'payment_received' as NotificationType,
            title: 'Payment Received',
            description: `Payment of UGX ${(p.amount as number).toLocaleString()} received from ${p.student?.name || 'a student'}`,
            timestamp: p.receivedAt as string || p.createdAt as string || new Date().toISOString(),
            read: i > 0,
          }))
          // Replace the first generated payment notifications with real ones
          notifs = [...paymentNotifs, ...notifs.filter(n => n.type !== 'payment_received')].slice(0, 8)
        }
      }
      setLocalNotifications(notifs)
      setNotifications(notifs.filter(n => !n.read).length)
    } catch {
      setLocalNotifications(generateNotifications())
    } finally {
      setLoading(false)
    }
  }, [setNotifications])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = (id: string) => {
    setLocalNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setNotifications(Math.max(0, unreadCount - 1))
  }

  const handleMarkAllAsRead = () => {
    setLocalNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
    setNotifications(0)
  }

  const handleDismiss = (id: string) => {
    setLocalNotifications(prev => prev.filter(n => n.id !== id))
    const wasUnread = notifications.find(n => n.id === id && !n.read)
    if (wasUnread) {
      setNotifications(Math.max(0, unreadCount - 1))
    }
  }

  return (
    <div className="w-[360px] sm:w-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
              onClick={handleMarkAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {/* Notifications List */}
      <ScrollArea className="max-h-[400px]">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-2.5 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BellOff className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="py-1">
            <AnimatePresence initial={false}>
              {notifications.map((notification, index) => {
                const iconConfig = getNotificationIcon(notification.type)
                const Icon = iconConfig.icon

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className={cn(
                      'relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer group',
                      !notification.read && 'bg-emerald-50/50 dark:bg-emerald-950/10'
                    )}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-500" />
                    )}

                    {/* Icon */}
                    <div className={cn('shrink-0 flex h-9 w-9 items-center justify-center rounded-full', iconConfig.bg)}>
                      <Icon className={cn('h-4 w-4', iconConfig.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm leading-tight', !notification.read ? 'font-semibold' : 'font-medium text-foreground/80')}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handleDismiss(notification.id) }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatRelativeTime(notification.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-3 text-center">
            <Button variant="ghost" size="sm" className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 w-full">
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
