'use client'

import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  UserPlus,
  DollarSign,
  FileDown,
  ArrowRight,
  Keyboard,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { PageType } from '@/lib/types'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

// ============================================================
// Navigation Items
// ============================================================

interface NavItem {
  id: PageType
  label: string
  icon: React.ElementType
  shortcut?: string
}

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, shortcut: '1' },
  { id: 'students', label: 'Go to Students', icon: Users, shortcut: '2' },
  { id: 'payments', label: 'Go to Payments', icon: CreditCard, shortcut: '3' },
  { id: 'expenses', label: 'Go to Expenses', icon: Receipt, shortcut: '4' },
  { id: 'cashbook', label: 'Go to Cashbook', icon: BookOpen, shortcut: '5' },
  { id: 'reports', label: 'Go to Reports', icon: BarChart3, shortcut: '6' },
  { id: 'settings', label: 'Go to Settings', icon: Settings, shortcut: '7' },
]

// ============================================================
// Action Items
// ============================================================

interface ActionItem {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  action: PageType
}

const actionItems: ActionItem[] = [
  { id: 'record-payment', label: 'Record Payment', icon: DollarSign, shortcut: '⌘N', action: 'payments' },
  { id: 'add-student', label: 'Add Student', icon: UserPlus, action: 'students' },
  { id: 'add-expense', label: 'Add Expense', icon: Receipt, action: 'expenses' },
  { id: 'export-reports', label: 'Export Reports', icon: FileDown, shortcut: '⌘E', action: 'reports' },
]

// ============================================================
// Page Label Map
// ============================================================

const pageLabels: Record<PageType, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  payments: 'Payments',
  expenses: 'Expenses',
  cashbook: 'Cashbook',
  reports: 'Reports',
  settings: 'Settings',
}

// ============================================================
// Command Palette Component
// ============================================================

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentPage,
    currentPage,
    recentPages,
  } = useAppStore()

  // Listen for Cmd+K / Ctrl+K
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      // Escape to close
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    },
    [commandPaletteOpen, setCommandPaletteOpen]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Handle navigation
  const runCommand = useCallback(
    (command: () => void) => {
      setCommandPaletteOpen(false)
      command()
    },
    [setCommandPaletteOpen]
  )

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <CommandDialog
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          title="Command Palette"
          description="Search for a command or navigate to a page..."
        >
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Recent Pages */}
            {recentPages.length > 0 && (
              <CommandGroup heading="Recent Pages">
                {recentPages.map((page) => {
                  const navItem = navigationItems.find((n) => n.id === page)
                  if (!navItem) return null
                  const Icon = navItem.icon
                  return (
                    <CommandItem
                      key={`recent-${page}`}
                      onSelect={() => runCommand(() => setCurrentPage(page))}
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{navItem.label}</span>
                      {page === currentPage && (
                        <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Current
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {/* Navigation Commands */}
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => runCommand(() => setCurrentPage(item.id))}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                    {item.id === currentPage && (
                      <ArrowRight className="ml-auto h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>

            <CommandSeparator />

            {/* Action Commands */}
            <CommandGroup heading="Actions">
              {actionItems.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => runCommand(() => setCurrentPage(item.action))}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>

            <CommandSeparator />

            {/* Keyboard Shortcuts */}
            <CommandGroup heading="Keyboard Shortcuts">
              <CommandItem onSelect={() => runCommand(() => setCommandPaletteOpen(true))}>
                <Keyboard className="h-4 w-4 text-muted-foreground" />
                <span>Open Command Palette</span>
                <CommandShortcut>⌘K</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setCurrentPage('payments'))}>
                <Keyboard className="h-4 w-4 text-muted-foreground" />
                <span>New Record (context-dependent)</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setCurrentPage('reports'))}>
                <Keyboard className="h-4 w-4 text-muted-foreground" />
                <span>Export Current View</span>
                <CommandShortcut>⌘E</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandPaletteOpen(false)
                  window.dispatchEvent(new CustomEvent('mibam-refresh'))
                }}
              >
                <Keyboard className="h-4 w-4 text-muted-foreground" />
                <span>Refresh Data</span>
                <CommandShortcut>⌘R</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      )}
    </AnimatePresence>
  )
}
