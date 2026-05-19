// ============================================================
// MIBAM Finance Management System - Type Definitions
// ============================================================

// Navigation
export type PageType =
  | 'dashboard'
  | 'students'
  | 'payments'
  | 'expenses'
  | 'cashbook'
  | 'reports'
  | 'settings';

// User Roles
export type UserRole = 'super_admin' | 'principal' | 'accountant' | 'bursar' | 'staff_viewer';

// Payment Methods
export type PaymentMethod = 'cash' | 'bank' | 'mobile_money';

// Expense Categories
export type ExpenseCategory =
  | 'salaries'
  | 'utilities'
  | 'maintenance'
  | 'stationery'
  | 'fuel'
  | 'internet'
  | 'marketing'
  | 'rent'
  | 'miscellaneous';

// Expense Status
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

// Student Status
export type StudentStatus = 'active' | 'suspended' | 'graduated' | 'withdrawn';

// Program Types
export type ProgramType = 'certificate' | 'diploma';

// Gender
export type Gender = 'male' | 'female';

// ============================================================
// Entity Interfaces
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear?: AcademicYear;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  programType: ProgramType;
  duration: number;
  tuitionFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string | null;
  courseId: string;
  programType: ProgramType;
  intake: string;
  academicYearId: string;
  semesterId: string | null;
  phoneNumber: string | null;
  email: string | null;
  guardianName: string | null;
  guardianContact: string | null;
  address: string | null;
  photo: string | null;
  status: StudentStatus;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
  course?: Course;
  academicYear?: AcademicYear;
  semester?: Semester;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  receiptNumber: string;
  studentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference: string | null;
  semester: string | null;
  academicYear: string | null;
  notes: string | null;
  receivedBy: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  receivedByUser?: User;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  description: string | null;
  receiptImage: string | null;
  date: string;
  approvedBy: string | null;
  status: ExpenseStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approver?: User | null;
  creator?: User;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: User;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  pendingExpenses: number;
  paymentsThisMonth: number;
  expensesThisMonth: number;
  revenueGrowth: number;
  expenseGrowth: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  count: number;
  total: number;
  percentage: number;
}

export interface ExpenseCategoryBreakdown {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface CourseRevenueData {
  courseName: string;
  courseCode: string;
  studentCount: number;
  totalRevenue: number;
  expectedRevenue: number;
  collectionRate: number;
}

// ============================================================
// Report Types
// ============================================================

export interface ReportFilters {
  dateFrom: string | null;
  dateTo: string | null;
  academicYear: string | null;
  semester: string | null;
  course: string | null;
  paymentMethod: PaymentMethod | null;
  expenseCategory: ExpenseCategory | null;
}

export interface CashbookEntry {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  reference: string;
  category: string;
}

export interface CashbookSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  openingBalance: number;
  closingBalance: number;
}

export interface StudentStatement {
  student: Student;
  payments: Payment[];
  totalPaid: number;
  balance: number;
  expectedTotal: number;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// Navigation Item
// ============================================================

export interface NavigationItem {
  id: PageType;
  label: string;
  icon: string; // Lucide icon name
  badge?: number;
}
