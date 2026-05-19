'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { PageType } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getInitials } from '@/lib/utils'

interface NavItem {
  id: PageType
  label: string
  icon: React.ElementType
}

const navigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'cashbook', label: 'Cashbook', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, currentUser } = useAppStore()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen sticky top-0 border-r border-border bg-card transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-bold text-sm tracking-tight text-foreground">MIBAM</h1>
                <p className="text-[10px] text-muted-foreground leading-tight">Finance System</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = currentPage === item.id
            const Icon = item.icon

            const button = (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'group flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-[18px] h-[18px] shrink-0 transition-colors',
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 w-[3px] h-6 rounded-r-full bg-emerald-600 dark:bg-emerald-400"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            )

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <React.Fragment key={item.id}>{button}</React.Fragment>
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-border p-3">
          <div
            className={cn(
              'flex items-center gap-3',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs font-semibold">
                {currentUser ? getInitials(currentUser.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!sidebarCollapsed && currentUser && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center h-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft
              className={cn(
                'w-4 h-4 transition-transform duration-300',
                sidebarCollapsed && 'rotate-180'
              )}
            />
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

// Mobile sidebar using Sheet
export function MobileSidebar() {
  const { currentPage, setCurrentPage, mobileSidebarOpen, setMobileSidebarOpen, currentUser } = useAppStore()

  return (
    <>
      {/* Sheet overlay sidebar for mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:hidden',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-600 text-white shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-foreground">MIBAM</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Finance System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPage === item.id
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id)
                  setMobileSidebarOpen(false)
                }}
                className={cn(
                  'group flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-[18px] h-[18px] shrink-0',
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 w-[3px] h-6 rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
                )}
              </button>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs font-semibold">
                {currentUser ? getInitials(currentUser.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            {currentUser && (
              <div>
                <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {currentUser.role.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
