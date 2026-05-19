import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PageType, User } from '@/lib/types'

interface AppState {
  // Navigation
  currentPage: PageType
  setCurrentPage: (page: PageType) => void
  recentPages: PageType[]
  addToRecentPages: (page: PageType) => void

  // Sidebar
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void

  // User
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  logout: () => void

  // Hydration — true once localStorage values are loaded
  _hasHydrated: boolean
  setHasHydrated: (val: boolean) => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // Command Palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void

  // Notifications
  notifications: number
  setNotifications: (count: number) => void

  // Quick Stats
  quickStats: {
    totalStudents: number
    todayCollections: number
    pendingExpenses: number
    netBalance: number
  }
  setQuickStats: (stats: AppState['quickStats']) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Navigation
      currentPage: 'dashboard',
      setCurrentPage: (page) => set((state) => {
        const updatedRecent = [page, ...state.recentPages.filter(p => p !== page)].slice(0, 5)
        return { currentPage: page, recentPages: updatedRecent }
      }),
      recentPages: [],
      addToRecentPages: (page) => set((state) => {
        const updatedRecent = [page, ...state.recentPages.filter(p => p !== page)].slice(0, 5)
        return { recentPages: updatedRecent }
      }),

      // Sidebar
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      // User — starts null; restored from localStorage on hydration
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null, currentPage: 'dashboard' }),

      // Hydration
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),

      // Command Palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      // Notifications
      notifications: 0,
      setNotifications: (count) => set({ notifications: count }),

      // Quick Stats
      quickStats: {
        totalStudents: 0,
        todayCollections: 0,
        pendingExpenses: 0,
        netBalance: 0,
      },
      setQuickStats: (stats) => set({ quickStats: stats }),
    }),
    {
      name: 'mibam-app-storage',
      // Only persist auth + UI preferences; ephemeral state is always reset
      partialize: (state) => ({
        currentUser: state.currentUser,
        sidebarCollapsed: state.sidebarCollapsed,
        currentPage: state.currentPage,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
