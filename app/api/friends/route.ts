import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
// Get all friends for the current user
export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const friendsResult = await db.execute(
      'SELECT * FROM friends_by_user WHERE user_id = ?',
      [profile.id],
      { prepare: true }
    );

    return NextResponse.json(friendsResult.rows);
  } catch (error) {
    console.log("[GET FRIENDS ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
