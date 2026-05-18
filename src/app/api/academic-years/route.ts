import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const academicYears = await db.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        semesters: {
          orderBy: { startDate: 'asc' },
        },
        _count: { select: { students: true } },
      },
    });

    return successResponse(academicYears);
  } catch (error) {
    console.error('Academic years list error:', error);
    return errorResponse('Failed to fetch academic years', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, startDate, endDate, active, semesters, createdBy } = body;

    if (!name || !startDate || !endDate) {
      return errorResponse('Missing required fields: name, startDate, endDate');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return errorResponse('Start date must be before end date');
    }

    // Check for duplicate name
    const existing = await db.academicYear.findUnique({ where: { name } });
    if (existing) {
      return errorResponse('Academic year with this name already exists');
    }

    // If setting as active, deactivate others
    if (active) {
      await db.academicYear.updateMany({
        where: { active: true },
        data: { active: false },
      });
    }

    const academicYear = await db.academicYear.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        active: active || false,
        semesters: semesters
          ? {
              create: semesters.map((s: { name: string; startDate: string; endDate: string; active?: boolean }) => ({
                name: s.name,
                startDate: new Date(s.startDate),
                endDate: new Date(s.endDate),
                active: s.active || false,
              })),
            }
          : undefined,
      },
      include: {
        semesters: { orderBy: { startDate: 'asc' } },
      },
    });

    // Create audit log
    if (createdBy) {
      await db.auditLog.create({
        data: {
          userId: createdBy,
          action: 'CREATE_ACADEMIC_YEAR',
          entity: 'academicYear',
          entityId: academicYear.id,
          details: JSON.stringify({ name, startDate, endDate }),
        },
      });
    }

    return successResponse(academicYear, 201);
  } catch (error) {
    console.error('Create academic year error:', error);
    return errorResponse('Failed to create academic year', 500);
  }
}
