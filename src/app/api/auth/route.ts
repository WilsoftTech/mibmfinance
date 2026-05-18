import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Simple password check (in production, use bcrypt or similar)
    if (user.password !== password) {
      return errorResponse('Invalid email or password', 401);
    }

    if (!user.active) {
      return errorResponse('Account is deactivated. Contact administrator.', 403);
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'user',
        entityId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    // Return user data without password
    const { password: _, ...userData } = user;

    return successResponse({
      user: userData,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Failed to authenticate', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Simple session check - in a real app this would use JWT/cookies
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    if (!user.active) {
      return errorResponse('Account is deactivated', 403);
    }

    const { password: _, ...userData } = user;

    return successResponse({ user: userData });
  } catch (error) {
    console.error('Session check error:', error);
    return errorResponse('Failed to check session', 500);
  }
}
