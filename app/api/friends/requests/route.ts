import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// Send a friend request
export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { receiverUsername } = await req.json();

    if (!receiverUsername) {
      return new NextResponse("Receiver username is required", { status: 400 });
    }

    // Get receiver user
    const receiverResult = await db.execute(
      'SELECT * FROM users_by_username WHERE username = ?',
      [receiverUsername.toLowerCase()],
      { prepare: true }
    );

    if (receiverResult.rows.length === 0) {
      return new NextResponse("User not found", { status: 404 });
    }

    const receiver = receiverResult.rows[0];

    // Can't send friend request to yourself
    if (receiver.id.toString() === profile.id) {
      return new NextResponse("Cannot send friend request to yourself", { status: 400 });
    }

    // Check if friend request already exists (both directions)
    const existingRequest1 = await db.execute(
      'SELECT * FROM friend_requests_by_users WHERE user_one_id = ? AND user_two_id = ?',
      [profile.id, receiver.id],
      { prepare: true }
    );

    const existingRequest2 = await db.execute(
      'SELECT * FROM friend_requests_by_users WHERE user_one_id = ? AND user_two_id = ?',
      [receiver.id, profile.id],
      { prepare: true }
    );

    if (existingRequest1.rows.length > 0 || existingRequest2.rows.length > 0) {
      return new NextResponse("Friend request already exists", { status: 409 });
    }

    // Check if already friends
    const existingFriend = await db.execute(
      'SELECT * FROM friends_by_user WHERE user_id = ? AND friend_id = ?',
      [profile.id, receiver.id],
      { prepare: true }
    );

    if (existingFriend.rows.length > 0) {
      return new NextResponse("Already friends", { status: 409 });
    }

    // Create friend request
    const requestId = uuidv4();
    const now = new Date();

    const queries = [
      {
        query: `INSERT INTO friend_requests_by_id (id, sender_id, receiver_id, status, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?)`,
        params: [requestId, profile.id, receiver.id, 'PENDING', now, now]
      },
      {
        query: `INSERT INTO friend_requests_by_sender (sender_id, created_at, id, receiver_id, receiver_username, receiver_name, receiver_image_url, status, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [profile.id, now, requestId, receiver.id, receiver.username, receiver.name, receiver.image_url, 'PENDING', now]
      },
      {
        query: `INSERT INTO friend_requests_by_receiver (receiver_id, created_at, id, sender_id, sender_username, sender_name, sender_image_url, status, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [receiver.id, now, requestId, profile.id, profile.userId || profile.name, profile.name, profile.imageUrl, 'PENDING', now]
      },
      {
        query: `INSERT INTO friend_requests_by_users (user_one_id, user_two_id, id, status, created_at) 
                VALUES (?, ?, ?, ?, ?)`,
        params: [profile.id, receiver.id, requestId, 'PENDING', now]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({
      id: requestId,
      senderId: profile.id,
      receiverId: receiver.id,
      receiverUsername: receiver.username,
      receiverName: receiver.name,
      status: 'PENDING',
      createdAt: now
    });
  } catch (error) {
    console.log("[SEND FRIEND REQUEST ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Get all friend requests (sent and received)
export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'sent' or 'received'

    if (type === "sent") {
      // Get sent requests
      const sentRequests = await db.execute(
        'SELECT * FROM friend_requests_by_sender WHERE sender_id = ?',
        [profile.id],
        { prepare: true }
      );

      return NextResponse.json(sentRequests.rows);
    } else if (type === "received") {
      // Get received requests
      const receivedRequests = await db.execute(
        'SELECT * FROM friend_requests_by_receiver WHERE receiver_id = ?',
        [profile.id],
        { prepare: true }
      );

      return NextResponse.json(receivedRequests.rows);
    } else {
      // Get both
      const [sentRequests, receivedRequests] = await Promise.all([
        db.execute(
          'SELECT * FROM friend_requests_by_sender WHERE sender_id = ?',
          [profile.id],
          { prepare: true }
        ),
        db.execute(
          'SELECT * FROM friend_requests_by_receiver WHERE receiver_id = ?',
          [profile.id],
          { prepare: true }
        )
      ]);

      return NextResponse.json({
        sent: sentRequests.rows,
        received: receivedRequests.rows
      });
    }
  } catch (error) {
    console.log("[GET FRIEND REQUESTS ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
