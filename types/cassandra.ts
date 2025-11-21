import { types } from 'cassandra-driver';

// ============================================================
// ENUMS
// ============================================================

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

// ============================================================
// APP INTERFACES (Frontend usage)
// ============================================================

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

// ============================================================
// EXTENDED INTERFACES
// ============================================================

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

// ============================================================
// HELPER FUNCTIONS (Mappers)
// ============================================================

/**
 * Helper to safely convert Cassandra UUID/TimeUUID objects to string
 */
const toString = (val: any): string => {
  if (!val) return "";
  return val.toString();
};

export function messageFromChannelToMessage(row: types.Row): MessageWithMember {
  return {
    id: toString(row.get('id')),
    content: row.get('content'),
    fileUrl: row.get('file_url'),
    memberId: toString(row.get('member_id')),
    channelId: toString(row.get('channel_id')),
    deleted: row.get('deleted') || false,
    createdAt: row.get('created_at'),
    updatedAt: row.get('updated_at'),
    member: {
      id: toString(row.get('member_id')),
      role: row.get('member_role') as MemberRole,
      profileId: toString(row.get('member_profile_id')),
      serverId: toString(row.get('channel_id')), // Approximate
      createdAt: row.get('created_at'), // Approximate (using message time)
      updatedAt: row.get('updated_at'),
      profile: {
        id: toString(row.get('member_profile_id')),
        userId: '', 
        name: row.get('member_profile_name'),
        imageUrl: row.get('member_profile_image_url'),
        email: '',
        createdAt: row.get('created_at'), // Approximate
        updatedAt: row.get('updated_at'),
      }
    }
  };
}

export function directMessageFromConversationToMessage(row: types.Row): DirectMessageWithMember {
  return {
    id: toString(row.get('id')),
    content: row.get('content'),
    fileUrl: row.get('file_url'),
    memberId: toString(row.get('member_id')),
    conversationId: toString(row.get('conversation_id')),
    deleted: row.get('deleted') || false,
    createdAt: row.get('created_at'),
    updatedAt: row.get('updated_at'),
    member: {
      id: toString(row.get('member_id')),
      role: MemberRole.GUEST,
      profileId: toString(row.get('member_profile_id')),
      serverId: '',
      createdAt: row.get('created_at'),
      updatedAt: row.get('updated_at'),
      profile: {
        id: toString(row.get('member_profile_id')),
        userId: '',
        name: row.get('member_profile_name'),
        imageUrl: row.get('member_profile_image_url'),
        email: '',
        createdAt: row.get('created_at'),
        updatedAt: row.get('updated_at'),
      }
    }
  };
}

export function memberFromServerToMember(row: types.Row): MemberWithProfile {
  return {
    id: toString(row.get('id')),
    role: row.get('role') as MemberRole,
    profileId: toString(row.get('profile_id')),
    serverId: toString(row.get('server_id')),
    createdAt: row.get('created_at'),
    updatedAt: row.get('updated_at'),
    profile: {
      id: toString(row.get('profile_id')),
      userId: '',
      name: row.get('profile_name'),
      imageUrl: row.get('profile_image_url'),
      email: row.get('profile_email'),
      createdAt: row.get('created_at'),
      updatedAt: row.get('updated_at'),
    }
  };
}

export function channelFromServerToChannel(row: types.Row): Channel {
  return {
    id: toString(row.get('id')),
    name: row.get('name'),
    type: row.get('type') as ChannelType,
    serverId: toString(row.get('server_id')),
    profileId: toString(row.get('profile_id')),
    createdAt: row.get('created_at'),
    updatedAt: row.get('updated_at'),
  };
}