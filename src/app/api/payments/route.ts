import { db } from '@/lib/db';
import { paginatedResponse, errorResponse, successResponse, getPaginationParams } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(request);
    const q = searchParams.get('q') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const studentId = searchParams.get('studentId') || '';

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { receiptNumber: { contains: q } },
        { reference: { contains: q } },
        { student: { firstName: { contains: q } } },
        { student: { lastName: { contains: q } } },
        { student: { studentId: { contains: q } } },
      ];
    }

    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (studentId) where.studentId = studentId;

    if (startDate || endDate) {
      where.receivedAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              course: { select: { name: true, code: true } },
            },
          },
          receivedByUser: { select: { id: true, name: true } },
        },
      }),
      db.payment.count({ where }),
    ]);

    return paginatedResponse(payments, total, page, limit);
  } catch (error) {
    console.error('Payments list error:', error);
    return errorResponse('Failed to fetch payments', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentId,
      amount,
      paymentMethod,
      reference,
      semester,
      academicYear,
      notes,
      receivedBy,
    } = body;

    if (!studentId || !amount || !paymentMethod || !receivedBy) {
      return errorResponse('Missing required fields: studentId, amount, paymentMethod, receivedBy');
    }

    if (amount <= 0) {
      return errorResponse('Amount must be greater than zero');
    }

    // Verify student exists
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { course: true },
    });

    if (!student) {
      return errorResponse('Student not found', 404);
    }

    // Auto-generate receipt number: RCT-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const lastPayment = await db.payment.findFirst({
      where: { receiptNumber: { contains: `RCT-${currentYear}` } },
      orderBy: { receiptNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastPayment) {
      const parts = lastPayment.receiptNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNumber = lastNum + 1;
    }
    const receiptNumber = `RCT-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    const payment = await db.payment.create({
      data: {
        receiptNumber,
        studentId,
        amount,
        paymentMethod,
        reference: reference || null,
        semester: semester || null,
        academicYear: academicYear || null,
        notes: notes || null,
        receivedBy,
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            course: { select: { name: true, tuitionFee: true, duration: true } },
          },
        },
        receivedByUser: { select: { id: true, name: true } },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: receivedBy,
        action: 'RECORD_PAYMENT',
        entity: 'payment',
        entityId: payment.id,
        details: JSON.stringify({
          receiptNumber: payment.receiptNumber,
          amount,
          studentId: student.studentId,
          studentName: `${student.firstName} ${student.lastName}`,
        }),
      },
    });

    return successResponse(payment, 201);
  } catch (error) {
    console.error('Create payment error:', error);
    return errorResponse('Failed to record payment', 500);
  }
}
