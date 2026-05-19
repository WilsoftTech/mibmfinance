import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asAtStr = searchParams.get('asAt');
    const asAt = asAtStr ? new Date(asAtStr) : new Date();
    asAt.setHours(23, 59, 59, 999);

    // Cash = all payments received - all approved expenses paid, as at date
    const [totalInc, totalApproved, pendingAgg] = await Promise.all([
      db.payment.aggregate({ _sum: { amount: true }, where: { receivedAt: { lte: asAt } } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { date: { lte: asAt }, status: 'approved' } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { date: { lte: asAt }, status: 'pending' } }),
    ]);

    const cashAndEquivalents = Math.max(0, (totalInc._sum.amount ?? 0) - (totalApproved._sum.amount ?? 0));

    // Fees receivable = outstanding student fee balances as at date
    const students = await db.student.findMany({
      where: {
        enrolledAt: { lte: asAt },
        status: { in: ['active', 'suspended'] },
      },
      include: {
        course: { select: { tuitionFee: true, duration: true, name: true, code: true } },
        payments: { where: { receivedAt: { lte: asAt } }, select: { amount: true } },
      },
    });

    let feesReceivable = 0;
    const receivableBreakdown: { course: string; code: string; students: number; amount: number }[] = [];
    const courseMap: Record<string, { course: string; code: string; students: number; amount: number }> = {};

    for (const s of students) {
      const expected = s.course.tuitionFee * s.course.duration;
      const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, expected - paid);
      feesReceivable += balance;
      if (balance > 0) {
        const key = s.course.code;
        if (!courseMap[key]) courseMap[key] = { course: s.course.name, code: s.course.code, students: 0, amount: 0 };
        courseMap[key].students++;
        courseMap[key].amount += balance;
      }
    }
    receivableBreakdown.push(...Object.values(courseMap).sort((a, b) => b.amount - a.amount));

    const totalAssets = cashAndEquivalents + feesReceivable;
    const totalLiabilities = pendingAgg._sum.amount ?? 0;
    const accumulatedSurplus = totalAssets - totalLiabilities;

    const asAtLabel = asAt.toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' });

    return successResponse({
      type: 'balance-sheet',
      asAt: asAt.toISOString(),
      asAtLabel,
      generatedAt: new Date().toISOString(),
      assets: {
        cashAndEquivalents,
        feesReceivable,
        receivableBreakdown,
        total: totalAssets,
      },
      liabilities: {
        pendingExpenses: totalLiabilities,
        total: totalLiabilities,
      },
      equity: {
        accumulatedSurplus,
        total: accumulatedSurplus,
      },
      totalLiabilitiesAndEquity: totalLiabilities + accumulatedSurplus,
    });
  } catch (error) {
    console.error('Balance sheet error:', error);
    return errorResponse('Failed to generate balance sheet', 500);
  }
}
