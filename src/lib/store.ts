import { create } from 'zustand'
import type { PageType, User } from '@/lib/types'

interface AppState {
  // Navigation
  currentPage: PageType
  setCurrentPage: (page: PageType) => void

  // Sidebar
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void

  // User
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  logout: () => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // Notifications
  notifications: number
  setNotifications: (count: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Sidebar
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // User
  currentUser: {
    id: '1',
    email: 'admin@mibam.ac.ug',
    name: 'Turyahabwe Joshua',
    role: 'super_admin',
    avatar: null,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null, currentPage: 'dashboard' }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  // Notifications
  notifications: 3,
  setNotifications: (count) => set({ notifications: count }),
}))
