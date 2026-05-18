import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    if (!expense) {
      return errorResponse('Expense not found', 404);
    }

    return successResponse(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    return errorResponse('Failed to fetch expense', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Expense not found', 404);
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'amount', 'category', 'paymentMethod',
      'description', 'receiptImage', 'date',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'date' && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Handle approval status changes
    if (body.status !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(body.status)) {
        return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      updateData.status = body.status;

      // If approving, set the approver
      if (body.status === 'approved' && body.approvedBy) {
        updateData.approvedBy = body.approvedBy;
      }
    }

    const expense = await db.expense.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    // Create audit log (only if userId provided)
    const auditUserId = body.approvedBy || body.updatedBy;
    if (auditUserId) {
      const action = body.status === 'approved' ? 'APPROVE_EXPENSE' :
                     body.status === 'rejected' ? 'REJECT_EXPENSE' : 'UPDATE_EXPENSE';
      await db.auditLog.create({
        data: {
          userId: auditUserId,
          action,
          entity: 'expense',
          entityId: id,
          details: JSON.stringify({ updatedFields: Object.keys(updateData) }),
        },
      });
    }

    return successResponse(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    return errorResponse('Failed to update expense', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.expense.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse('Expense not found', 404);
    }

    // Only allow deletion of pending expenses
    if (existing.status === 'approved') {
      return errorResponse('Cannot delete approved expenses. Consider rejecting instead.');
    }

    await db.expense.delete({ where: { id } });

    // Create audit log (find an admin user for the log)
    const adminUser = await db.user.findFirst({ where: { role: 'super_admin' } });
    if (adminUser) {
      await db.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'DELETE_EXPENSE',
          entity: 'expense',
          entityId: id,
          details: JSON.stringify({ title: existing.title, amount: existing.amount }),
        },
      });
    }

    return successResponse({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return errorResponse('Failed to delete expense', 500);
  }
}
