import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return errorResponse('Date parameter is required (format: YYYY-MM-DD)');
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return errorResponse('Invalid date format. Use YYYY-MM-DD');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all payments for the day
    const payments = await db.payment.findMany({
      where: {
        receivedAt: {
          gte: startOfDay,
          lte: endOfDay,
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
        receivedByUser: { select: { name: true } },
      },
      orderBy: { receivedAt: 'asc' },
    });

    // Get all expenses for the day
    const expenses = await db.expense.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'approved',
      },
      include: {
        creator: { select: { name: true } },
        approver: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    // Income by payment method
    const incomeByMethod = payments.reduce((acc, p) => {
      acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>);

    // Expenses by category
    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    // Also get the cumulative balance up to this date (all income - all expenses before this date)
    const previousPayments = await db.payment.aggregate({
      _sum: { amount: true },
      where: {
        receivedAt: { lt: startOfDay },
      },
    });

    const previousExpenses = await db.expense.aggregate({
      _sum: { amount: true },
      where: {
        date: { lt: startOfDay },
        status: 'approved',
      },
    });

    const previousBalance = (previousPayments._sum.amount || 0) - (previousExpenses._sum.amount || 0);
    const closingBalance = previousBalance + netBalance;

    return successResponse({
      date: dateParam,
      income: {
        total: totalIncome,
        byMethod: incomeByMethod,
        transactions: payments.map((p) => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          studentName: `${p.student.firstName} ${p.student.lastName}`,
          studentId: p.student.studentId,
          course: p.student.course.name,
          amount: p.amount,
          method: p.paymentMethod,
          reference: p.reference,
          receivedBy: p.receivedByUser.name,
          time: p.receivedAt,
        })),
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        transactions: expenses.map((e) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          amount: e.amount,
          method: e.paymentMethod,
          createdBy: e.creator.name,
          approvedBy: e.approver?.name || null,
          time: e.date,
        })),
      },
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
        openingBalance: previousBalance,
        closingBalance,
      },
    });
  } catch (error) {
    console.error('Cashbook API error:', error);
    return errorResponse('Failed to fetch cashbook data', 500);
  }
}
