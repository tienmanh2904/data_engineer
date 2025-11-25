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

    // 1. Verify ownership
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ? AND profile_id = ? ALLOW FILTERING',
      [serverId, profile.id],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Unauthorized or Server not found", { status: 403 });
    }

    const oldServer = serverResult.rows[0];
    const now = new Date();

    // 2. FETCH MISSING KEY: Get 'joined_at' from servers_by_profile
    // We need this to update the specific row in servers_by_profile
    const profileLinkResult = await db.execute(
      'SELECT joined_at FROM servers_by_profile WHERE profile_id = ? AND server_id = ? ALLOW FILTERING',
      [profile.id, serverId],
      { prepare: true }
    );

    const joinedAt = profileLinkResult.rows.length > 0 ? profileLinkResult.rows[0].joined_at : null;

    // 3. Prepare Update Queries
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
      }
    ];

    // Only add the profile update if we found the valid clustering key
    if (joinedAt) {
      queries.push({
        query: 'UPDATE servers_by_profile SET server_name = ?, server_image_url = ? WHERE profile_id = ? AND joined_at = ? AND server_id = ?',
        params: [name, imageUrl, profile.id, joinedAt, serverId]
      });
    }

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
    console.log("[SERVER_PATCH_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
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

    // 1. Verify ownership
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ? AND profile_id = ? ALLOW FILTERING',
      [serverId, profile.id],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Unauthorized or Server not found", { status: 403 });
    }

    const server = serverResult.rows[0];

    // 2. FETCH MISSING KEY: Get 'joined_at' from servers_by_profile
    const profileLinkResult = await db.execute(
      'SELECT joined_at FROM servers_by_profile WHERE profile_id = ? AND server_id = ? ALLOW FILTERING',
      [profile.id, serverId],
      { prepare: true }
    );

    const joinedAt = profileLinkResult.rows.length > 0 ? profileLinkResult.rows[0].joined_at : null;

    // 3. Prepare Delete Queries
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
      }
    ];

    // Only add the profile delete if we found the valid clustering key
    if (joinedAt) {
      queries.push({
        query: 'DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?',
        params: [profile.id, joinedAt, serverId]
      });
    }

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
    console.log("[SERVER_DELETE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}