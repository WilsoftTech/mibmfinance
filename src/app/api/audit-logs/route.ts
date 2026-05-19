import { db } from '@/lib/db';
import { paginatedResponse, errorResponse, getPaginationParams } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(request);
    const action = searchParams.get('action') || '';
    const entity = searchParams.get('entity') || '';
    const userId = searchParams.get('userId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const where: Record<string, unknown> = {};

    if (action) where.action = { contains: action };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return paginatedResponse(logs, total, page, limit);
  } catch (error) {
    console.error('Audit logs list error:', error);
    return errorResponse('Failed to fetch audit logs', 500);
  }
}
