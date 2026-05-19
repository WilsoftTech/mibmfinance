import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const txType = searchParams.get('type') || 'all'; // 'income' | 'expense' | 'all'

    const now = new Date();
    const dateFrom = dateFromStr ? new Date(dateFromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = dateToStr ? new Date(dateToStr) : now;
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    // Opening balance: all income - all approved expenses before dateFrom
    const [prevInc, prevExp] = await Promise.all([
      db.payment.aggregate({ _sum: { amount: true }, where: { receivedAt: { lt: dateFrom } } }),
      db.expense.aggregate({ _sum: { amount: true }, where: { date: { lt: dateFrom }, status: 'approved' } }),
    ]);
    const openingBalance = (prevInc._sum.amount ?? 0) - (prevExp._sum.amount ?? 0);

    type Entry = {
      date: Date;
      referenceNo: string;
      description: string;
      account: string;
      debit: number;
      credit: number;
      txType: 'income' | 'expense';
    };

    const raw: Entry[] = [];

    if (txType !== 'expense') {
      const payments = await db.payment.findMany({
        where: { receivedAt: { gte: dateFrom, lte: dateTo } },
        include: {
          student: { select: { studentId: true, firstName: true, lastName: true } },
        },
        orderBy: { receivedAt: 'asc' },
      });
      for (const p of payments) {
        raw.push({
          date: p.receivedAt,
          referenceNo: p.receiptNumber,
          description: `Fee payment – ${p.student.firstName} ${p.student.lastName} (${p.student.studentId})`,
          account: `Fees Income / ${p.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          debit: 0,
          credit: p.amount,
          txType: 'income',
        });
      }
    }

    if (txType !== 'income') {
      const expenses = await db.expense.findMany({
        where: { date: { gte: dateFrom, lte: dateTo }, status: 'approved' },
        orderBy: { date: 'asc' },
      });
      for (const e of expenses) {
        raw.push({
          date: e.date,
          referenceNo: `EXP-${e.id.slice(-6).toUpperCase()}`,
          description: e.title,
          account: e.category.charAt(0).toUpperCase() + e.category.slice(1),
          debit: e.amount,
          credit: 0,
          txType: 'expense',
        });
      }
    }

    raw.sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = openingBalance;
    const entries = raw.map(e => {
      balance += e.credit - e.debit;
      return {
        date: e.date.toISOString(),
        referenceNo: e.referenceNo,
        description: e.description,
        account: e.account,
        debit: e.debit,
        credit: e.credit,
        runningBalance: balance,
        type: e.txType,
      };
    });

    const totalDebits = raw.reduce((s, e) => s + e.debit, 0);
    const totalCredits = raw.reduce((s, e) => s + e.credit, 0);

    const periodLabel = `${dateFrom.toLocaleDateString('en-UG')} to ${dateTo.toLocaleDateString('en-UG')}`;

    return successResponse({
      type: 'day-book',
      period: periodLabel,
      generatedAt: new Date().toISOString(),
      openingBalance,
      closingBalance: openingBalance + totalCredits - totalDebits,
      totalCredits,
      totalDebits,
      entries,
    });
  } catch (error) {
    console.error('Day book error:', error);
    return errorResponse('Failed to generate day book', 500);
  }
}
