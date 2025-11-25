import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";

// Remove a friend
export async function DELETE(
  req: Request,
  { params }: { params: { friendId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { friendId } = params;

    // Verify friendship exists
    // FIX: Added ALLOW FILTERING because we are skipping 'became_friends_at'
    const friendshipResult = await db.execute(
      'SELECT * FROM friends_by_user WHERE user_id = ? AND friend_id = ? ALLOW FILTERING',
      [profile.id, friendId],
      { prepare: true }
    );

    if (friendshipResult.rows.length === 0) {
      return new NextResponse("Friendship not found", { status: 404 });
    }

    const friendship = friendshipResult.rows[0];

    // Delete friendship from both sides
    const queries = [
      // Remove from current user's friends
      {
        query: 'DELETE FROM friends_by_user WHERE user_id = ? AND became_friends_at = ? AND friend_id = ?',
        params: [profile.id, friendship.became_friends_at, friendId]
      },
    ];

    // Get reverse friendship
    // FIX: Added ALLOW FILTERING here as well for the reverse lookup
    const reverseFriendshipResult = await db.execute(
      'SELECT * FROM friends_by_user WHERE user_id = ? AND friend_id = ? ALLOW FILTERING',
      [friendId, profile.id],
      { prepare: true }
    );

    if (reverseFriendshipResult.rows.length > 0) {
      const reverseFriendship = reverseFriendshipResult.rows[0];
      queries.push({
        query: 'DELETE FROM friends_by_user WHERE user_id = ? AND became_friends_at = ? AND friend_id = ?',
        params: [friendId, reverseFriendship.became_friends_at, profile.id]
      });
    }

    await db.batch(queries, { prepare: true });

    return NextResponse.json({ message: "Friend removed" });
  } catch (error) {
    console.log("[DELETE FRIEND ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}