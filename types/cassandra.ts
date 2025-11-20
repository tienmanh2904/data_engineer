// TypeScript type definitions for Cassandra models
// Replace @prisma/client imports with these types

export enum MemberRole {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  GUEST = 'GUEST'
}

export enum ChannelType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO'
}

// Base types matching Cassandra tables

export interface Profile {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Server {
  id: string;
  name: string;
  imageUrl: string;
  inviteCode: string;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  serverId: string;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  role: MemberRole;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  content: string;
  fileUrl?: string;
  memberId: string;
  channelId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  memberOneId: string;
  memberTwoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DirectMessage {
  id: string;
  content: string;
  fileUrl?: string;
  memberId: string;
  conversationId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extended types with relations (for frontend use)
// These types include denormalized data that comes from Cassandra queries

export interface MemberWithProfile extends Member {
  profile: Profile;
}

export interface MessageWithMember extends Message {
  member: MemberWithProfile;
}

export interface DirectMessageWithMember extends DirectMessage {
  member: MemberWithProfile;
}

export interface ServerWithMembersAndChannels extends Server {
  members: MemberWithProfile[];
  channels: Channel[];
}

export interface ConversationWithMembers extends Conversation {
  memberOne: MemberWithProfile;
  memberTwo: MemberWithProfile;
}

// Cassandra query result types (with denormalized fields)

export interface MessageFromChannel {
  channel_id: string;
  created_at: Date;
  id: string;
  content: string;
  file_url?: string;
  member_id: string;
  member_profile_id: string;
  member_profile_name: string;
  member_profile_image_url: string;
  member_role: MemberRole;
  deleted: boolean;
  updated_at: Date;
}

export interface DirectMessageFromConversation {
  conversation_id: string;
  created_at: Date;
  id: string;
  content: string;
  file_url?: string;
  member_id: string;
  member_profile_id: string;
  member_profile_name: string;
  member_profile_image_url: string;
  deleted: boolean;
  updated_at: Date;
}

export interface MemberFromServer {
  server_id: string;
  role: MemberRole;
  id: string;
  profile_id: string;
  profile_name: string;
  profile_image_url: string;
  profile_email: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChannelFromServer {
  server_id: string;
  created_at: Date;
  id: string;
  name: string;
  type: ChannelType;
  profile_id: string;
  updated_at: Date;
}

export interface ServerFromProfile {
  profile_id: string;
  joined_at: Date;
  server_id: string;
  member_role: MemberRole;
  server_image_url: string;
  server_name: string;
}

// Helper functions to convert Cassandra results to app types

export function messageFromChannelToMessage(row: MessageFromChannel): MessageWithMember {
  return {
    id: row.id,
    content: row.content,
    fileUrl: row.file_url,
    memberId: row.member_id,
    channelId: row.channel_id,
    deleted: row.deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    member: {
      id: row.member_id,
      role: row.member_role,
      profileId: row.member_profile_id,
      serverId: row.channel_id, // Note: this is approximate, might need server_id in query
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      profile: {
        id: row.member_profile_id,
        userId: '', // Not available in denormalized data
        name: row.member_profile_name,
        imageUrl: row.member_profile_image_url,
        email: '', // Not available in denormalized data
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    }
  };
}

export function directMessageFromConversationToMessage(row: DirectMessageFromConversation): DirectMessageWithMember {
  return {
    id: row.id,
    content: row.content,
    fileUrl: row.file_url,
    memberId: row.member_id,
    conversationId: row.conversation_id,
    deleted: row.deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    member: {
      id: row.member_id,
      role: MemberRole.GUEST, // Not available in direct messages
      profileId: row.member_profile_id,
      serverId: '', // Not applicable for direct messages
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      profile: {
        id: row.member_profile_id,
        userId: '', // Not available in denormalized data
        name: row.member_profile_name,
        imageUrl: row.member_profile_image_url,
        email: '', // Not available in denormalized data
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    }
  };
}

export function memberFromServerToMember(row: MemberFromServer): MemberWithProfile {
  return {
    id: row.id,
    role: row.role,
    profileId: row.profile_id,
    serverId: row.server_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    profile: {
      id: row.profile_id,
      userId: '', // Not available in denormalized data
      name: row.profile_name,
      imageUrl: row.profile_image_url,
      email: row.profile_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  };
}

export function channelFromServerToChannel(row: ChannelFromServer): Channel {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    serverId: row.server_id,
    profileId: row.profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
