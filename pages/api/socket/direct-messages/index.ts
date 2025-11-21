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
    const { conversationId } = req.query;
    if (!profile) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!conversationId) {
      return res.status(400).json({ message: "Conversation id is required" });
    }
    if (!content) {
      return res
        .status(400)
        .json({ message: "Content or file url is required" });
    }

    // Get conversation
    const conversationResult = await db.execute(
      'SELECT * FROM conversations_by_id WHERE id = ?',
      [conversationId as string],
      { prepare: true }
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const conversation = conversationResult.rows[0];

    // Verify user is part of conversation
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
      return res.status(404).json({ message: "Members not found" });
    }

    const memberOne = memberOneResult.rows[0];
    const memberTwo = memberTwoResult.rows[0];

    const member = memberOne.profile_id === profile.id ? memberOne : 
                   memberTwo.profile_id === profile.id ? memberTwo : null;

    if (!member) {
      return res.status(403).json({ message: "Not part of this conversation" });
    }

    const messageId = uuidv4();
    const now = new Date();

    // Insert direct message with denormalized data
    await db.execute(
      'INSERT INTO direct_messages_by_conversation (conversation_id, created_at, id, content, file_url, member_id, member_profile_id, member_profile_name, member_profile_image_url, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [conversationId, now, messageId, content, fileUrl || null, member.id, profile.id, profile.name, profile.imageUrl, false, now],
      { prepare: true }
    );

    const message = {
      id: messageId,
      content,
      fileUrl: fileUrl || null,
      memberId: member.id,
      conversationId: conversationId as string,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      member: {
        id: member.id,
        role: member.role,
        profileId: profile.id,
        serverId: member.server_id,
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

    const channelKey = `chat:${conversationId}:messages`;
    res?.socket?.server?.io?.emit(channelKey, message);
    return res.status(200).json(message);
  } catch (error) {
    console.log("[DIRECT_MESSAGE_POST_ERROR]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
