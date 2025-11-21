import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/currentProfile";
import { v4 as uuidv4 } from "uuid";
import { MemberRole, ChannelType } from "@/types/cassandra";

export async function POST(req: Request) {
  try {
    const { name, imageUrl } = await req.json();
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const serverId = uuidv4();
    const channelId = uuidv4();
    const memberId = uuidv4();
    const inviteCode = uuidv4();
    const now = new Date();

    // Batch insert for server creation with channel and member
    const queries = [
      // Insert server
      {
        query: 'INSERT INTO servers_by_id (id, name, image_url, invite_code, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [serverId, name, imageUrl, inviteCode, profile.id, now, now]
      },
      // Insert invite code lookup
      {
        query: 'INSERT INTO servers_by_invite_code (invite_code, server_id, server_name, server_image_url) VALUES (?, ?, ?, ?)',
        params: [inviteCode, serverId, name, imageUrl]
      },
      // Insert server-profile relationship
      {
        query: 'INSERT INTO servers_by_profile (profile_id, server_id, server_name, server_image_url, member_role, joined_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [profile.id, serverId, name, imageUrl, MemberRole.ADMIN, now]
      },
      // Insert general channel
      {
        query: 'INSERT INTO channels_by_id (id, name, type, server_id, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [channelId, 'general', ChannelType.TEXT, serverId, profile.id, now, now]
      },
      // Insert channel-server relationship
      {
        query: 'INSERT INTO channels_by_server (server_id, created_at, id, name, type, profile_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        params: [serverId, now, channelId, 'general', ChannelType.TEXT, profile.id, now]
      },
      // Insert member
      {
        query: 'INSERT INTO members_by_id (id, role, profile_id, server_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [memberId, MemberRole.ADMIN, profile.id, serverId, now, now]
      },
      // Insert member-server relationship
      {
        query: 'INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [serverId, MemberRole.ADMIN, memberId, profile.id, profile.name, profile.imageUrl, profile.email, now, now]
      },
      // Insert member lookup by profile and server
      {
        query: 'INSERT INTO members_by_profile_and_server (profile_id, server_id, id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [profile.id, serverId, memberId, MemberRole.ADMIN, now, now]
      }
    ];

    await db.batch(queries, { prepare: true });

    return NextResponse.json({
      id: serverId,
      name,
      imageUrl,
      inviteCode,
      profileId: profile.id,
      createdAt: now,
      updatedAt: now
    });
  } catch (error: any) {
    console.log("[SERVERS_POST]", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
