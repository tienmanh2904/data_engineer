import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/currentProfile";

export async function PATCH(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { serverId } = params;
    if (!serverId) {
      return new NextResponse("Bad Request", { status: 400 });
    }
    const { name, imageUrl } = await req.json();

    // Verify ownership
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ? AND profile_id = ?',
      [serverId, profile.id],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Unauthorized or Server not found", { status: 403 });
    }

    const oldServer = serverResult.rows[0];
    const now = new Date();

    // Update server in multiple tables
    const queries = [
      // Update main server table
      {
        query: 'UPDATE servers_by_id SET name = ?, image_url = ?, updated_at = ? WHERE id = ?',
        params: [name, imageUrl, now, serverId]
      },
      // Update invite code lookup table
      {
        query: 'UPDATE servers_by_invite_code SET server_name = ?, server_image_url = ? WHERE invite_code = ?',
        params: [name, imageUrl, oldServer.invite_code]
      },
      // Update server-profile relationship
      {
        query: 'UPDATE servers_by_profile SET server_name = ?, server_image_url = ? WHERE profile_id = ? AND server_id = ?',
        params: [name, imageUrl, profile.id, serverId]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({
      id: serverId,
      name,
      imageUrl,
      inviteCode: oldServer.invite_code,
      profileId: profile.id,
      createdAt: oldServer.created_at,
      updatedAt: now
    });
  } catch (error) {
    console.log("[Server Setting Update Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req:Request,{ params }: { params: { serverId: string } }) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { serverId } = params;
    if (!serverId) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    // Verify ownership
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ? AND profile_id = ?',
      [serverId, profile.id],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Unauthorized or Server not found", { status: 403 });
    }

    const server = serverResult.rows[0];

    // Delete server from all tables (Note: In production, consider soft delete or cascade handling)
    const queries = [
      // Delete from main server table
      {
        query: 'DELETE FROM servers_by_id WHERE id = ?',
        params: [serverId]
      },
      // Delete from invite code lookup
      {
        query: 'DELETE FROM servers_by_invite_code WHERE invite_code = ?',
        params: [server.invite_code]
      },
      // Delete from server-profile relationship
      {
        query: 'DELETE FROM servers_by_profile WHERE profile_id = ? AND server_id = ?',
        params: [profile.id, serverId]
      }
    ];

    await db.batch(queries, { prepare: true });

    // Note: Consider also deleting related channels, members, and messages
    // This might require additional queries to get all related data first

    return NextResponse.json({
      id: server.id,
      name: server.name,
      imageUrl: server.image_url,
      inviteCode: server.invite_code,
      profileId: server.profile_id,
      createdAt: server.created_at,
      updatedAt: server.updated_at
    });
  } catch (error) {
    console.log("[SERVER_DELETE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
