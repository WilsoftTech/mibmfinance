import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

function getDateRange(period: string, dateStr?: string) {
  const now = new Date();

  if (dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    switch (period) {
      case 'daily': {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        return { start, end, label: d.toLocaleDateString() };
      }
      case 'weekly': {
        const dayOfWeek = d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end, label: `Week of ${start.toLocaleDateString()}` };
      }
      case 'monthly': {
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        return { start, end, label: `${start.toLocaleString('default', { month: 'long', year: 'numeric' })}` };
      }
      case 'annual': {
        const start = new Date(d.getFullYear(), 0, 1);
        const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59);
        return { start, end, label: `${d.getFullYear()}` };
      }
      default:
        return null;
    }
  }

  // Default to current period
  switch (period) {
    case 'daily': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: now.toLocaleDateString() };
    }
    case 'weekly': {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: `Week of ${start.toLocaleDateString()}` };
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end, label: `${start.toLocaleString('default', { month: 'long', year: 'numeric' })}` };
    }
    case 'annual': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { start, end, label: `${now.getFullYear()}` };
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'cash-flow'; // student-balances, fees-collection, expense, cash-flow
    const period = searchParams.get('period') || 'monthly'; // daily, weekly, monthly, annual
    const date = searchParams.get('date') || '';

    const dateRange = getDateRange(period, date);
    if (!dateRange) {
      return errorResponse('Invalid period or date. Period must be: daily, weekly, monthly, annual');
    }

    const { start, end, label } = dateRange;

    switch (type) {
      case 'student-balances': {
        return await getStudentBalancesReport(start, end, label);
      }
      case 'fees-collection': {
        return await getFeesCollectionReport(start, end, label);
      }
      case 'expense': {
        return await getExpenseReport(start, end, label);
      }
      case 'cash-flow':
      default: {
        return await getCashFlowReport(start, end, label);
      }
    }
  } catch (error) {
    console.error('Reports API error:', error);
    return errorResponse('Failed to generate report', 500);
  }
}

async function getStudentBalancesReport(start: Date, end: Date, label: string) {
  // Get students enrolled within or active during the period
  const students = await db.student.findMany({
    where: {
      enrolledAt: { lte: end },
      status: { in: ['active', 'suspended'] },
    },
    include: {
      course: { select: { name: true, code: true, tuitionFee: true, duration: true } },
      payments: {
        where: { receivedAt: { lte: end } },
        select: { amount: true },
      },
    },
  });

  const studentBalances = students.map((student) => {
    const expectedTotal = student.course.tuitionFee * student.course.duration;
    const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = expectedTotal - totalPaid;

    return {
      studentId: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      course: student.course.name,
      courseCode: student.course.code,
      programType: student.programType,
      expectedTotal,
      totalPaid,
      balance: Math.max(0, balance),
      status: student.status,
    };
  });

  const totalExpected = studentBalances.reduce((sum, s) => sum + s.expectedTotal, 0);
  const totalPaid = studentBalances.reduce((sum, s) => sum + s.totalPaid, 0);
  const totalOutstanding = studentBalances.reduce((sum, s) => sum + s.balance, 0);

  // Group by course
  const byCourse = studentBalances.reduce((acc, s) => {
    if (!acc[s.course]) {
      acc[s.course] = { course: s.course, code: s.courseCode, students: 0, expected: 0, paid: 0, outstanding: 0 };
    }
    acc[s.course].students++;
    acc[s.course].expected += s.expectedTotal;
    acc[s.course].paid += s.totalPaid;
    acc[s.course].outstanding += s.balance;
    return acc;
  }, {} as Record<string, { course: string; code: string; students: number; expected: number; paid: number; outstanding: number }>);

  return successResponse({
    type: 'student-balances',
    period: label,
    generatedAt: new Date().toISOString(),
    summary: {
      totalStudents: studentBalances.length,
      totalExpected,
      totalPaid,
      totalOutstanding,
      collectionRate: totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(1) : '0',
    },
    byCourse: Object.values(byCourse),
    students: studentBalances,
  });
}

async function getFeesCollectionReport(start: Date, end: Date, label: string) {
  const payments = await db.payment.findMany({
    where: {
      receivedAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      student: {
        select: {
          studentId: true,
          firstName: true,
          lastName: true,
          course: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { receivedAt: 'desc' },
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  // Group by payment method
  const byMethod = payments.reduce((acc, p) => {
    if (!acc[p.paymentMethod]) {
      acc[p.paymentMethod] = { method: p.paymentMethod, count: 0, total: 0 };
    }
    acc[p.paymentMethod].count++;
    acc[p.paymentMethod].total += p.amount;
    return acc;
  }, {} as Record<string, { method: string; count: number; total: number }>);

  // Group by course
  const byCourse = payments.reduce((acc, p) => {
    const courseName = p.student.course.name;
    if (!acc[courseName]) {
      acc[courseName] = { course: courseName, code: p.student.course.code, count: 0, total: 0 };
    }
    acc[courseName].count++;
    acc[courseName].total += p.amount;
    return acc;
  }, {} as Record<string, { course: string; code: string; count: number; total: number }>);

  // Daily breakdown within period
  const dailyBreakdown: Record<string, { date: string; total: number; count: number }> = {};
  for (const p of payments) {
    const dayKey = new Date(p.receivedAt).toLocaleDateString();
    if (!dailyBreakdown[dayKey]) {
      dailyBreakdown[dayKey] = { date: dayKey, total: 0, count: 0 };
    }
    dailyBreakdown[dayKey].total += p.amount;
    dailyBreakdown[dayKey].count++;
  }

  return successResponse({
    type: 'fees-collection',
    period: label,
    generatedAt: new Date().toISOString(),
    summary: {
      totalCollected,
      totalTransactions: payments.length,
      averagePayment: payments.length > 0 ? totalCollected / payments.length : 0,
    },
    byMethod: Object.values(byMethod),
    byCourse: Object.values(byCourse),
    dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    payments: payments.map((p) => ({
      receiptNumber: p.receiptNumber,
      studentId: p.student.studentId,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      course: p.student.course.name,
      amount: p.amount,
      method: p.paymentMethod,
      reference: p.reference,
      date: p.receivedAt,
    })),
  });
}

async function getExpenseReport(start: Date, end: Date, label: string) {
  const expenses = await db.expense.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      creator: { select: { name: true } },
      approver: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  const approvedExpenses = expenses.filter((e) => e.status === 'approved');
  const pendingExpenses = expenses.filter((e) => e.status === 'pending');
  const rejectedExpenses = expenses.filter((e) => e.status === 'rejected');

  const totalApproved = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Group by category
  const byCategory = approvedExpenses.reduce((acc, e) => {
    if (!acc[e.category]) {
      acc[e.category] = { category: e.category, count: 0, total: 0 };
    }
    acc[e.category].count++;
    acc[e.category].total += e.amount;
    return acc;
  }, {} as Record<string, { category: string; count: number; total: number }>);

  // Group by payment method
  const byMethod = approvedExpenses.reduce((acc, e) => {
    if (!acc[e.paymentMethod]) {
      acc[e.paymentMethod] = { method: e.paymentMethod, count: 0, total: 0 };
    }
    acc[e.paymentMethod].count++;
    acc[e.paymentMethod].total += e.amount;
    return acc;
  }, {} as Record<string, { method: string; count: number; total: number }>);

  return successResponse({
    type: 'expense',
    period: label,
    generatedAt: new Date().toISOString(),
    summary: {
      totalExpenses: totalApproved,
      totalPending,
      totalRejected: rejectedExpenses.reduce((sum, e) => sum + e.amount, 0),
      approvedCount: approvedExpenses.length,
      pendingCount: pendingExpenses.length,
      rejectedCount: rejectedExpenses.length,
    },
    byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
    byMethod: Object.values(byMethod),
    expenses: expenses.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      method: e.paymentMethod,
      status: e.status,
      createdBy: e.creator.name,
      approvedBy: e.approver?.name || null,
      date: e.date,
    })),
  });
}

async function getCashFlowReport(start: Date, end: Date, label: string) {
  // Get income
  const payments = await db.payment.findMany({
    where: { receivedAt: { gte: start, lte: end } },
    select: { amount: true, paymentMethod: true, receivedAt: true },
  });

  // Get approved expenses
  const expenses = await db.expense.findMany({
    where: { date: { gte: start, lte: end }, status: 'approved' },
    select: { amount: true, category: true, paymentMethod: true, date: true },
  });

  const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashFlow = totalIncome - totalExpenses;

  // Income by method
  const incomeByMethod = payments.reduce((acc, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
    return acc;
  }, {} as Record<string, number>);

  // Expenses by category
  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  // Previous balance
  const previousIncome = await db.payment.aggregate({
    _sum: { amount: true },
    where: { receivedAt: { lt: start } },
  });
  const previousExpenses = await db.expense.aggregate({
    _sum: { amount: true },
    where: { date: { lt: start }, status: 'approved' },
  });
  const openingBalance = (previousIncome._sum.amount || 0) - (previousExpenses._sum.amount || 0);
  const closingBalance = openingBalance + netCashFlow;

  return successResponse({
    type: 'cash-flow',
    period: label,
    generatedAt: new Date().toISOString(),
    summary: {
      openingBalance,
      totalIncome,
      totalExpenses,
      netCashFlow,
      closingBalance,
      incomeTransactions: payments.length,
      expenseTransactions: expenses.length,
    },
    income: {
      total: totalIncome,
      byMethod: incomeByMethod,
    },
    expenses: {
      total: totalExpenses,
      byCategory: expensesByCategory,
    },
  });
}
