-- ====================================================================
-- CASSANDRA SCHEMA FOR DISCORD-LIKE APPLICATION
-- ====================================================================
-- This schema is designed for a Discord-like real-time chat application
-- with servers, channels, members, and direct messaging functionality.
-- ====================================================================

CREATE KEYSPACE IF NOT EXISTS discord_app
WITH REPLICATION = {
    'class': 'SimpleStrategy',
    'replication_factor': 3
} AND DURABLE_WRITES = true;

USE discord_app;

-- ====================================================================
-- PROFILES (User Management with Clerk Authentication)
-- ====================================================================

-- --------------------------------------------------------------------
-- profiles_by_id: Main profile storage
-- Query: Get profile by internal ID
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles_by_id (
    id uuid PRIMARY KEY,
    user_id text,           -- Clerk userId
    name text,
    image_url text,
    email text,
    created_at timestamp,
    updated_at timestamp
);

-- --------------------------------------------------------------------
-- profiles_by_user_id: Look up profile by Clerk userId
-- Query: Get profile by Clerk userId (for authentication)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles_by_user_id (
    user_id text PRIMARY KEY,
    id uuid,
    name text,
    image_url text,
    email text,
    created_at timestamp,
    updated_at timestamp
);

-- ====================================================================
-- SERVERS
-- ====================================================================

-- --------------------------------------------------------------------
-- servers_by_id: Main server storage
-- Query: Get server details by server ID
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servers_by_id (
    id uuid PRIMARY KEY,
    name text,
    image_url text,
    invite_code text,
    profile_id uuid,        -- Owner profile ID
    created_at timestamp,
    updated_at timestamp
);

-- --------------------------------------------------------------------
-- servers_by_invite_code: Look up server by invite code
-- Query: Join server using invite code
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servers_by_invite_code (
    invite_code text PRIMARY KEY,
    server_id uuid,
    server_name text,
    server_image_url text
);

-- --------------------------------------------------------------------
-- servers_by_profile: Get all servers for a profile
-- Query: List servers where profile is a member
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servers_by_profile (
    profile_id uuid,
    server_id uuid,
    server_name text,       -- Denormalized
    server_image_url text,  -- Denormalized
    member_role text,       -- ADMIN, MODERATOR, GUEST
    joined_at timestamp,
    PRIMARY KEY ((profile_id), joined_at, server_id)
) WITH CLUSTERING ORDER BY (joined_at DESC, server_id ASC);

-- ====================================================================
-- CHANNELS
-- ====================================================================

-- --------------------------------------------------------------------
-- channels_by_id: Main channel storage
-- Query: Get channel details by channel ID
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels_by_id (
    id uuid PRIMARY KEY,
    name text,
    type text,              -- TEXT, AUDIO, VIDEO
    server_id uuid,
    profile_id uuid,        -- Creator profile ID
    created_at timestamp,
    updated_at timestamp
);

-- --------------------------------------------------------------------
-- channels_by_server: Get all channels in a server
-- Query: List channels for a server, ordered by creation time
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channels_by_server (
    server_id uuid,
    created_at timestamp,
    id uuid,
    name text,
    type text,              -- TEXT, AUDIO, VIDEO
    profile_id uuid,
    updated_at timestamp,
    PRIMARY KEY ((server_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

-- ====================================================================
-- MEMBERS
-- ====================================================================

-- --------------------------------------------------------------------
-- members_by_id: Main member storage
-- Query: Get member details by member ID
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members_by_id (
    id uuid PRIMARY KEY,
    role text,              -- ADMIN, MODERATOR, GUEST
    profile_id uuid,
    server_id uuid,
    created_at timestamp,
    updated_at timestamp
);

-- --------------------------------------------------------------------
-- members_by_server: Get all members in a server
-- Query: List members for a server, ordered by role
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members_by_server (
    server_id uuid,
    role text,
    id uuid,
    profile_id uuid,
    profile_name text,      -- Denormalized
    profile_image_url text, -- Denormalized
    profile_email text,     -- Denormalized
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY ((server_id), role, id)
) WITH CLUSTERING ORDER BY (role ASC, id ASC);

-- --------------------------------------------------------------------
-- members_by_profile_and_server: Look up member by profile and server
-- Query: Get member record for a specific profile in a server
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members_by_profile_and_server (
    profile_id uuid,
    server_id uuid,
    id uuid,
    role text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY ((profile_id, server_id))
);

-- ====================================================================
-- MESSAGES (Channel Messages)
-- ====================================================================

-- --------------------------------------------------------------------
-- messages_by_id: Main message storage
-- Query: Get message details by message ID
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages_by_id (
    id uuid PRIMARY KEY,
    content text,
    file_url text,
    member_id uuid,
    channel_id uuid,
    deleted boolean,
    created_at timestamp,
    updated_at timestamp
);

-- --------------------------------------------------------------------
-- messages_by_channel: Get all messages in a channel
-- Query: Paginate messages in a channel, newest first
-- Note: This will have high write volume
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages_by_channel (
    channel_id uuid,
    created_at timestamp,
    id uuid,
    content text,
    file_url text,
    member_id uuid,
    member_profile_id uuid,     -- Denormalized
    member_profile_name text,   -- Denormalized
    member_profile_image_url text, -- Denormalized
    member_role text,           -- Denormalized
    deleted boolean,
    updated_at timestamp,
    PRIMARY KEY ((channel_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);

-- ====================================================================
-- CONVERSATIONS (Direct Messages)
-- ====================================================================

-- --------------------------------------------------------------------
-- conversations_by_id: Main conversation storage
-- Query: Get conversation details by conversation ID
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations_by_id (
    id uuid PRIMARY KEY,
    member_one_id uuid,
    member_two_id uuid,
    created_at timestamp,
    updated_at timestamp
);

-- --------------------------------------------------------------------
-- conversations_by_members: Look up conversation by two members
-- Query: Find existing conversation between two members
-- Note: We need to query both (memberOne, memberTwo) and (memberTwo, memberOne)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations_by_members (
    member_one_id uuid,
    member_two_id uuid,
    id uuid,
    created_at timestamp,
    PRIMARY KEY ((member_one_id, member_two_id))
);

-- ====================================================================
-- DIRECT MESSAGES
-- ====================================================================

-- --------------------------------------------------------------------
-- direct_messages_by_id: Main direct message storage
-- Query: Get direct message details by message ID
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direct_messages_by_id (
    id uuid PRIMARY KEY,
    content text,
    file_url text,
    member_id uuid,
    conversation_id uuid,
    deleted boolean,
    created_at timestamp,
    updated_at timestamp
);

-- --------------------------------------------------------------------
-- direct_messages_by_conversation: Get all messages in a conversation
-- Query: Paginate direct messages in a conversation, newest first
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direct_messages_by_conversation (
    conversation_id uuid,
    created_at timestamp,
    id uuid,
    content text,
    file_url text,
    member_id uuid,
    member_profile_id uuid,     -- Denormalized
    member_profile_name text,   -- Denormalized
    member_profile_image_url text, -- Denormalized
    deleted boolean,
    updated_at timestamp,
    PRIMARY KEY ((conversation_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);

-- ====================================================================
-- INDEXES (Secondary indexes for common queries)
-- ====================================================================
-- Note: Use secondary indexes sparingly in Cassandra
-- Consider creating separate query tables instead for better performance

-- ====================================================================
-- END OF SCHEMA
-- ====================================================================