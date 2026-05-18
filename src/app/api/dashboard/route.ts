import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // Total students
    const totalStudents = await db.student.count();
    const activeStudents = await db.student.count({ where: { status: 'active' } });

    // Total fees collected (all time)
    const totalFeesResult = await db.payment.aggregate({
      _sum: { amount: true },
    });
    const totalFeesCollected = totalFeesResult._sum.amount || 0;

    // Calculate outstanding balances + top outstanding students
    const students = await db.student.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        courseId: true,
        course: { select: { id: true, name: true, code: true, tuitionFee: true, duration: true } },
      },
    });

    const courseIds = [...new Set(students.map((s) => s.courseId))];
    const courses = await db.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, tuitionFee: true, duration: true },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const paymentsPerStudent = await db.payment.groupBy({
      by: ['studentId'],
      _sum: { amount: true },
    });
    const paidMap = new Map(paymentsPerStudent.map((p) => [p.studentId, p._sum.amount || 0]));

    let outstandingBalances = 0;
    const studentsBalanceList: { id: string; firstName: string; lastName: string; studentId: string; courseName: string; paid: number; balance: number }[] = [];

    for (const student of students) {
      const course = courseMap.get(student.courseId) || student.course;
      if (course) {
        const expectedTotal = course.tuitionFee * course.duration;
        const paid = paidMap.get(student.id) || 0;
        const balance = expectedTotal - paid;
        if (balance > 0) {
          outstandingBalances += balance;
        }
        studentsBalanceList.push({
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
          courseName: student.course?.name || 'Unknown',
          paid,
          balance: Math.max(0, balance),
        });
      }
    }

    // Top 5 students with highest outstanding balances
    const topOutstandingStudents = studentsBalanceList
      .filter((s) => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    // Monthly revenue (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyRevenueResult = await db.payment.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: monthStart, lte: monthEnd } },
    });
    const monthlyRevenue = monthlyRevenueResult._sum.amount || 0;

    // Monthly expenses (current month)
    const monthlyExpensesResult = await db.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: monthStart, lte: monthEnd }, status: 'approved' },
    });
    const monthlyExpenses = monthlyExpensesResult._sum.amount || 0;

    const netIncome = monthlyRevenue - monthlyExpenses;

    // Previous month for growth calculation
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [prevRevenueResult, prevExpensesResult] = await Promise.all([
      db.payment.aggregate({
        _sum: { amount: true },
        where: { receivedAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: prevMonthStart, lte: prevMonthEnd }, status: 'approved' },
      }),
    ]);

    const prevRevenue = prevRevenueResult._sum.amount || 0;
    const prevExpenses = prevExpensesResult._sum.amount || 0;

    const revenueGrowth = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseGrowth = prevExpenses > 0 ? ((monthlyExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const feesCollectedGrowth = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Chart data: Monthly income vs expenses (last 12 months)
    const monthlyChartData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [income, expense] = await Promise.all([
        db.payment.aggregate({
          _sum: { amount: true },
          where: { receivedAt: { gte: start, lte: end } },
        }),
        db.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lte: end }, status: 'approved' },
        }),
      ]);

      monthlyChartData.push({
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        income: income._sum.amount || 0,
        expenses: expense._sum.amount || 0,
      });
    }

    // Payment method distribution
    const paymentMethodDistribution = await db.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: true,
    });

    // Expense categories
    const expenseCategories = await db.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
      where: { status: 'approved' },
    });

    // Recent transactions (last 10 combined)
    const recentPayments = await db.payment.findMany({
      take: 5,
      orderBy: { receivedAt: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
      },
    });

    const recentExpenses = await db.expense.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      where: { status: 'approved' },
      include: { creator: { select: { name: true } } },
    });

    const recentTransactions = [
      ...recentPayments.map((p) => ({
        id: p.id,
        type: 'income' as const,
        description: `Payment from ${p.student.firstName} ${p.student.lastName}`,
        amount: p.amount,
        method: p.paymentMethod,
        date: p.receivedAt,
        reference: p.receiptNumber,
      })),
      ...recentExpenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        description: e.title,
        amount: e.amount,
        method: e.paymentMethod,
        date: e.date,
        reference: e.category,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Student status distribution
    const studentsByStatus = await db.student.groupBy({
      by: ['status'],
      _count: true,
    });

    // Students by course
    const studentsByCourse = await db.student.groupBy({
      by: ['courseId'],
      _count: true,
    });
    const courseDetails = await db.course.findMany({
      where: { id: { in: studentsByCourse.map((s) => s.courseId) } },
      select: { id: true, name: true, code: true },
    });
    const courseDetailMap = new Map(courseDetails.map((c) => [c.id, c]));

    const studentsByCourseData = studentsByCourse.map((s) => ({
      course: courseDetailMap.get(s.courseId)?.name || 'Unknown',
      code: courseDetailMap.get(s.courseId)?.code || '',
      count: s._count,
    }));

    return successResponse({
      kpis: {
        totalStudents,
        activeStudents,
        totalFeesCollected,
        outstandingBalances,
        monthlyRevenue,
        monthlyExpenses,
        netIncome,
        revenueGrowth,
        expenseGrowth,
        feesCollectedGrowth,
      },
      charts: {
        monthlyIncomeVsExpenses: monthlyChartData,
        paymentMethodDistribution: paymentMethodDistribution.map((p) => ({
          method: p.paymentMethod,
          amount: p._sum.amount || 0,
          count: p._count,
        })),
        expenseCategories: expenseCategories.map((e) => ({
          category: e.category,
          amount: e._sum.amount || 0,
          count: e._count,
        })),
        studentsByStatus: studentsByStatus.map((s) => ({
          status: s.status,
          count: s._count,
        })),
        studentsByCourse: studentsByCourseData,
      },
      recentTransactions,
      topOutstandingStudents,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return errorResponse('Failed to fetch dashboard data', 500);
  }
}
