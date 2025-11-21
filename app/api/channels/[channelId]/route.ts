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
    const { channelId } = params;

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });
    if (!channelId) return new NextResponse("Channel ID Required", { status: 400 });
    
    const serverId = searchParams.get("serverId");
    if (!serverId) return new NextResponse("Server ID Required", { status: 400 });

    // 1. Get channel by ID only (to avoid ALLOW FILTERING error)
    const channelResult = await db.execute(
      'SELECT * FROM channels_by_id WHERE id = ?',
      [channelId],
      { prepare: true }
    );

    if (channelResult.rows.length === 0) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const channel = channelResult.rows[0];

    // 2. Manually verify server_id matches
    if (channel.server_id.toString() !== serverId) {
        return new NextResponse("Channel not found", { status: 404 });
    }

    if (channel.name === "general") {
      return new NextResponse("Cannot delete general channel", { status: 400 });
    }

    // 3. Verify user is admin or moderator
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

    // 4. Capture created_at for the composite key in channels_by_server
    const channelCreatedAt = channel.created_at;

    // 5. Delete channel from multiple tables
    const queries = [
      {
        query: 'DELETE FROM channels_by_id WHERE id = ?',
        params: [channelId]
      },
      {
        // Fix: Added created_at to WHERE clause (Required for Primary Key)
        query: 'DELETE FROM channels_by_server WHERE server_id = ? AND created_at = ? AND id = ?',
        params: [serverId, channelCreatedAt, channelId]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[CHANNEL DELETE ERROR]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

// Note: Usually Edit is a PATCH request, but keeping POST as per your file
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
    if (!channelId) return new NextResponse("Channel ID Required", { status: 400 });
    if (!serverId) return new NextResponse("Server ID Required", { status: 400 });
    
    if (name === "general") {
      return new NextResponse("Cannot edit general channel", { status: 400 });
    }

    // 1. Get channel by ID only
    const channelResult = await db.execute(
      'SELECT * FROM channels_by_id WHERE id = ?',
      [channelId],
      { prepare: true }
    );

    if (channelResult.rows.length === 0) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const channel = channelResult.rows[0];

    // 2. Verify server_id matches
    if (channel.server_id.toString() !== serverId) {
        return new NextResponse("Channel not found", { status: 404 });
    }

    if (channel.name === "general") {
      return new NextResponse("Cannot edit general channel", { status: 400 });
    }
    
    // 3. Verify permissions
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
    // 4. Capture created_at for the composite key
    const channelCreatedAt = channel.created_at;

    // 5. Update channel in multiple tables
    const queries = [
      {
        query: 'UPDATE channels_by_id SET name = ?, type = ?, updated_at = ? WHERE id = ?',
        params: [name, type, now, channelId]
      },
      {
        // Fix: Added created_at to WHERE clause (Required for Primary Key)
        query: 'UPDATE channels_by_server SET name = ?, type = ?, updated_at = ? WHERE server_id = ? AND created_at = ? AND id = ?',
        params: [name, type, now, serverId, channelCreatedAt, channelId]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[CHANNEL_EDIT_ERROR]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}