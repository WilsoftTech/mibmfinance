import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const category = searchParams.get('category') || 'all';

    const now = new Date();
    const dateFrom = dateFromStr ? new Date(dateFromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = dateToStr ? new Date(dateToStr) : now;
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    // Income: all payment receipts in period
    const payments = await db.payment.findMany({
      where: { receivedAt: { gte: dateFrom, lte: dateTo } },
      include: {
        student: { select: { course: { select: { name: true, code: true } } } },
      },
      orderBy: { receivedAt: 'desc' },
    });

    const totalIncome = payments.reduce((s, p) => s + p.amount, 0);

    // Group income by payment method
    const byMethodMap: Record<string, { source: string; amount: number; count: number }> = {};
    for (const p of payments) {
      const key = p.paymentMethod;
      const label = key === 'cash' ? 'Cash Collections' : key === 'bank' ? 'Bank Transfer Collections' : 'Mobile Money Collections';
      if (!byMethodMap[key]) byMethodMap[key] = { source: label, amount: 0, count: 0 };
      byMethodMap[key].amount += p.amount;
      byMethodMap[key].count++;
    }

    // Group income by course
    const byCourseMap: Record<string, { source: string; amount: number; count: number }> = {};
    for (const p of payments) {
      const name = p.student.course.name;
      if (!byCourseMap[name]) byCourseMap[name] = { source: name, amount: 0, count: 0 };
      byCourseMap[name].amount += p.amount;
      byCourseMap[name].count++;
    }

    // Expenditure: approved expenses in period
    const expWhere: Record<string, unknown> = {
      date: { gte: dateFrom, lte: dateTo },
      status: 'approved',
    };
    if (category !== 'all') expWhere.category = category;

    const expenses = await db.expense.findMany({
      where: expWhere,
      include: { creator: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Group expenses by category
    const byCategoryMap: Record<string, { category: string; amount: number; count: number; items: { title: string; amount: number; date: string }[] }> = {};
    for (const e of expenses) {
      const cat = e.category;
      if (!byCategoryMap[cat]) byCategoryMap[cat] = { category: cat, amount: 0, count: 0, items: [] };
      byCategoryMap[cat].amount += e.amount;
      byCategoryMap[cat].count++;
      byCategoryMap[cat].items.push({ title: e.title, amount: e.amount, date: e.date.toISOString() });
    }

    const netSurplus = totalIncome - totalExpenses;
    const periodLabel = `${dateFrom.toLocaleDateString('en-UG')} – ${dateTo.toLocaleDateString('en-UG')}`;

    return successResponse({
      type: 'income-expenditure',
      period: periodLabel,
      generatedAt: new Date().toISOString(),
      income: {
        total: totalIncome,
        byMethod: Object.values(byMethodMap).sort((a, b) => b.amount - a.amount),
        byCourse: Object.values(byCourseMap).sort((a, b) => b.amount - a.amount),
      },
      expenditure: {
        total: totalExpenses,
        byCategory: Object.values(byCategoryMap).sort((a, b) => b.amount - a.amount),
      },
      netSurplus,
      isDeficit: netSurplus < 0,
    });
  } catch (error) {
    console.error('Income & expenditure error:', error);
    return errorResponse('Failed to generate income & expenditure report', 500);
  }
}
