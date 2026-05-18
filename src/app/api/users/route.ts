import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '';
    const active = searchParams.get('active') || '';

    const where: Record<string, unknown> = {};

    if (role) where.role = role;
    if (active !== '') where.active = active === 'true';

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(users);
  } catch (error) {
    console.error('Users list error:', error);
    return errorResponse('Failed to fetch users', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, createdBy } = body;

    if (!name || !email || !password || !role) {
      return errorResponse('Missing required fields: name, email, password, role');
    }

    // Check for duplicate email
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse('User with this email already exists');
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        password, // In production, this would be hashed
        role,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    if (createdBy) {
      await db.auditLog.create({
        data: {
          userId: createdBy,
          action: 'CREATE_USER',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ name, email, role }),
        },
      });
    }

    return successResponse(user, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse('Failed to create user', 500);
  }
}
