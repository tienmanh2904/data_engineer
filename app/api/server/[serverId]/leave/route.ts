import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/currentProfile";
import { db } from "@/lib/db";
import { MemberRole } from "@/types/cassandra";
export const dynamic = "force-dynamic";
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
      return new NextResponse("Server ID missing", { status: 400 });
    }

    // 1. Get server to verify ownership
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ?',
      [serverId],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Server not found", { status: 404 });
    }

    const server = serverResult.rows[0];

    // Cannot leave if you're the owner
    if (server.profile_id.toString() === profile.id) {
      return new NextResponse("Cannot leave server you own", { status: 403 });
    }

    // 2. Get member info
    // We need 'role' (for members_by_server PK) and 'created_at' (for servers_by_profile PK)
    const memberResult = await db.execute(
      'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
      [profile.id, serverId],
      { prepare: true }
    );

    if (memberResult.rows.length === 0) {
      return new NextResponse("Not a member of this server", { status: 404 });
    }

    const member = memberResult.rows[0];
    
    // IMPORTANT: Capture these for the composite keys
    const memberRole = member.role;
    const joinedAt = member.created_at; // Corresponds to 'joined_at' in servers_by_profile

    // 3. Delete member from all tables
    const queries = [
      // Delete from members_by_id (PK: id)
      {
        query: 'DELETE FROM members_by_id WHERE id = ?',
        params: [member.id]
      },
      // Delete from members_by_server (PK: server_id, role, id)
      // FIX: Added 'role' to WHERE clause
      {
        query: 'DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?',
        params: [serverId, memberRole, member.id]
      },
      // Delete from members_by_profile_and_server (PK: profile_id, server_id)
      {
        query: 'DELETE FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
        params: [profile.id, serverId]
      },
      // Delete from servers_by_profile (PK: profile_id, joined_at, server_id)
      // FIX: Added 'joined_at' to WHERE clause
      {
        query: 'DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?',
        params: [profile.id, joinedAt, serverId]
      }
    ];

    await db.batch(queries, { prepare: true });

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
    console.log("[leave server error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}