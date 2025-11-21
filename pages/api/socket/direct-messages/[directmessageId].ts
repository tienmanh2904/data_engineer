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
    const { directmessageId, conversationId } = req.query;
    const { content } = req.body;
    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!directmessageId) {
      return res.status(400).json({ error: "Direct Message ID Missing" });
    }
    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID Missing" });
    }

    // Get conversation
    const conversationResult = await db.execute(
      'SELECT * FROM conversations_by_id WHERE id = ?',
      [conversationId as string],
      { prepare: true }
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: "Conversation Not Found" });
    }

    const conversation = conversationResult.rows[0];

    // Get members
    const memberOneResult = await db.execute(
      'SELECT * FROM members_by_id WHERE id = ?',
      [conversation.member_one_id],
      { prepare: true }
    );

    const memberTwoResult = await db.execute(
      'SELECT * FROM members_by_id WHERE id = ?',
      [conversation.member_two_id],
      { prepare: true }
    );

    if (memberOneResult.rows.length === 0 || memberTwoResult.rows.length === 0) {
      return res.status(404).json({ error: "Members not found" });
    }

    const memberOne = memberOneResult.rows[0];
    const memberTwo = memberTwoResult.rows[0];

    const member = memberOne.profile_id === profile.id ? memberOne : 
                   memberTwo.profile_id === profile.id ? memberTwo : null;

    if (!member) {
      return res.status(403).json({ error: "Not part of this conversation" });
    }

    // Get message
    const messageResult = await db.execute(
      'SELECT * FROM direct_messages_by_conversation WHERE conversation_id = ? AND id = ?',
      [conversationId as string, directmessageId as string],
      { prepare: true }
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: "Message Not Found" });
    }

    const directMessage = messageResult.rows[0];

    if (directMessage.deleted) {
      return res.status(404).json({ error: "Message Not Found" });
    }

    const isMessageOwner = directMessage.member_id === member.id;
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
        'UPDATE direct_messages_by_conversation SET deleted = ?, file_url = ?, content = ?, updated_at = ? WHERE conversation_id = ? AND id = ?',
        [true, '', 'This Message Has Been Deleted', now, conversationId, directmessageId],
        { prepare: true }
      );

      updatedMessage = {
        id: directMessage.id,
        content: 'This Message Has Been Deleted',
        fileUrl: '',
        memberId: directMessage.member_id,
        conversationId: directMessage.conversation_id,
        deleted: true,
        createdAt: directMessage.created_at,
        updatedAt: now,
        member: {
          id: directMessage.member_id,
          role: member.role,
          profileId: directMessage.member_profile_id,
          serverId: member.server_id,
          createdAt: directMessage.created_at,
          updatedAt: now,
          profile: {
            id: directMessage.member_profile_id,
            userId: '',
            name: directMessage.member_profile_name,
            imageUrl: directMessage.member_profile_image_url,
            email: '',
            createdAt: directMessage.created_at,
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
        'UPDATE direct_messages_by_conversation SET content = ?, updated_at = ? WHERE conversation_id = ? AND id = ?',
        [content, now, conversationId, directmessageId],
        { prepare: true }
      );

      updatedMessage = {
        id: directMessage.id,
        content,
        fileUrl: directMessage.file_url,
        memberId: directMessage.member_id,
        conversationId: directMessage.conversation_id,
        deleted: false,
        createdAt: directMessage.created_at,
        updatedAt: now,
        member: {
          id: directMessage.member_id,
          role: member.role,
          profileId: directMessage.member_profile_id,
          serverId: member.server_id,
          createdAt: directMessage.created_at,
          updatedAt: now,
          profile: {
            id: directMessage.member_profile_id,
            userId: '',
            name: directMessage.member_profile_name,
            imageUrl: directMessage.member_profile_image_url,
            email: '',
            createdAt: directMessage.created_at,
            updatedAt: now
          }
        }
      };
    }

    const updateKey = `chat:${conversation.id}:messages:update`;

    res?.socket?.server?.io?.emit(updateKey, updatedMessage);
    return res.status(200).json(updatedMessage);
  } catch (error) {
    console.log("[DIRECT_MESSAGE_UPDATE_AT_PAGE_ROUTE_ERROR]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
