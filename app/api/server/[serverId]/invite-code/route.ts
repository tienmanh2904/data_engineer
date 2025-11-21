import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function PATCH(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!params.serverId) {
      return new NextResponse("Bad Request Server Id Missing", { status: 400 });
    }
    const { serverId } = params;

    // Verify ownership and get current server
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ? AND profile_id = ?',
      [serverId, profile.id],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Unauthorized or Server not found", { status: 403 });
    }

    const oldServer = serverResult.rows[0];
    const newInviteCode = uuidv4();
    const now = new Date();

    // Update invite code in multiple tables
    const queries = [
      // Update main server table
      {
        query: 'UPDATE servers_by_id SET invite_code = ?, updated_at = ? WHERE id = ?',
        params: [newInviteCode, now, serverId]
      },
      // Delete old invite code lookup
      {
        query: 'DELETE FROM servers_by_invite_code WHERE invite_code = ?',
        params: [oldServer.invite_code]
      },
      // Insert new invite code lookup
      {
        query: 'INSERT INTO servers_by_invite_code (invite_code, server_id, server_name, server_image_url) VALUES (?, ?, ?, ?)',
        params: [newInviteCode, serverId, oldServer.name, oldServer.image_url]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({
      id: serverId,
      name: oldServer.name,
      imageUrl: oldServer.image_url,
      inviteCode: newInviteCode,
      profileId: profile.id,
      createdAt: oldServer.created_at,
      updatedAt: now
    });
  } catch (error) {
    console.log("[Generate Invite Code Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
