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
    // We need 'created_at' and 'sender_id' to update the other tables
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

    // Get sender info for friend insertion
    const senderResult = await db.execute(
      'SELECT * FROM users_by_id WHERE id = ?',
      [request.sender_id],
      { prepare: true }
    );

    if (senderResult.rows.length === 0) {
      return new NextResponse("Sender not found", { status: 404 });
    }

    const sender = senderResult.rows[0];

    // Get receiver info for friend insertion
    const receiverResult = await db.execute(
      'SELECT * FROM users_by_id WHERE id = ?',
      [request.receiver_id],
      { prepare: true }
    );

    const receiver = receiverResult.rows[0];

    // =================================================================================
    // FIX: Update ALL denormalized tables so the UI reflects the change immediately
    // =================================================================================
    const queries = [
      // 1. Update Main Table
      {
        query: 'UPDATE friend_requests_by_id SET status = ?, updated_at = ? WHERE id = ?',
        params: [newStatus, now, requestId]
      },
      // 2. Update Sender's View (so they see it was accepted)
      // Key: ((sender_id), created_at, id)
      {
        query: 'UPDATE friend_requests_by_sender SET status = ?, updated_at = ? WHERE sender_id = ? AND created_at = ? AND id = ?',
        params: [newStatus, now, request.sender_id, request.created_at, requestId]
      },
      // 3. Update Receiver's View (so it disappears from your "Pending" list)
      // Key: ((receiver_id), created_at, id)
      {
        query: 'UPDATE friend_requests_by_receiver SET status = ?, updated_at = ? WHERE receiver_id = ? AND created_at = ? AND id = ?',
        params: [newStatus, now, request.receiver_id, request.created_at, requestId]
      },
      // 4. Update the Lookup Table (used to check if request exists)
      {
        query: 'UPDATE friend_requests_by_users SET status = ? WHERE user_one_id = ? AND user_two_id = ?',
        params: [newStatus, request.sender_id, request.receiver_id]
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

    const requestResult = await db.execute(
      'SELECT * FROM friend_requests_by_id WHERE id = ?',
      [requestId],
      { prepare: true }
    );

    if (requestResult.rows.length === 0) {
      return new NextResponse("Friend request not found", { status: 404 });
    }

    const request = requestResult.rows[0];

    if (request.sender_id.toString() !== profile.id) {
      return new NextResponse("Unauthorized to delete this request", { status: 403 });
    }

    // FIX: Delete from ALL tables to ensure it disappears everywhere
    const queries = [
      {
        query: 'DELETE FROM friend_requests_by_id WHERE id = ?',
        params: [requestId]
      },
      {
        query: 'DELETE FROM friend_requests_by_sender WHERE sender_id = ? AND created_at = ? AND id = ?',
        params: [request.sender_id, request.created_at, requestId]
      },
      {
        query: 'DELETE FROM friend_requests_by_receiver WHERE receiver_id = ? AND created_at = ? AND id = ?',
        params: [request.receiver_id, request.created_at, requestId]
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