import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/currentProfile";
import { MemberRole } from "@/types/cassandra";

export async function PATCH(
  req: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const { memberId } = params;
    const { role } = await req.json();
    if (!serverId) {
      return new NextResponse("Server Id Missing", { status: 400 });
    }
    if (!memberId) {
      return new NextResponse("Member Id Missing", { status: 400 });
    }

    // Verify user is the server owner
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ? AND profile_id = ? ALLOW FILTERING',
      [serverId, profile.id],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Only server owner can change roles", { status: 403 });
    }

    // Get member to update
    const memberResult = await db.execute(
      'SELECT * FROM members_by_id WHERE id = ?',
      [memberId],
      { prepare: true }
    );

    if (memberResult.rows.length === 0) {
      return new NextResponse("Member not found", { status: 404 });
    }

    const member = memberResult.rows[0];

    // Cannot change own role
    if (member.profile_id === profile.id) {
      return new NextResponse("Cannot change your own role", { status: 403 });
    }

    // Get member's profile info for denormalized update
    const profileResult = await db.execute(
      'SELECT * FROM profiles_by_id WHERE id = ?',
      [member.profile_id],
      { prepare: true }
    );

    if (profileResult.rows.length === 0) {
      return new NextResponse("Member profile not found", { status: 404 });
    }

    const memberProfile = profileResult.rows[0];
    const now = new Date();

    // Get joined_at for servers_by_profile update
    const serverByProfileResult = await db.execute(
      'SELECT joined_at FROM servers_by_profile WHERE profile_id = ? AND server_id = ? ALLOW FILTERING',
      [member.profile_id, serverId],
      { prepare: true }
    );

    const joinedAt = serverByProfileResult.rows[0]?.joined_at;

    // Update member role in multiple tables
    const queries = [
      {
        query: 'UPDATE members_by_id SET role = ?, updated_at = ? WHERE id = ?',
        params: [role, now, memberId]
      },
      {
        query: 'UPDATE members_by_server SET role = ?, updated_at = ? WHERE server_id = ? AND role = ? AND id = ?',
        params: [role, now, serverId, member.role, memberId]
      },
      {
        query: 'UPDATE members_by_profile_and_server SET role = ?, updated_at = ? WHERE profile_id = ? AND server_id = ?',
        params: [role, now, member.profile_id, serverId]
      }
    ];

    // Only add servers_by_profile update if we found the record
    if (joinedAt) {
      queries.push({
        query: 'UPDATE servers_by_profile SET member_role = ? WHERE profile_id = ? AND joined_at = ? AND server_id = ?',
        params: [role, member.profile_id, joinedAt, serverId]
      });
    }

    await db.batch(queries, { prepare: true });

    // Get updated server with members
    const server = serverResult.rows[0];
    const membersResult = await db.execute(
      'SELECT * FROM members_by_server WHERE server_id = ?',
      [serverId],
      { prepare: true }
    );

    const members = membersResult.rows.map(m => ({
      id: m.id,
      role: m.role,
      profileId: m.profile_id,
      serverId: m.server_id,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      profile: {
        id: m.profile_id,
        userId: '',
        name: m.profile_name,
        imageUrl: m.profile_image_url,
        email: m.profile_email,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }
    }));

    return NextResponse.json({
      id: server.id,
      name: server.name,
      imageUrl: server.image_url,
      inviteCode: server.invite_code,
      profileId: server.profile_id,
      createdAt: server.created_at,
      updatedAt: server.updated_at,
      members
    });
  } catch (error) {
    console.log("[Role Change Route Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { memberId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");
    const { memberId } = params;
    if (!serverId) {
      return new NextResponse("Server Id Missing", { status: 400 });
    }
    if (!memberId) {
      return new NextResponse("Member Id Missing", { status: 400 });
    }

    // Verify user is the server owner
    const serverResult = await db.execute(
      'SELECT * FROM servers_by_id WHERE id = ? AND profile_id = ? ALLOW FILTERING',
      [serverId, profile.id],
      { prepare: true }
    );

    if (serverResult.rows.length === 0) {
      return new NextResponse("Only server owner can kick members", { status: 403 });
    }

    // Get member to delete
    const memberResult = await db.execute(
      'SELECT * FROM members_by_id WHERE id = ?',
      [memberId],
      { prepare: true }
    );

    if (memberResult.rows.length === 0) {
      return new NextResponse("Member not found", { status: 404 });
    }

    const member = memberResult.rows[0];

    // Cannot kick yourself
    if (member.profile_id === profile.id) {
      return new NextResponse("Cannot kick yourself", { status: 403 });
    }

    // Get joined_at for servers_by_profile deletion
    const serverByProfileResult = await db.execute(
      'SELECT joined_at FROM servers_by_profile WHERE profile_id = ? AND server_id = ? ALLOW FILTERING',
      [member.profile_id, serverId],
      { prepare: true }
    );

    const joinedAt = serverByProfileResult.rows[0]?.joined_at;

    // Delete member from multiple tables
    const queries = [
      {
        query: 'DELETE FROM members_by_id WHERE id = ?',
        params: [memberId]
      },
      {
        query: 'DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?',
        params: [serverId, member.role, memberId]
      },
      {
        query: 'DELETE FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
        params: [member.profile_id, serverId]
      }
    ];

    // Only add servers_by_profile deletion if we found the record
    if (joinedAt) {
      queries.push({
        query: 'DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?',
        params: [member.profile_id, joinedAt, serverId]
      });
    }

    await db.batch(queries, { prepare: true });

    // Get updated server with members
    const server = serverResult.rows[0];
    const membersResult = await db.execute(
      'SELECT * FROM members_by_server WHERE server_id = ?',
      [serverId],
      { prepare: true }
    );

    const members = membersResult.rows.map(m => ({
      id: m.id,
      role: m.role,
      profileId: m.profile_id,
      serverId: m.server_id,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      profile: {
        id: m.profile_id,
        userId: '',
        name: m.profile_name,
        imageUrl: m.profile_image_url,
        email: m.profile_email,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }
    }));

    return NextResponse.json({
      id: server.id,
      name: server.name,
      imageUrl: server.image_url,
      inviteCode: server.invite_code,
      profileId: server.profile_id,
      createdAt: server.created_at,
      updatedAt: server.updated_at,
      members
    });
  } catch (error) {
    console.log("[Kick out Error]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
