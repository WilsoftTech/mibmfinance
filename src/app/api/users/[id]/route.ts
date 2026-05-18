import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
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

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('Failed to fetch user', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, role, active, updatedBy } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('User not found', 404);
    }

    // Check email uniqueness if email is being changed
    if (email && email !== existing.email) {
      const duplicate = await db.user.findUnique({ where: { email } });
      if (duplicate) {
        return errorResponse('Email is already in use by another account');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    const user = await db.user.update({
      where: { id },
      data: updateData,
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
    if (updatedBy) {
      await db.auditLog.create({
        data: {
          userId: updatedBy,
          action: 'UPDATE_USER',
          entity: 'user',
          entityId: id,
          details: JSON.stringify({ updatedFields: Object.keys(updateData) }),
        },
      });
    }

    return successResponse(user);
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('Failed to update user', 500);
  }
}
