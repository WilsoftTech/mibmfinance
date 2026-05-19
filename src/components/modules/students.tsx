'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar as CalendarIcon2,
  GraduationCap,
  UserCircle,
  CreditCard,
  ArrowLeft,
  X,
  CalendarIcon,
  MoreHorizontal,
  Filter,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { formatCurrency, formatDate, getStudentStatusColor } from '@/lib/utils'
import type { Student, Course, AcademicYear, Gender, ProgramType, StudentStatus } from '@/lib/types'

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
const CalendarLucide = CalendarIcon2
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface StudentWithBalance extends Student {
  totalPaid: number
  balance: number
  course?: Course & { tuitionFee: number; duration: number }
  academicYear?: AcademicYear
  _count?: { payments: number }
}

interface StudentDetail extends Omit<Student, 'payments'> {
  financialSummary: {
    expectedTotal: number
    totalPaid: number
    balance: number
    paymentCount: number
  }
  course: Course
  academicYear: AcademicYear
  payments: Array<{
    id: string
    receiptNumber: string
    amount: number
    paymentMethod: string
    reference: string | null
    notes: string | null
    receivedAt: string
    receivedByUser: { id: string; name: string } | null
  }>
}

type SortField = 'studentId' | 'firstName' | 'gender' | 'course' | 'programType' | 'status' | 'balance'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'list' | 'profile'

interface FormData {
  firstName: string
  lastName: string
  gender: Gender | ''
  dateOfBirth: string
  courseId: string
  programType: ProgramType | ''
  intake: string
  academicYearId: string
  phoneNumber: string
  email: string
  guardianName: string
  guardianContact: string
  address: string
  status: StudentStatus
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  courseId: '',
  programType: '',
  intake: '',
  academicYearId: '',
  phoneNumber: '',
  email: '',
  guardianName: '',
  guardianContact: '',
  address: '',
  status: 'active',
}

const PAGE_SIZE = 10

const intakeOptions = ['January', 'May', 'September']

// ============================================================
// Main Component
// ============================================================

export function StudentsModule() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentWithBalance | null>(null)
  const [deleteStudent, setDeleteStudent] = useState<StudentWithBalance | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = () => setRefreshKey(k => k + 1)

  const handleViewStudent = (id: string) => {
    setSelectedStudentId(id)
    setViewMode('profile')
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedStudentId(null)
  }

  const handleAddStudent = () => {
    setEditingStudent(null)
    setShowFormDialog(true)
  }

  const handleEditStudent = (student: StudentWithBalance) => {
    setEditingStudent(student)
    setShowFormDialog(true)
  }

  const handleFormClose = () => {
    setShowFormDialog(false)
    setEditingStudent(null)
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <StudentListView
              onViewStudent={handleViewStudent}
              onAddStudent={handleAddStudent}
              onEditStudent={handleEditStudent}
              onDeleteStudent={setDeleteStudent}
              refreshKey={refreshKey}
            />
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <StudentProfileView
              studentId={selectedStudentId}
              onBack={handleBackToList}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Dialog */}
      <StudentFormDialog
        open={showFormDialog}
        onOpenChange={handleFormClose}
        editingStudent={editingStudent}
        onSuccess={triggerRefresh}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        student={deleteStudent}
        open={!!deleteStudent}
        onOpenChange={(open) => { if (!open) setDeleteStudent(null) }}
        onSuccess={triggerRefresh}
      />
    </div>
  )
}

// ============================================================
// Student List View
// ============================================================

interface StudentListViewProps {
  onViewStudent: (id: string) => void
  onAddStudent: () => void
  onEditStudent: (student: StudentWithBalance) => void
  onDeleteStudent: (student: StudentWithBalance) => void
  refreshKey?: number
}

function StudentListView({ onViewStudent, onAddStudent, onEditStudent, onDeleteStudent, refreshKey }: StudentListViewProps) {

  // Data state
  const [students, setStudents] = useState<StudentWithBalance[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterProgramType, setFilterProgramType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGender, setFilterGender] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Sort state
  const [sortField, setSortField] = useState<SortField>('studentId')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Fetch courses and academic years on mount
  useEffect(() => {
    async function fetchDropdownData() {
      try {
        const [coursesRes, yearsRes] = await Promise.all([
          fetch('/api/courses'),
          fetch('/api/academic-years'),
        ])
        const coursesData = await coursesRes.json()
        const yearsData = await yearsRes.json()
        if (coursesData.success) setCourses(coursesData.data || [])
        if (yearsData.success) setAcademicYears(yearsData.data || [])
      } catch {
        toast.error('Failed to load dropdown data')
      }
    }
    fetchDropdownData()
  }, [])

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (filterCourse && filterCourse !== 'all') params.set('courseId', filterCourse)
      if (filterProgramType && filterProgramType !== 'all') params.set('programType', filterProgramType)
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterGender && filterGender !== 'all') params.set('gender', filterGender)
      params.set('page', String(currentPage))
      params.set('limit', String(PAGE_SIZE))

      const res = await fetch(`/api/students?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setStudents(data.data || [])
        setTotalStudents(data.total || 0)
      } else {
        toast.error(data.error || 'Failed to fetch students')
      }
    } catch {
      toast.error('Network error fetching students')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterCourse, filterProgramType, filterStatus, filterGender, currentPage, refreshKey])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterCourse, filterProgramType, filterStatus, filterGender])

  // Sort students client-side
  const sortedStudents = React.useMemo(() => {
    const sorted = [...students]
    sorted.sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''

      switch (sortField) {
        case 'studentId':
          aVal = a.studentId
          bVal = b.studentId
          break
        case 'firstName':
          aVal = `${a.firstName} ${a.lastName}`
          bVal = `${b.firstName} ${b.lastName}`
          break
        case 'gender':
          aVal = a.gender
          bVal = b.gender
          break
        case 'course':
          aVal = a.course?.name || ''
          bVal = b.course?.name || ''
          break
        case 'programType':
          aVal = a.programType
          bVal = b.programType
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'balance':
          aVal = a.balance
          bVal = b.balance
          break
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })
    return sorted
  }, [students, sortField, sortDirection])

  const totalPages = Math.ceil(totalStudents / PAGE_SIZE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      : <ArrowDown className="ml-1 h-3 w-3 text-emerald-600 dark:text-emerald-400" />
  }

  const handleStudentEdited = () => {
    fetchStudents()
  }

  // Expose refresh function for parent
  // We'll handle this via the dialog callbacks

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-muted-foreground">
            Manage student records and enrollment information
          </p>
        </div>
        <Button onClick={onAddStudent} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="premium-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, student ID, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger className="w-[180px]" size="sm">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterProgramType} onValueChange={setFilterProgramType}>
                <SelectTrigger className="w-[150px]" size="sm">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="diploma">Diploma</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]" size="sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-[130px]" size="sm">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>

              {(filterCourse !== 'all' || filterProgramType !== 'all' || filterStatus !== 'all' || filterGender !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCourse('all')
                    setFilterProgramType('all')
                    setFilterStatus('all')
                    setFilterGender('all')
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${totalStudents} student${totalStudents !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card className="premium-card overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : sortedStudents.length === 0 ? (
            <EmptyState onAddStudent={onAddStudent} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('studentId')}
                    >
                      <span className="flex items-center">Student ID <SortIcon field="studentId" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('firstName')}
                    >
                      <span className="flex items-center">Name <SortIcon field="firstName" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('gender')}
                    >
                      <span className="flex items-center">Gender <SortIcon field="gender" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('course')}
                    >
                      <span className="flex items-center">Course <SortIcon field="course" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('programType')}
                    >
                      <span className="flex items-center">Program <SortIcon field="programType" /></span>
                    </TableHead>
                    <TableHead>Intake</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('balance')}
                    >
                      <span className="flex items-center">Balance <SortIcon field="balance" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('status')}
                    >
                      <span className="flex items-center">Status <SortIcon field="status" /></span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.map((student, index) => (
                    <TableRow
                      key={student.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      )}
                      onClick={() => onViewStudent(student.id)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {student.studentId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <span className="font-medium">{student.firstName} {student.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{student.gender}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{student.course?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          'text-xs capitalize',
                          student.programType === 'certificate'
                            ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400'
                            : 'border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400'
                        )}>
                          {student.programType}
                        </Badge>
                      </TableCell>
                      <TableCell>{student.intake}</TableCell>
                      <TableCell className="text-xs">{student.phoneNumber || '—'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-semibold text-sm',
                          student.balance === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {formatCurrency(student.balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs capitalize', getStudentStatusColor(student.status))}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewStudent(student.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditStudent(student)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Student
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteStudent(student)}
                              className="text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="icon"
                          className={cn(
                            'h-8 w-8',
                            currentPage === pageNum && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          )}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <MobileSkeleton />
        ) : sortedStudents.length === 0 ? (
          <EmptyState onAddStudent={onAddStudent} />
        ) : (
          <>
            {sortedStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="premium-card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onViewStudent(student.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold">{student.firstName} {student.lastName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{student.studentId}</p>
                        </div>
                      </div>
                      <Badge className={cn('text-xs capitalize', getStudentStatusColor(student.status))}>
                        {student.status}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Course</p>
                        <p className="font-medium truncate">{student.course?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Program</p>
                        <p className="font-medium capitalize">{student.programType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Intake</p>
                        <p className="font-medium">{student.intake}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Balance</p>
                        <p className={cn(
                          'font-semibold',
                          student.balance === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {formatCurrency(student.balance)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => onViewStudent(student.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => onEditStudent(student)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-rose-600 dark:text-rose-400 hover:text-rose-700"
                        onClick={() => onDeleteStudent(student)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Student Profile View
// ============================================================

interface StudentProfileViewProps {
  studentId: string | null
  onBack: () => void
}

function StudentProfileView({ studentId, onBack }: StudentProfileViewProps) {
  const { setCurrentPage } = useAppStore()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    async function fetchStudent() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/students/${studentId}`)
        const data = await res.json()
        if (data.success) {
          setStudent(data.data)
        } else {
          setError(data.error || 'Failed to load student')
        }
      } catch {
        setError('Network error loading student')
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [studentId])

  if (loading) return <ProfileSkeleton />
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-rose-600 dark:text-rose-400 mb-4">{error}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    )
  }
  if (!student) return null

  const { financialSummary } = student
  const paymentPercentage = financialSummary.expectedTotal > 0
    ? Math.round((financialSummary.totalPaid / financialSummary.expectedTotal) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      {/* Student Info Card */}
      <Card className="premium-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
              {student.firstName[0]}{student.lastName[0]}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold">{student.firstName} {student.lastName}</h3>
                <Badge className={cn('capitalize', getStudentStatusColor(student.status))}>
                  {student.status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {student.programType}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{student.studentId}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4">
                <InfoRow icon={GraduationCap} label="Course" value={student.course?.name || '—'} />
                <InfoRow icon={CalendarLucide} label="Intake" value={student.intake} />
                <InfoRow icon={UserCircle} label="Gender" value={student.gender} capitalize />
                <InfoRow icon={CalendarLucide} label="Date of Birth" value={student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'} />
                <InfoRow icon={Phone} label="Phone" value={student.phoneNumber || '—'} />
                <InfoRow icon={Mail} label="Email" value={student.email || '—'} />
                <InfoRow icon={UserCircle} label="Guardian" value={student.guardianName || '—'} />
                <InfoRow icon={Phone} label="Guardian Contact" value={student.guardianContact || '—'} />
                <InfoRow icon={MapPin} label="Address" value={student.address || '—'} />
                <InfoRow icon={CalendarLucide} label="Academic Year" value={student.academicYear?.name || '—'} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(financialSummary.expectedTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {student.course?.tuitionFee ? `${formatCurrency(student.course.tuitionFee)} × ${student.course.duration} semester(s)` : ''}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(financialSummary.totalPaid)}</p>
              <p className="text-xs text-muted-foreground mt-1">{paymentPercentage}% paid</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="premium-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn(
                'text-2xl font-bold',
                financialSummary.balance === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}>
                {formatCurrency(financialSummary.balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {financialSummary.balance === 0 ? 'Fully paid' : `${financialSummary.paymentCount} payment(s) made`}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payment Progress */}
      <Card className="premium-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Payment Progress</p>
            <p className="text-sm text-muted-foreground">{paymentPercentage}%</p>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                paymentPercentage >= 100 ? 'bg-emerald-500' : paymentPercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, paymentPercentage)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="premium-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Payment History</CardTitle>
              <CardDescription>{student.payments?.length || 0} payment(s) recorded</CardDescription>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
              onClick={() => setCurrentPage('payments')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!student.payments || student.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No payments recorded</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Click &quot;Record Payment&quot; to add a payment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.receiptNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(payment.receivedAt)}</TableCell>
                      <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {payment.paymentMethod.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{payment.receivedByUser?.name || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {payment.notes || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Student Form Dialog (Add/Edit)
// ============================================================

interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingStudent: StudentWithBalance | null
  onSuccess?: () => void
}

function StudentFormDialog({ open, onOpenChange, editingStudent, onSuccess }: StudentFormDialogProps) {
  const { currentUser } = useAppStore()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [dobOpen, setDobOpen] = useState(false)

  // Fetch dropdown data
  useEffect(() => {
    async function fetchDropdownData() {
      try {
        const [coursesRes, yearsRes] = await Promise.all([
          fetch('/api/courses'),
          fetch('/api/academic-years'),
        ])
        const coursesData = await coursesRes.json()
        const yearsData = await yearsRes.json()
        if (coursesData.success) setCourses(coursesData.data || [])
        if (yearsData.success) setAcademicYears(yearsData.data || [])
      } catch {
        // Silent fail for dropdown data
      }
    }
    if (open) fetchDropdownData()
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (editingStudent) {
      setFormData({
        firstName: editingStudent.firstName,
        lastName: editingStudent.lastName,
        gender: editingStudent.gender,
        dateOfBirth: editingStudent.dateOfBirth ? editingStudent.dateOfBirth.split('T')[0] : '',
        courseId: editingStudent.courseId,
        programType: editingStudent.programType,
        intake: editingStudent.intake,
        academicYearId: editingStudent.academicYearId,
        phoneNumber: editingStudent.phoneNumber || '',
        email: editingStudent.email || '',
        guardianName: editingStudent.guardianName || '',
        guardianContact: editingStudent.guardianContact || '',
        address: editingStudent.address || '',
        status: editingStudent.status,
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
  }, [editingStudent, open])

  // Auto-set programType when course changes
  const handleCourseChange = (courseId: string) => {
    const selectedCourse = courses.find(c => c.id === courseId)
    setFormData(prev => ({
      ...prev,
      courseId,
      programType: selectedCourse?.programType || '',
    }))
    // Clear course error
    if (errors.courseId) {
      setErrors(prev => ({ ...prev, courseId: undefined }))
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.gender) newErrors.gender = 'Gender is required'
    if (!formData.courseId) newErrors.courseId = 'Course is required'
    if (!formData.programType) newErrors.programType = 'Program type is required'
    if (!formData.intake) newErrors.intake = 'Intake is required'
    if (!formData.academicYearId) newErrors.academicYearId = 'Academic year is required'

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || null,
        phoneNumber: formData.phoneNumber || null,
        email: formData.email || null,
        guardianName: formData.guardianName || null,
        guardianContact: formData.guardianContact || null,
        address: formData.address || null,
        createdBy: currentUser?.id,
        updatedBy: currentUser?.id,
      }

      if (editingStudent) {
        // Update
        const res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Student updated successfully')
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(data.error || 'Failed to update student')
        }
      } else {
        // Create
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('Student created successfully')
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(data.error || 'Failed to create student')
        }
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          <DialogDescription>
            {editingStudent
              ? `Update information for ${editingStudent.firstName} ${editingStudent.lastName}`
              : 'Fill in the student details to register a new student'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Personal Information */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="Enter first name"
                  className={errors.firstName ? 'border-rose-500' : ''}
                />
                {errors.firstName && <p className="text-xs text-rose-500">{errors.firstName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className={errors.lastName ? 'border-rose-500' : ''}
                />
                {errors.lastName && <p className="text-xs text-rose-500">{errors.lastName}</p>}
              </div>

              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(v) => updateField('gender', v)}>
                  <SelectTrigger className={cn('w-full', errors.gender ? 'border-rose-500' : '')}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-rose-500">{errors.gender}</p>}
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Popover open={dobOpen} onOpenChange={setDobOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.dateOfBirth && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                      onSelect={(date) => {
                        updateField('dateOfBirth', date ? date.toISOString().split('T')[0] : '')
                        setDobOpen(false)
                      }}
                      defaultMonth={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date(2000, 0)}
                      captionLayout="dropdown"
                      fromYear={1960}
                      toYear={2010}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* Academic Information */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Academic Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Select value={formData.courseId} onValueChange={handleCourseChange}>
                  <SelectTrigger className={cn('w-full', errors.courseId ? 'border-rose-500' : '')}>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.courseId && <p className="text-xs text-rose-500">{errors.courseId}</p>}
              </div>

              <div className="space-y-2">
                <Label>Program Type *</Label>
                <Select value={formData.programType} onValueChange={(v) => updateField('programType', v)} disabled>
                  <SelectTrigger className={cn('w-full', errors.programType ? 'border-rose-500' : '')}>
                    <SelectValue placeholder="Auto-selected from course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="diploma">Diploma</SelectItem>
                  </SelectContent>
                </Select>
                {errors.programType && <p className="text-xs text-rose-500">{errors.programType}</p>}
                <p className="text-xs text-muted-foreground">Auto-filled based on course selection</p>
              </div>

              <div className="space-y-2">
                <Label>Intake *</Label>
                <Select value={formData.intake} onValueChange={(v) => updateField('intake', v)}>
                  <SelectTrigger className={cn('w-full', errors.intake ? 'border-rose-500' : '')}>
                    <SelectValue placeholder="Select intake" />
                  </SelectTrigger>
                  <SelectContent>
                    {intakeOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.intake && <p className="text-xs text-rose-500">{errors.intake}</p>}
              </div>

              <div className="space-y-2">
                <Label>Academic Year *</Label>
                <Select value={formData.academicYearId} onValueChange={(v) => updateField('academicYearId', v)}>
                  <SelectTrigger className={cn('w-full', errors.academicYearId ? 'border-rose-500' : '')}>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.active ? '(Active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.academicYearId && <p className="text-xs text-rose-500">{errors.academicYearId}</p>}
              </div>

              {editingStudent && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  placeholder="e.g. +256 700 123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="e.g. student@email.com"
                  className={errors.email ? 'border-rose-500' : ''}
                />
                {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianName">Guardian Name</Label>
                <Input
                  id="guardianName"
                  value={formData.guardianName}
                  onChange={(e) => updateField('guardianName', e.target.value)}
                  placeholder="Parent/Guardian name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianContact">Guardian Contact</Label>
                <Input
                  id="guardianContact"
                  value={formData.guardianContact}
                  onChange={(e) => updateField('guardianContact', e.target.value)}
                  placeholder="Guardian phone number"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Home address / District"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {editingStudent ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingStudent ? 'Update Student' : 'Create Student'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Delete Confirmation Dialog
// ============================================================

interface DeleteConfirmDialogProps {
  student: StudentWithBalance | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function DeleteConfirmDialog({ student, open, onOpenChange, onSuccess }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!student) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Student deleted successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(data.error || 'Failed to delete student')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Student</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{student?.firstName} {student?.lastName}</strong> ({student?.studentId})?
            This action cannot be undone. Students with existing payment records cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {deleting ? 'Deleting...' : 'Delete Student'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================================================
// Helper Components
// ============================================================

function InfoRow({
  icon: Icon,
  label,
  value,
  capitalize = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn('font-medium', capitalize && 'capitalize')}>{value}</span>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  )
}

function MobileSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="premium-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Card className="premium-card">
        <CardContent className="p-6">
          <div className="flex gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-2 mt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="premium-card">
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onAddStudent }: { onAddStudent: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground">No students found</h3>
      <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
        Try adjusting your search or filters, or add a new student to get started.
      </p>
      <Button
        onClick={onAddStudent}
        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Student
      </Button>
    </div>
  )
}
