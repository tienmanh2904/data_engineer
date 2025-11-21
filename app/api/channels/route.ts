import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/currentProfile";
import { MemberRole, ChannelType } from "@/types/cassandra";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const { name, type } = await req.json();
    if (!serverId) {
      return new NextResponse("serverId is required", { status: 400 });
    }
    if (name === "general") {
      return new NextResponse("'general' is a reserved name", { status: 400 });
    }

    // Verify user is admin or moderator
    const memberResult = await db.execute(
      'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
      [profile.id, serverId],
      { prepare: true }
    );

    if (memberResult.rows.length === 0) {
      return new NextResponse("Not a member of this server", { status: 403 });
    }

    const member = memberResult.rows[0];
    if (member.role !== MemberRole.ADMIN && member.role !== MemberRole.MODERATOR) {
      return new NextResponse("Insufficient permissions", { status: 403 });
    }

    const channelId = uuidv4();
    const now = new Date();

    // Insert channel into multiple tables
    const queries = [
      // Insert into channels_by_id
      {
        query: 'INSERT INTO channels_by_id (id, name, type, server_id, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [channelId, name, type, serverId, profile.id, now, now]
      },
      // Insert into channels_by_server
      {
        query: 'INSERT INTO channels_by_server (server_id, created_at, id, name, type, profile_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [serverId, now, channelId, name, type, profile.id, now]
      }
    ];

    await db.batch(queries, { prepare: true });

    // Get server info to return
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ?',
      [serverId],
      { prepare: true }
    );

    if (serverResult.rows.length > 0) {
      const server = serverResult.rows[0];
      return NextResponse.json({
        id: server.id,
        name: server.name,
        imageUrl: server.image_url,
        inviteCode: server.invite_code,
        profileId: server.profile_id,
        createdAt: server.created_at,
        updatedAt: server.updated_at
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[Channel Route Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
