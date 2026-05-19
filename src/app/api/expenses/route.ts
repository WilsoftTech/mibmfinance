import { db } from '@/lib/db';
import { paginatedResponse, errorResponse, successResponse, getPaginationParams } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(request);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (category) where.category = category;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      where.date = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
        },
      }),
      db.expense.count({ where }),
    ]);

    return paginatedResponse(expenses, total, page, limit);
  } catch (error) {
    console.error('Expenses list error:', error);
    return errorResponse('Failed to fetch expenses', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      amount,
      category,
      paymentMethod,
      description,
      receiptImage,
      date,
      createdBy,
    } = body;

    if (!title || !amount || !category || !paymentMethod || !date || !createdBy) {
      return errorResponse('Missing required fields: title, amount, category, paymentMethod, date, createdBy');
    }

    if (amount <= 0) {
      return errorResponse('Amount must be greater than zero');
    }

    const expense = await db.expense.create({
      data: {
        title,
        amount,
        category,
        paymentMethod,
        description: description || null,
        receiptImage: receiptImage || null,
        date: new Date(date),
        createdBy,
        status: 'pending',
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE_EXPENSE',
        entity: 'expense',
        entityId: expense.id,
        details: JSON.stringify({ title, amount, category }),
      },
    });

    return successResponse(expense, 201);
  } catch (error) {
    console.error('Create expense error:', error);
    return errorResponse('Failed to create expense', 500);
  }
}
