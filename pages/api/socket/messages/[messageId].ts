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

    if (!profile) return res.status(401).json({ error: "Unauthorized" });
    if (!serverId) return res.status(400).json({ error: "Server ID Missing" });
    if (!channelId) return res.status(400).json({ error: "Channel ID Missing" });

    // 1. Verify server membership
    const memberResult = await db.execute(
      'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
      [profile.id, serverId as string],
      { prepare: true }
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: "Not a member of this server" });
    }
    const member = memberResult.rows[0];

    // 2. Verify channel exists & matches server
    const channelResult = await db.execute(
      'SELECT * FROM channels_by_id WHERE id = ?',
      [channelId as string],
      { prepare: true }
    );

    if (channelResult.rows.length === 0) {
      return res.status(404).json({ error: "Channel not found" });
    }
    const channel = channelResult.rows[0];

    if (channel.server_id.toString() !== (serverId as string)) {
       return res.status(404).json({ message: "Channel not found in this server" });
    }

    // 3. FIX: Fetch from 'messages_by_id' FIRST to get the 'created_at' timestamp
    const messageLookupResult = await db.execute(
      'SELECT * FROM messages_by_id WHERE id = ?',
      [messageId as string],
      { prepare: true }
    );

    if (messageLookupResult.rows.length === 0) {
      return res.status(404).json({ error: "Message Not Found" });
    }

    const messageMeta = messageLookupResult.rows[0];

    // Verify consistency
    if (messageMeta.channel_id.toString() !== (channelId as string)) {
        return res.status(404).json({ error: "Message not found in this channel" });
    }

    // 4. Now fetch the full message details from 'messages_by_channel' 
    // We can now use 'created_at' to satisfy the Primary Key requirements
    const fullMessageResult = await db.execute(
        'SELECT * FROM messages_by_channel WHERE channel_id = ? AND created_at = ? AND id = ?',
        [channelId, messageMeta.created_at, messageId],
        { prepare: true }
    );

    if(fullMessageResult.rows.length === 0) {
        return res.status(404).json({ error: "Message details not found" });
    }

    const message = fullMessageResult.rows[0];

    if (message.deleted) {
      return res.status(404).json({ error: "Message already deleted" });
    }

    const isMessageOwner = message.member_id.toString() === member.id.toString();
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const canModify = isMessageOwner || isAdmin || isModerator;

    if (!canModify) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let updatedMessage;
    const now = new Date();
    // Use the original created_at for the WHERE clause
    const messageCreatedAt = message.created_at; 

    if (req.method === "DELETE") {
      // 5. DELETE: Must update BOTH tables (by_id and by_channel)
      const queries = [
        {
          // Update generic lookup table
          query: 'UPDATE messages_by_id SET deleted = ?, file_url = ?, content = ?, updated_at = ? WHERE id = ?',
          params: [true, '', 'This Message Has Been Deleted', now, messageId]
        },
        {
          // Update channel specific table (Requires created_at)
          query: 'UPDATE messages_by_channel SET deleted = ?, file_url = ?, content = ?, updated_at = ? WHERE channel_id = ? AND created_at = ? AND id = ?',
          params: [true, '', 'This Message Has Been Deleted', now, channelId, messageCreatedAt, messageId]
        }
      ];

      await db.batch(queries, { prepare: true });

      updatedMessage = {
        id: message.id,
        content: 'This Message Has Been Deleted',
        fileUrl: '',
        memberId: message.member_id,
        channelId: message.channel_id,
        deleted: true,
        createdAt: messageCreatedAt,
        updatedAt: now,
        member: {
          id: message.member_id,
          role: message.member_role,
          profileId: message.member_profile_id,
          serverId: serverId as string,
          createdAt: message.created_at, // approximate
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

      // 5. PATCH: Must update BOTH tables
      const queries = [
        {
            query: 'UPDATE messages_by_id SET content = ?, updated_at = ? WHERE id = ?',
            params: [content, now, messageId]
        },
        {
            // Requires created_at
            query: 'UPDATE messages_by_channel SET content = ?, updated_at = ? WHERE channel_id = ? AND created_at = ? AND id = ?',
            params: [content, now, channelId, messageCreatedAt, messageId]
        }
      ];

      await db.batch(queries, { prepare: true });

      updatedMessage = {
        id: message.id,
        content,
        fileUrl: message.file_url,
        memberId: message.member_id,
        channelId: message.channel_id,
        deleted: false,
        createdAt: messageCreatedAt,
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