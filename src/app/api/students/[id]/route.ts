import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: {
        course: true,
        academicYear: true,
        semester: true,
        payments: {
          orderBy: { receivedAt: 'desc' },
          include: {
            receivedByUser: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!student) {
      return errorResponse('Student not found', 404);
    }

    // Calculate financial summary
    const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0);
    const expectedTotal = student.course.tuitionFee * student.course.duration;
    const balance = Math.max(0, expectedTotal - totalPaid);

    return successResponse({
      ...student,
      financialSummary: {
        expectedTotal,
        totalPaid,
        balance,
        paymentCount: student.payments.length,
      },
    });
  } catch (error) {
    console.error('Get student error:', error);
    return errorResponse('Failed to fetch student', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.student.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Student not found', 404);
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'firstName', 'lastName', 'gender', 'dateOfBirth', 'courseId',
      'programType', 'intake', 'academicYearId', 'semesterId',
      'phoneNumber', 'email', 'guardianName', 'guardianContact',
      'address', 'photo', 'status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dateOfBirth' && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const student = await db.student.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
      },
    });

    // Create audit log (only if userId provided)
    if (body.updatedBy) {
      await db.auditLog.create({
        data: {
          userId: body.updatedBy,
          action: 'UPDATE_STUDENT',
          entity: 'student',
          entityId: id,
          details: JSON.stringify({ updatedFields: Object.keys(updateData) }),
        },
      });
    }

    return successResponse(student);
  } catch (error) {
    console.error('Update student error:', error);
    return errorResponse('Failed to update student', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.student.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });

    if (!existing) {
      return errorResponse('Student not found', 404);
    }

    if (existing._count.payments > 0) {
      return errorResponse('Cannot delete student with existing payments. Consider changing status to withdrawn instead.');
    }

    // Delete student
    await db.student.delete({ where: { id } });

    // Create audit log (find an admin user for the log)
    const adminUser = await db.user.findFirst({ where: { role: 'super_admin' } });
    if (adminUser) {
      await db.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'DELETE_STUDENT',
          entity: 'student',
          entityId: id,
          details: JSON.stringify({ studentId: existing.studentId, name: `${existing.firstName} ${existing.lastName}` }),
        },
      });
    }

    return successResponse({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    return errorResponse('Failed to delete student', 500);
  }
}
