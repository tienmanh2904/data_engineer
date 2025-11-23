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

    if (!content && !fileUrl) {
      return res.status(400).json({ message: "Content or file url is required" });
    }

    // 1. Get the conversation
    const conversationResult = await db.execute(
      "SELECT * FROM conversations_by_id WHERE id = ?",
      [conversationId as string],
      { prepare: true }
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const conversation = conversationResult.rows[0];

    // 2. Determine Membership
    // The conversation participants (member_one_id, member_two_id) could be:
    // A) Profile IDs (Friend Chat)
    // B) Server Member IDs (Server Chat)

    let member = null;

    // CHECK A: Is this a Friend Chat? (Are IDs equal to Profile IDs?)
    const memberOneId = conversation.member_one_id.toString();
    const memberTwoId = conversation.member_two_id.toString();
    const profileId = profile.id.toString();

    if (memberOneId === profileId || memberTwoId === profileId) {
      // It is a Friend Conversation.
      // We create a "synthetic" member object using the Profile data.
      member = {
        id: profileId, // For friend chats, Member ID is the Profile ID
        role: "GUEST",
        profile_id: profileId,
        server_id: "direct-message", // Placeholder for friend chats
        created_at: new Date(),
        updated_at: new Date(),
      };
    } else {
      // CHECK B: Is this a Server Member Chat? (Look up Member tables)
      const memberOneResult = await db.execute(
        "SELECT * FROM members_by_id WHERE id = ?",
        [conversation.member_one_id],
        { prepare: true }
      );

      const memberTwoResult = await db.execute(
        "SELECT * FROM members_by_id WHERE id = ?",
        [conversation.member_two_id],
        { prepare: true }
      );

      if (memberOneResult.rows.length === 0 || memberTwoResult.rows.length === 0) {
        return res.status(404).json({ message: "Members not found" });
      }

      const memberOne = memberOneResult.rows[0];
      const memberTwo = memberTwoResult.rows[0];

      // Check if the current profile owns one of these member records
      if (memberOne.profile_id.toString() === profile.id) {
        member = memberOne;
      } else if (memberTwo.profile_id.toString() === profile.id) {
        member = memberTwo;
      }
    }

    // 3. Final Verification
    if (!member) {
      return res.status(403).json({ message: "Not part of this conversation" });
    }

    // 4. Create and Insert Message
    const messageId = uuidv4();
    const now = new Date();

    await db.execute(
      `INSERT INTO direct_messages_by_conversation (
        conversation_id, 
        created_at, 
        id, 
        content, 
        file_url, 
        member_id, 
        member_profile_id, 
        member_profile_name, 
        member_profile_image_url, 
        deleted, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        now,
        messageId,
        content,
        fileUrl || null,
        member.id,          // Either ServerMemberID or ProfileID (for friends)
        profile.id,         // Always the ProfileID
        profile.name,
        profile.imageUrl,
        false,
        now,
      ],
      { prepare: true }
    );

    // 5. Construct Response Object
    // This matches the structure expected by the frontend (MessageWithMemberAndProfile)
    const message = {
      id: messageId,
      content,
      fileUrl: fileUrl || null,
      memberId: member.id.toString(),
      conversationId: conversationId as string,
      deleted: false,
      createdAt: now.toISOString(), // Standardize to ISO string for frontend serialization
      updatedAt: now.toISOString(),
      member: {
        id: member.id.toString(),
        role: member.role,
        profileId: profile.id,
        serverId: member.server_id ? member.server_id.toString() : "direct-message",
        createdAt: member.created_at,
        updatedAt: member.updated_at,
        profile: {
          id: profile.id,
          userId: profile.userId,
          name: profile.name,
          imageUrl: profile.imageUrl,
          email: profile.email,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      },
    };

    // 6. Emit Socket Event
    const channelKey = `chat:${conversationId}:messages`;
    res?.socket?.server?.io?.emit(channelKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.log("[DIRECT_MESSAGE_POST_ERROR]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}