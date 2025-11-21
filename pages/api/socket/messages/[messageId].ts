import { currentProfilePages } from "@/lib/currentProfilePage";
import { db } from "@/lib/db";
import { NextApiResponseServerIO } from "@/types/ServerType";
import { MemberRole } from "@/types/cassandra";
import { NextApiRequest } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (req.method !== "DELETE" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const profile = await currentProfilePages(req);
    const { messageId, serverId, channelId } = req.query;
    const { content } = req.body;
    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!serverId) {
      return res.status(400).json({ error: "Server ID Missing" });
    }
    if (!channelId) {
      return res.status(400).json({ error: "Channel ID Missing" });
    }

    // Verify server membership
    const memberResult = await db.execute(
      'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
      [profile.id, serverId as string],
      { prepare: true }
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: "Not a member of this server" });
    }

    const member = memberResult.rows[0];

    // Verify channel exists
    const channelResult = await db.execute(
      'SELECT * FROM channels_by_id WHERE id = ? AND server_id = ?',
      [channelId as string, serverId as string],
      { prepare: true }
    );

    if (channelResult.rows.length === 0) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Get message
    const messageResult = await db.execute(
      'SELECT * FROM messages_by_channel WHERE channel_id = ? AND id = ?',
      [channelId as string, messageId as string],
      { prepare: true }
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: "Message Not Found" });
    }

    const message = messageResult.rows[0];

    if (message.deleted) {
      return res.status(404).json({ error: "Message Not Found" });
    }

    const isMessageOwner = message.member_id === member.id;
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const canModify = isMessageOwner || isAdmin || isModerator;

    if (!canModify) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let updatedMessage;
    const now = new Date();

    if (req.method === "DELETE") {
      await db.execute(
        'UPDATE messages_by_channel SET deleted = ?, file_url = ?, content = ?, updated_at = ? WHERE channel_id = ? AND id = ?',
        [true, '', 'This Message Has Been Deleted', now, channelId, messageId],
        { prepare: true }
      );

      updatedMessage = {
        id: message.id,
        content: 'This Message Has Been Deleted',
        fileUrl: '',
        memberId: message.member_id,
        channelId: message.channel_id,
        deleted: true,
        createdAt: message.created_at,
        updatedAt: now,
        member: {
          id: message.member_id,
          role: message.member_role,
          profileId: message.member_profile_id,
          serverId: serverId as string,
          createdAt: message.created_at,
          updatedAt: now,
          profile: {
            id: message.member_profile_id,
            userId: '',
            name: message.member_profile_name,
            imageUrl: message.member_profile_image_url,
            email: '',
            createdAt: message.created_at,
            updatedAt: now
          }
        }
      };
    }
    
    if (req.method === "PATCH") {
      if (!isMessageOwner) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await db.execute(
        'UPDATE messages_by_channel SET content = ?, updated_at = ? WHERE channel_id = ? AND id = ?',
        [content, now, channelId, messageId],
        { prepare: true }
      );

      updatedMessage = {
        id: message.id,
        content,
        fileUrl: message.file_url,
        memberId: message.member_id,
        channelId: message.channel_id,
        deleted: false,
        createdAt: message.created_at,
        updatedAt: now,
        member: {
          id: message.member_id,
          role: message.member_role,
          profileId: message.member_profile_id,
          serverId: serverId as string,
          createdAt: message.created_at,
          updatedAt: now,
          profile: {
            id: message.member_profile_id,
            userId: '',
            name: message.member_profile_name,
            imageUrl: message.member_profile_image_url,
            email: '',
            createdAt: message.created_at,
            updatedAt: now
          }
        }
      };
    }

    const updateKey = `chat:${channelId}:messages:update`;

    res?.socket?.server?.io?.emit(updateKey, updatedMessage);
    return res.status(200).json(updatedMessage);
  } catch (error) {
    console.log("[MESSAGE_UPDATE_AT_PAGE_ROUTE_ERROR]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
