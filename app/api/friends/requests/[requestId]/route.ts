import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// Accept or reject a friend request
export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { requestId } = params;
    const { action } = await req.json(); // 'accept' or 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return new NextResponse("Invalid action", { status: 400 });
    }

    // Get the friend request
    const requestResult = await db.execute(
      'SELECT * FROM friend_requests_by_id WHERE id = ?',
      [requestId],
      { prepare: true }
    );

    if (requestResult.rows.length === 0) {
      return new NextResponse("Friend request not found", { status: 404 });
    }

    const request = requestResult.rows[0];

    // Verify that the current user is the receiver
    if (request.receiver_id.toString() !== profile.id) {
      return new NextResponse("Unauthorized to modify this request", { status: 403 });
    }

    if (request.status !== 'PENDING') {
      return new NextResponse("Request already processed", { status: 400 });
    }

    const now = new Date();
    const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

    // Get sender info for denormalization
    const senderResult = await db.execute(
      'SELECT * FROM users_by_id WHERE id = ?',
      [request.sender_id],
      { prepare: true }
    );

    if (senderResult.rows.length === 0) {
      return new NextResponse("Sender not found", { status: 404 });
    }

    const sender = senderResult.rows[0];

    // Get receiver info for denormalization
    const receiverResult = await db.execute(
      'SELECT * FROM users_by_id WHERE id = ?',
      [request.receiver_id],
      { prepare: true }
    );

    const receiver = receiverResult.rows[0];

    const queries = [
      // Update friend_requests_by_id
      {
        query: 'UPDATE friend_requests_by_id SET status = ?, updated_at = ? WHERE id = ?',
        params: [newStatus, now, requestId]
      }
    ];

    // If accepted, add to friends tables
    if (action === 'accept') {
      queries.push(
        // Add sender to receiver's friends
        {
          query: `INSERT INTO friends_by_user (user_id, friend_id, friend_username, friend_name, friend_image_url, friend_email, became_friends_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
          params: [request.receiver_id, request.sender_id, sender.username, sender.name, sender.image_url, sender.email, now]
        },
        // Add receiver to sender's friends
        {
          query: `INSERT INTO friends_by_user (user_id, friend_id, friend_username, friend_name, friend_image_url, friend_email, became_friends_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
          params: [request.sender_id, request.receiver_id, receiver.username, receiver.name, receiver.image_url, receiver.email, now]
        }
      );
    }

    await db.batch(queries, { prepare: true });

    // Note: We're not updating the denormalized tables (friend_requests_by_sender/receiver)
    // because Cassandra doesn't support efficient updates on clustering columns
    // The status will remain PENDING in those tables, but the main table has the correct status

    return NextResponse.json({
      id: requestId,
      status: newStatus,
      updatedAt: now
    });
  } catch (error) {
    console.log("[UPDATE FRIEND REQUEST ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Delete/cancel a friend request
export async function DELETE(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { requestId } = params;

    // Get the friend request
    const requestResult = await db.execute(
      'SELECT * FROM friend_requests_by_id WHERE id = ?',
      [requestId],
      { prepare: true }
    );

    if (requestResult.rows.length === 0) {
      return new NextResponse("Friend request not found", { status: 404 });
    }

    const request = requestResult.rows[0];

    // Verify that the current user is the sender (can only cancel own requests)
    if (request.sender_id.toString() !== profile.id) {
      return new NextResponse("Unauthorized to delete this request", { status: 403 });
    }

    // Delete from all tables
    const queries = [
      {
        query: 'DELETE FROM friend_requests_by_id WHERE id = ?',
        params: [requestId]
      },
      {
        query: 'DELETE FROM friend_requests_by_users WHERE user_one_id = ? AND user_two_id = ?',
        params: [request.sender_id, request.receiver_id]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({ message: "Friend request cancelled" });
  } catch (error) {
    console.log("[DELETE FRIEND REQUEST ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
