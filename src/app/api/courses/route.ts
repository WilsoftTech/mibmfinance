import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programType = searchParams.get('programType') || '';

    const where: Record<string, unknown> = {};
    if (programType) where.programType = programType;

    const courses = await db.course.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { students: true } },
      },
    });

    return successResponse(courses);
  } catch (error) {
    console.error('Courses list error:', error);
    return errorResponse('Failed to fetch courses', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, programType, duration, tuitionFee } = body;

    if (!name || !code || !programType || !duration || !tuitionFee) {
      return errorResponse('Missing required fields: name, code, programType, duration, tuitionFee');
    }

    if (duration <= 0 || tuitionFee <= 0) {
      return errorResponse('Duration and tuition fee must be greater than zero');
    }

    // Check for duplicate code or name
    const existing = await db.course.findFirst({
      where: {
        OR: [{ code }, { name }],
      },
    });

    if (existing) {
      return errorResponse(existing.code === code ? 'Course code already exists' : 'Course name already exists');
    }

    const course = await db.course.create({
      data: {
        name,
        code: code.toUpperCase(),
        programType,
        duration,
        tuitionFee,
      },
    });

    // Create audit log (only if userId provided)
    if (body.createdBy) {
      await db.auditLog.create({
        data: {
          userId: body.createdBy,
          action: 'CREATE_COURSE',
          entity: 'course',
          entityId: course.id,
          details: JSON.stringify({ name, code, programType }),
        },
      });
    }

    return successResponse(course, 201);
  } catch (error) {
    console.error('Create course error:', error);
    return errorResponse('Failed to create course', 500);
  }
}
