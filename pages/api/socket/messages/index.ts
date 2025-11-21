import { currentProfilePages } from "@/lib/currentProfilePage";
import { db } from "@/lib/db";
import { NextApiResponseServerIO } from "@/types/ServerType";
import { NextApiRequest } from "next";
import { v4 as uuidv4 } from "uuid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  try {
    const profile = await currentProfilePages(req);
    const { content, fileUrl } = req.body;
    const { serverId, channelId } = req.query;
    
    if (!profile) return res.status(401).json({ message: "Unauthorized" });
    if (!serverId) return res.status(400).json({ message: "Server id is required" });
    if (!channelId) return res.status(400).json({ message: "Channel id is required" });
    if (!content) return res.status(400).json({ message: "Content is required" });

    // Verify server membership
    const memberResult = await db.execute(
      'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
      [profile.id, serverId as string],
      { prepare: true }
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ message: "Not a member of this server" });
    }

    const member = memberResult.rows[0];

    // Verify channel exists
    const channelResult = await db.execute(
      'SELECT * FROM channels_by_id WHERE id = ?',
      [channelId as string],
      { prepare: true }
    );

    if (channelResult.rows.length === 0) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const channel = channelResult.rows[0];

    if (channel.server_id.toString() !== (serverId as string)) {
       return res.status(404).json({ message: "Channel not found in this server" });
    }

    const messageId = uuidv4();
    const now = new Date();

    // FIX: Insert into BOTH tables (Lookup Table + Main Table)
    const queries = [
      {
        // 1. Lookup Table (Needed for Deleting/Editing later)
        query: `INSERT INTO messages_by_id (id, content, file_url, member_id, channel_id, deleted, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [messageId, content, fileUrl || null, member.id, channelId, false, now, now]
      },
      {
        // 2. Main Channel Feed
        query: `INSERT INTO messages_by_channel (channel_id, created_at, id, content, file_url, member_id, member_profile_id, member_profile_name, member_profile_image_url, member_role, deleted, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [channelId, now, messageId, content, fileUrl || null, member.id, profile.id, profile.name, profile.imageUrl, member.role, false, now]
      }
    ];

    await db.batch(queries, { prepare: true });

    const message = {
      id: messageId,
      content,
      fileUrl: fileUrl || null,
      memberId: member.id,
      channelId: channelId as string,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      member: {
        id: member.id,
        role: member.role,
        profileId: profile.id,
        serverId: serverId as string,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
        profile: {
          id: profile.id,
          userId: profile.userId,
          name: profile.name,
          imageUrl: profile.imageUrl,
          email: profile.email,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        }
      }
    };

    const channelKey = `chat:${channelId}:messages`;
    res?.socket?.server?.io?.emit(channelKey, message);
    return res.status(200).json(message);
  } catch (error) {
    console.log("[MESSAGE_POST_ERROR]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}