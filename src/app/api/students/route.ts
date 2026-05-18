import { db } from '@/lib/db';
import { paginatedResponse, errorResponse, successResponse, getPaginationParams } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(request);
    const q = searchParams.get('q') || '';
    const courseId = searchParams.get('courseId') || '';
    const programType = searchParams.get('programType') || '';
    const status = searchParams.get('status') || '';
    const gender = searchParams.get('gender') || '';
    const academicYearId = searchParams.get('academicYearId') || '';

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { studentId: { contains: q } },
        { email: { contains: q } },
        { phoneNumber: { contains: q } },
      ];
    }

    if (courseId) where.courseId = courseId;
    if (programType) where.programType = programType;
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (academicYearId) where.academicYearId = academicYearId;

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { id: true, name: true, code: true, tuitionFee: true, duration: true } },
          academicYear: { select: { id: true, name: true } },
          semester: { select: { id: true, name: true } },
          _count: { select: { payments: true } },
        },
      }),
      db.student.count({ where }),
    ]);

    // Calculate balance for each student
    const studentsWithBalance = await Promise.all(
      students.map(async (student) => {
        const totalPaid = await db.payment.aggregate({
          where: { studentId: student.id },
          _sum: { amount: true },
        });
        const expectedTotal = student.course.tuitionFee * student.course.duration;
        const paid = totalPaid._sum.amount || 0;

        return {
          ...student,
          totalPaid: paid,
          balance: Math.max(0, expectedTotal - paid),
        };
      })
    );

    return paginatedResponse(studentsWithBalance, total, page, limit);
  } catch (error) {
    console.error('Students list error:', error);
    return errorResponse('Failed to fetch students', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      courseId,
      programType,
      intake,
      academicYearId,
      semesterId,
      phoneNumber,
      email,
      guardianName,
      guardianContact,
      address,
      status,
    } = body;

    if (!firstName || !lastName || !gender || !courseId || !programType || !intake || !academicYearId) {
      return errorResponse('Missing required fields: firstName, lastName, gender, courseId, programType, intake, academicYearId');
    }

    // Auto-generate student ID: MIBAM/YYYY/NNN
    const currentYear = new Date().getFullYear();
    const lastStudent = await db.student.findFirst({
      where: { studentId: { contains: `MIBAM/${currentYear}` } },
      orderBy: { studentId: 'desc' },
    });

    let nextNumber = 1;
    if (lastStudent) {
      const parts = lastStudent.studentId.split('/');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNumber = lastNum + 1;
    }
    const studentId = `MIBAM/${currentYear}/${String(nextNumber).padStart(3, '0')}`;

    const student = await db.student.create({
      data: {
        studentId,
        firstName,
        lastName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        courseId,
        programType,
        intake,
        academicYearId,
        semesterId: semesterId || null,
        phoneNumber: phoneNumber || null,
        email: email || null,
        guardianName: guardianName || null,
        guardianContact: guardianContact || null,
        address: address || null,
        status: status || 'active',
      },
      include: {
        course: { select: { id: true, name: true, code: true, tuitionFee: true } },
        academicYear: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
      },
    });

    // Create audit log (only if userId provided)
    if (body.createdBy) {
      await db.auditLog.create({
        data: {
          userId: body.createdBy,
          action: 'CREATE_STUDENT',
          entity: 'student',
          entityId: student.id,
          details: JSON.stringify({ studentId: student.studentId, name: `${firstName} ${lastName}` }),
        },
      });
    }

    return successResponse(student, 201);
  } catch (error) {
    console.error('Create student error:', error);
    return errorResponse('Failed to create student', 500);
  }
}
