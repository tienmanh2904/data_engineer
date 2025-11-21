import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/currentProfile";
import { MemberRole } from "@/types/cassandra";

export async function DELETE(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });
    const { channelId } = params;
    if (!channelId) {
      return new NextResponse("Channel ID Required", { status: 400 });
    }
    const serverId = searchParams.get("serverId");
    if (!serverId) {
      return new NextResponse("Server ID Required", { status: 400 });
    }

    // Get channel to verify it's not "general"
    const channelResult = await db.execute(
      'SELECT * FROM channels_by_id WHERE id = ? AND server_id = ?',
      [channelId, serverId],
      { prepare: true }
    );

    if (channelResult.rows.length === 0) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const channel = channelResult.rows[0];
    if (channel.name === "general") {
      return new NextResponse("Cannot delete general channel", { status: 400 });
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

    // Delete channel from multiple tables
    const queries = [
      {
        query: 'DELETE FROM channels_by_id WHERE id = ?',
        params: [channelId]
      },
      {
        query: 'DELETE FROM channels_by_server WHERE server_id = ? AND id = ?',
        params: [serverId, channelId]
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
    console.log("[CHANNEL DELETE ERROR]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();
    const { channelId } = params;
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const { name, type } = await req.json();
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });
    if (!channelId) {
      return new NextResponse("Channel ID Required", { status: 400 });
    }
    if (!serverId) {
      return new NextResponse("Server ID Required", { status: 400 });
    }
    if (name === "general") {
      return new NextResponse("Cannot edit general channel", { status: 400 });
    }

    // Get channel to verify it's not "general"
    const channelResult = await db.execute(
      'SELECT * FROM channels_by_id WHERE id = ? AND server_id = ?',
      [channelId, serverId],
      { prepare: true }
    );

    if (channelResult.rows.length === 0) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const channel = channelResult.rows[0];
    if (channel.name === "general") {
      return new NextResponse("Cannot edit general channel", { status: 400 });
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

    const now = new Date();

    // Update channel in multiple tables
    const queries = [
      {
        query: 'UPDATE channels_by_id SET name = ?, type = ?, updated_at = ? WHERE id = ?',
        params: [name, type, now, channelId]
      },
      {
        query: 'UPDATE channels_by_server SET name = ?, type = ?, updated_at = ? WHERE server_id = ? AND id = ?',
        params: [name, type, now, serverId, channelId]
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
    console.log("[CHANNEL_EDIT_ERROR]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
