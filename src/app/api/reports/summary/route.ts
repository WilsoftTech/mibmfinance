import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    const now = new Date();
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const curMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      curIncome,
      prevIncome,
      curExpenses,
      prevExpenses,
      allTimeIncome,
      allTimeExpenses,
    ] = await Promise.all([
      db.payment.aggregate({ _sum: { amount: true }, where: { receivedAt: { gte: curMonthStart, lte: curMonthEnd } } }),
      db.payment.aggregate({ _sum: { amount: true }, where: { receivedAt: { gte: prevMonthStart, lte: prevMonthEnd } } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: curMonthStart, lte: curMonthEnd }, status: 'approved' } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: prevMonthStart, lte: prevMonthEnd }, status: 'approved' } }),
      db.payment.aggregate({ _sum: { amount: true } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { status: 'approved' } }),
    ]);

    const currentMonthIncome = curIncome._sum.amount ?? 0;
    const lastMonthIncome = prevIncome._sum.amount ?? 0;
    const currentMonthExpenses = curExpenses._sum.amount ?? 0;
    const lastMonthExpenses = prevExpenses._sum.amount ?? 0;
    const netBalance = (allTimeIncome._sum.amount ?? 0) - (allTimeExpenses._sum.amount ?? 0);

    const incomeTrend = lastMonthIncome > 0
      ? Math.round(((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 1000) / 10
      : 0;
    const expenseTrend = lastMonthExpenses > 0
      ? Math.round(((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 1000) / 10
      : 0;

    // Outstanding balances from active students
    const students = await db.student.findMany({
      where: { status: { in: ['active', 'suspended'] } },
      include: {
        course: { select: { tuitionFee: true, duration: true } },
        payments: { select: { amount: true } },
      },
    });

    let outstandingAmount = 0;
    let outstandingCount = 0;
    let totalExpected = 0;
    let totalCollected = 0;

    for (const s of students) {
      const expected = s.course.tuitionFee * s.course.duration;
      const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, expected - paid);
      totalExpected += expected;
      totalCollected += paid;
      if (balance > 0) {
        outstandingAmount += balance;
        outstandingCount++;
      }
    }

    // Last 6 months bar chart
    const last6Months: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const label = mStart.toLocaleString('default', { month: 'short', year: '2-digit' });
      const [inc, exp] = await Promise.all([
        db.payment.aggregate({ _sum: { amount: true }, where: { receivedAt: { gte: mStart, lte: mEnd } } }),
        db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: mStart, lte: mEnd }, status: 'approved' } }),
      ]);
      last6Months.push({ month: label, income: inc._sum.amount ?? 0, expense: exp._sum.amount ?? 0 });
    }

    // Last 12 months cash flow line chart
    const twelveAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const [openInc, openExp] = await Promise.all([
      db.payment.aggregate({ _sum: { amount: true }, where: { receivedAt: { lt: twelveAgo } } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { date: { lt: twelveAgo }, status: 'approved' } }),
    ]);
    let runningBalance = (openInc._sum.amount ?? 0) - (openExp._sum.amount ?? 0);

    const last12Months: { month: string; balance: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const label = mStart.toLocaleString('default', { month: 'short', year: '2-digit' });
      const [inc, exp] = await Promise.all([
        db.payment.aggregate({ _sum: { amount: true }, where: { receivedAt: { gte: mStart, lte: mEnd } } }),
        db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: mStart, lte: mEnd }, status: 'approved' } }),
      ]);
      runningBalance += (inc._sum.amount ?? 0) - (exp._sum.amount ?? 0);
      last12Months.push({ month: label, balance: runningBalance });
    }

    return successResponse({
      currentMonthIncome,
      lastMonthIncome,
      incomeTrend,
      currentMonthExpenses,
      lastMonthExpenses,
      expenseTrend,
      netBalance,
      outstandingAmount,
      outstandingCount,
      feeCollectionPie: {
        collected: totalCollected,
        outstanding: Math.max(0, totalExpected - totalCollected),
      },
      last6Months,
      last12Months,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reports summary error:', error);
    return errorResponse('Failed to fetch summary data', 500);
  }
}
