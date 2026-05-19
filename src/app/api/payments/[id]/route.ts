import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            firstName: true,
            lastName: true,
            gender: true,
            phoneNumber: true,
            email: true,
            course: { select: { id: true, name: true, code: true, tuitionFee: true, duration: true } },
            academicYear: { select: { name: true } },
          },
        },
        receivedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!payment) {
      return errorResponse('Payment not found', 404);
    }

    // Calculate student's overall financial position
    const allPayments = await db.payment.aggregate({
      where: { studentId: payment.studentId },
      _sum: { amount: true },
      _count: true,
    });

    const totalPaid = allPayments._sum.amount || 0;
    const expectedTotal = payment.student.course.tuitionFee * payment.student.course.duration;
    const balance = Math.max(0, expectedTotal - totalPaid);

    return successResponse({
      ...payment,
      studentFinancialSummary: {
        expectedTotal,
        totalPaid,
        balance,
        totalPayments: allPayments._count,
      },
    });
  } catch (error) {
    console.error('Get payment error:', error);
    return errorResponse('Failed to fetch payment', 500);
  }
}
