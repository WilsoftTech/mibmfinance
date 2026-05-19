import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object for easier consumption
    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return successResponse({
      settings: settingsMap,
      raw: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, updatedBy } = body;

    if (!settings || typeof settings !== 'object') {
      return errorResponse('Settings object is required with key-value pairs');
    }

    const results: { id: string; key: string; value: string; createdAt: Date; updatedAt: Date }[] = [];

    for (const [key, value] of Object.entries(settings)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      const setting = await db.setting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue },
      });

      results.push(setting);
    }

    // Create audit log
    if (updatedBy) {
      await db.auditLog.create({
        data: {
          userId: updatedBy,
          action: 'UPDATE_SETTINGS',
          entity: 'setting',
          details: JSON.stringify({ updatedKeys: Object.keys(settings) }),
        },
      });
    }

    // Return updated settings as key-value map
    const settingsMap: Record<string, string> = {};
    for (const setting of results) {
      settingsMap[setting.key] = setting.value;
    }

    return successResponse({
      settings: settingsMap,
      raw: results,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
}
