import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import { ConversationWithMembers, MemberRole } from "@/types/cassandra";

export const getOrCreateConversation = async (
  memberOneId: string,
  memberTwoId: string
): Promise<ConversationWithMembers | null> => {
  let conversation =
    (await findConversation(memberOneId, memberTwoId)) ||
    (await findConversation(memberTwoId, memberOneId));
  if (!conversation) {
    conversation = await createConversation(memberOneId, memberTwoId);
  }
  return conversation;
};

const findConversation = async (
  memberOneId: string,
  memberTwoId: string
): Promise<ConversationWithMembers | null> => {
  try {
    const result = await db.execute(
      'SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ?',
      [memberOneId, memberTwoId],
      { prepare: true }
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const conversationId = result.rows[0].id;
    
    // Get full conversation details with members
    const conversationResult = await db.execute(
      'SELECT * FROM conversations_by_id WHERE id = ?',
      [conversationId],
      { prepare: true }
    );
    
    if (conversationResult.rows.length === 0) {
      return null;
    }
    
    const conv = conversationResult.rows[0];
    
    // Get member one details
    const memberOneResult = await db.execute(
      'SELECT * FROM members_by_id WHERE id = ?',
      [conv.member_one_id],
      { prepare: true }
    );
    
    // Get member two details
    const memberTwoResult = await db.execute(
      'SELECT * FROM members_by_id WHERE id = ?',
      [conv.member_two_id],
      { prepare: true }
    );
    
    if (memberOneResult.rows.length === 0 || memberTwoResult.rows.length === 0) {
      return null;
    }
    
    const memberOne = memberOneResult.rows[0];
    const memberTwo = memberTwoResult.rows[0];
    
    // Get profiles
    const profileOneResult = await db.execute(
      'SELECT * FROM profiles_by_id WHERE id = ?',
      [memberOne.profile_id],
      { prepare: true }
    );
    
    const profileTwoResult = await db.execute(
      'SELECT * FROM profiles_by_id WHERE id = ?',
      [memberTwo.profile_id],
      { prepare: true }
    );
    
    if (profileOneResult.rows.length === 0 || profileTwoResult.rows.length === 0) {
      return null;
    }
    
    const profileOne = profileOneResult.rows[0];
    const profileTwo = profileTwoResult.rows[0];
    
    return {
      id: conv.id,
      memberOneId: conv.member_one_id,
      memberTwoId: conv.member_two_id,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      memberOne: {
        id: memberOne.id,
        role: memberOne.role as MemberRole,
        profileId: memberOne.profile_id,
        serverId: memberOne.server_id,
        createdAt: memberOne.created_at,
        updatedAt: memberOne.updated_at,
        profile: {
          id: profileOne.id,
          userId: profileOne.user_id,
          name: profileOne.name,
          imageUrl: profileOne.image_url,
          email: profileOne.email,
          createdAt: profileOne.created_at,
          updatedAt: profileOne.updated_at,
        }
      },
      memberTwo: {
        id: memberTwo.id,
        role: memberTwo.role as MemberRole,
        profileId: memberTwo.profile_id,
        serverId: memberTwo.server_id,
        createdAt: memberTwo.created_at,
        updatedAt: memberTwo.updated_at,
        profile: {
          id: profileTwo.id,
          userId: profileTwo.user_id,
          name: profileTwo.name,
          imageUrl: profileTwo.image_url,
          email: profileTwo.email,
          createdAt: profileTwo.created_at,
          updatedAt: profileTwo.updated_at,
        }
      }
    };
  } catch (error) {
    console.error('[FIND_CONVERSATION_ERROR]', error);
    return null;
  }
};

const createConversation = async (
  memberOneId: string,
  memberTwoId: string
): Promise<ConversationWithMembers | null> => {
  try {
    const conversationId = uuidv4();
    const now = new Date();
    
    const queries = [
      {
        query: 'INSERT INTO conversations_by_id (id, member_one_id, member_two_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        params: [conversationId, memberOneId, memberTwoId, now, now]
      },
      {
        query: 'INSERT INTO conversations_by_members (member_one_id, member_two_id, id, created_at) VALUES (?, ?, ?, ?)',
        params: [memberOneId, memberTwoId, conversationId, now]
      }
    ];
    
    await db.batch(queries, { prepare: true });
    
    // Return the created conversation with member details
    return await findConversation(memberOneId, memberTwoId);
  } catch (error) {
    console.error('[CREATE_CONVERSATION_ERROR]', error);
    return null;
  }
};

export const getOrCreateProfileConversation = async (
  profileOneId: string,
  profileTwoId: string
) => {
  let conversation =
    (await findProfileConversation(profileOneId, profileTwoId)) ||
    (await findProfileConversation(profileTwoId, profileOneId));

  if (!conversation) {
    conversation = await createProfileConversation(profileOneId, profileTwoId);
  }
  return conversation;
};

const findProfileConversation = async (
  profileOneId: string,
  profileTwoId: string
) => {
  try {
    const result = await db.execute(
      'SELECT * FROM conversations_by_profiles WHERE profile_one_id = ? AND profile_two_id = ?',
      [profileOneId, profileTwoId],
      { prepare: true }
    );

    if (result.rows.length === 0) return null;

    const conversationId = result.rows[0].id;
    
    // Get full conversation details
    const conversationResult = await db.execute(
      'SELECT * FROM conversations_by_id WHERE id = ?',
      [conversationId],
      { prepare: true }
    );

    if (conversationResult.rows.length === 0) return null;
    const conv = conversationResult.rows[0];

    // Fetch Profiles instead of Members
    const profileOneResult = await db.execute(
      'SELECT * FROM profiles_by_id WHERE id = ?',
      [conv.member_one_id], // In this context, member_one_id stores the PROFILE ID
      { prepare: true }
    );
    const profileTwoResult = await db.execute(
      'SELECT * FROM profiles_by_id WHERE id = ?',
      [conv.member_two_id], // In this context, member_two_id stores the PROFILE ID
      { prepare: true }
    );

    if (profileOneResult.rows.length === 0 || profileTwoResult.rows.length === 0) return null;

    return {
      id: conv.id,
      memberOneId: conv.member_one_id,
      memberTwoId: conv.member_two_id,
      memberOne: { profileId: conv.member_one_id, profile: profileOneResult.rows[0] }, // Mock Member Object
      memberTwo: { profileId: conv.member_two_id, profile: profileTwoResult.rows[0] }, // Mock Member Object
    };
  } catch (error) {
    return null;
  }
};

const createProfileConversation = async (
  profileOneId: string,
  profileTwoId: string
) => {
  try {
    const conversationId = uuidv4();
    const now = new Date();

    const queries = [
      {
        query: 'INSERT INTO conversations_by_id (id, member_one_id, member_two_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        params: [conversationId, profileOneId, profileTwoId, now, now]
      },
      {
        query: 'INSERT INTO conversations_by_profiles (profile_one_id, profile_two_id, id, created_at) VALUES (?, ?, ?, ?)',
        params: [profileOneId, profileTwoId, conversationId, now]
      }
    ];

    await db.batch(queries, { prepare: true });
    return await findProfileConversation(profileOneId, profileTwoId);
  } catch (error) {
    console.error('[CREATE_PROFILE_CONVERSATION_ERROR]', error);
    return null;
  }
};