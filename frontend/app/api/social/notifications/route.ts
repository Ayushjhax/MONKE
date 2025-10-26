// API route for user notifications
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userWallet = searchParams.get('userWallet');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      let query = `
        SELECT * FROM user_notifications
        WHERE user_wallet = $1
      `;

      const values: any[] = [userWallet];

      if (unreadOnly) {
        query += ' AND read = FALSE';
      }

      query += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`;
      values.push(limit);

      const result = await client.query(query, values);

      // Get unread count
      const unreadCountResult = await client.query(
        'SELECT COUNT(*)::INTEGER as unread_count FROM user_notifications WHERE user_wallet = $1 AND read = FALSE',
        [userWallet]
      );

      return NextResponse.json({
        notifications: result.rows,
        unread_count: unreadCountResult.rows[0].unread_count
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userWallet, notificationId, markAllAsRead } = body;

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      if (markAllAsRead) {
        // Mark all notifications as read
        await client.query(
          'UPDATE user_notifications SET read = TRUE WHERE user_wallet = $1 AND read = FALSE',
          [userWallet]
        );

        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read'
        });
      } else if (notificationId) {
        // Mark specific notification as read
        const result = await client.query(
          'UPDATE user_notifications SET read = TRUE WHERE id = $1 AND user_wallet = $2 RETURNING *',
          [notificationId, userWallet]
        );

        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: 'Notification not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          notification: result.rows[0]
        });
      } else {
        return NextResponse.json(
          { error: 'notificationId or markAllAsRead is required' },
          { status: 400 }
        );
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

