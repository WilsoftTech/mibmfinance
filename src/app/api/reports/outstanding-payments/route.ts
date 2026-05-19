import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const overdueStatus = searchParams.get('overdueStatus') || 'all'; // 'all' | 'overdue' | 'current'
    const courseId = searchParams.get('courseId') || 'all';

    const now = new Date();

    const where: Record<string, unknown> = {
      status: { in: ['active', 'suspended'] },
    };
    if (courseId !== 'all') where.courseId = courseId;

    const students = await db.student.findMany({
      where,
      include: {
        course: { select: { name: true, code: true, tuitionFee: true, duration: true } },
        academicYear: { select: { name: true } },
        payments: { select: { amount: true, receivedAt: true } },
      },
      orderBy: { enrolledAt: 'asc' },
    });

    type OutstandingItem = {
      studentId: string;
      name: string;
      course: string;
      courseCode: string;
      academicYear: string;
      enrolledAt: string;
      totalFees: number;
      totalPaid: number;
      outstanding: number;
      daysOverdue: number;
      status: 'overdue' | 'pending' | 'paid';
    };

    const items: OutstandingItem[] = [];

    for (const s of students) {
      const totalFees = s.course.tuitionFee * s.course.duration;
      const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = Math.max(0, totalFees - totalPaid);
      if (outstanding <= 0) continue;

      // Due date = 30 days after enrollment
      const dueDate = new Date(s.enrolledAt);
      dueDate.setDate(dueDate.getDate() + 30);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000));

      items.push({
        studentId: s.studentId,
        name: `${s.firstName} ${s.lastName}`,
        course: s.course.name,
        courseCode: s.course.code,
        academicYear: s.academicYear.name,
        enrolledAt: s.enrolledAt.toISOString(),
        totalFees,
        totalPaid,
        outstanding,
        daysOverdue,
        status: daysOverdue > 30 ? 'overdue' : 'pending',
      });
    }

    const filtered =
      overdueStatus === 'overdue'
        ? items.filter(s => s.daysOverdue > 30)
        : overdueStatus === 'current'
        ? items.filter(s => s.daysOverdue <= 30)
        : items;

    filtered.sort((a, b) => b.daysOverdue - a.daysOverdue || b.outstanding - a.outstanding);

    const totalOutstanding = filtered.reduce((s, i) => s + i.outstanding, 0);
    const overdueItems = filtered.filter(i => i.daysOverdue > 30);
    const totalOverdue = overdueItems.reduce((s, i) => s + i.outstanding, 0);

    return successResponse({
      type: 'outstanding-payments',
      period: `As of ${now.toLocaleDateString('en-UG')}`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalStudents: filtered.length,
        totalOutstanding,
        totalOverdue,
        overdueCount: overdueItems.length,
      },
      items: filtered,
    });
  } catch (error) {
    console.error('Outstanding payments error:', error);
    return errorResponse('Failed to generate outstanding payments report', 500);
  }
}
