# Cassandra Queries Summary

This document provides a comprehensive overview of all Cassandra queries used in the Discord-like application.

**Last Updated:** November 21, 2025

---

## Table of Contents

1. [Authentication Queries](#authentication-queries)
2. [Profile Queries](#profile-queries)
3. [Friend System Queries](#friend-system-queries)
4. [Server Queries](#server-queries)
5. [Channel Queries](#channel-queries)
6. [Member Queries](#member-queries)
7. [Message Queries](#message-queries)
8. [Direct Message Queries](#direct-message-queries)
9. [Conversation Queries](#conversation-queries)

---

## Authentication Queries

### Register User
**File:** `app/api/auth/register/route.ts`

```cql
-- Check if username exists
SELECT * FROM users_by_username WHERE username = ?

-- Check if email exists
SELECT * FROM users_by_email WHERE email = ?

-- Insert new user (3 tables for denormalization)
INSERT INTO users_by_id (id, username, email, password_hash, name, image_url, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO users_by_username (username, id, email, password_hash, name, image_url, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO users_by_email (email, id, username, password_hash, name, image_url, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

-- Create profile (2 tables)
INSERT INTO profiles_by_id (id, user_id, name, image_url, email, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)

INSERT INTO profiles_by_user_id (user_id, id, name, image_url, email, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)
```

### Login User
**File:** `app/api/auth/login/route.ts`

```cql
-- Get user by username
SELECT * FROM users_by_username WHERE username = ? LIMIT 1
```

---

## Profile Queries

### Get Current Profile (Server Components)
**File:** `lib/currentProfile.ts`

```cql
-- Get profile by username
SELECT * FROM profiles_by_user_id WHERE user_id = ? LIMIT 1
```

### Get Current Profile (API Pages)
**File:** `lib/currentProfilePage.ts`

```cql
-- Get profile by username
SELECT * FROM profiles_by_user_id WHERE user_id = ? LIMIT 1
```

---

## Friend System Queries

### Send Friend Request
**File:** `app/api/friends/requests/route.ts`

```cql
-- Get receiver user
SELECT * FROM users_by_username WHERE username = ? LIMIT 1

-- Check existing request (both directions)
SELECT * FROM friend_requests_by_users WHERE user_one_id = ? AND user_two_id = ? LIMIT 1
SELECT * FROM friend_requests_by_users WHERE user_one_id = ? AND user_two_id = ? LIMIT 1

-- Check if already friends
SELECT * FROM friends_by_user WHERE user_id = ? AND friend_id = ? LIMIT 1

-- Insert friend request (4 tables)
INSERT INTO friend_requests_by_id (id, sender_id, receiver_id, status, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?)

INSERT INTO friend_requests_by_sender (sender_id, created_at, id, receiver_id, receiver_username, receiver_name, receiver_image_url, status, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO friend_requests_by_receiver (receiver_id, created_at, id, sender_id, sender_username, sender_name, sender_image_url, status, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO friend_requests_by_users (user_one_id, user_two_id, id, status, created_at) 
VALUES (?, ?, ?, ?, ?)
```

### Get Friend Requests
**File:** `app/api/friends/requests/route.ts`

```cql
-- Get sent friend requests
SELECT * FROM friend_requests_by_sender WHERE sender_id = ?

-- Get received friend requests
SELECT * FROM friend_requests_by_receiver WHERE receiver_id = ?
```

### Accept Friend Request
**File:** `app/api/friends/requests/[requestId]/route.ts`

```cql
-- Get request by ID
SELECT * FROM friend_requests_by_id WHERE id = ? LIMIT 1

-- Get sender profile
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1

-- Get receiver profile
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1

-- Update friend request status (4 tables)
UPDATE friend_requests_by_id SET status = 'ACCEPTED', updated_at = ? WHERE id = ?

UPDATE friend_requests_by_sender SET status = 'ACCEPTED', updated_at = ? 
WHERE sender_id = ? AND created_at = ? AND id = ?

UPDATE friend_requests_by_receiver SET status = 'ACCEPTED', updated_at = ? 
WHERE receiver_id = ? AND created_at = ? AND id = ?

UPDATE friend_requests_by_users SET status = 'ACCEPTED' 
WHERE user_one_id = ? AND user_two_id = ?

-- Insert friendship (both directions)
INSERT INTO friends_by_user (user_id, friend_id, friend_username, friend_name, friend_image_url, friend_email, became_friends_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)

INSERT INTO friends_by_user (user_id, friend_id, friend_username, friend_name, friend_image_url, friend_email, became_friends_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)
```

### Reject Friend Request
**File:** `app/api/friends/requests/[requestId]/route.ts`

```cql
-- Get request by ID
SELECT * FROM friend_requests_by_id WHERE id = ? LIMIT 1

-- Update request status (4 tables - similar to accept)
UPDATE friend_requests_by_id SET status = 'REJECTED', updated_at = ? WHERE id = ?
UPDATE friend_requests_by_sender SET status = 'REJECTED', updated_at = ? WHERE sender_id = ? AND created_at = ? AND id = ?
UPDATE friend_requests_by_receiver SET status = 'REJECTED', updated_at = ? WHERE receiver_id = ? AND created_at = ? AND id = ?
UPDATE friend_requests_by_users SET status = 'REJECTED' WHERE user_one_id = ? AND user_two_id = ?
```

### Get Friends List
**File:** `app/api/friends/route.ts`

```cql
-- Get all friends for user
SELECT * FROM friends_by_user WHERE user_id = ?
```

### Remove Friend
**File:** `app/api/friends/[friendId]/route.ts`

```cql
-- Delete friendship (both directions)
DELETE FROM friends_by_user WHERE user_id = ? AND became_friends_at = ? AND friend_id = ?
DELETE FROM friends_by_user WHERE user_id = ? AND became_friends_at = ? AND friend_id = ?
```

---

## Server Queries

### Create Server
**File:** `app/api/server/route.ts`

```cql
-- Batch insert (8 queries total)
INSERT INTO servers_by_id (id, name, image_url, invite_code, profile_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)

INSERT INTO servers_by_invite_code (invite_code, server_id, server_name, server_image_url) 
VALUES (?, ?, ?, ?)

INSERT INTO servers_by_profile (profile_id, server_id, server_name, server_image_url, member_role, joined_at) 
VALUES (?, ?, ?, ?, ?, ?)

INSERT INTO channels_by_id (id, name, type, server_id, profile_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)

INSERT INTO channels_by_server (server_id, created_at, id, name, type, profile_id, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)

INSERT INTO members_by_id (id, role, profile_id, server_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?)

INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO members_by_profile_and_server (profile_id, server_id, id, role, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?)
```

### Update Server
**File:** `app/api/server/[serverId]/route.ts`

```cql
-- Get server
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Update server (3 tables)
UPDATE servers_by_id SET name = ?, image_url = ?, updated_at = ? WHERE id = ?
UPDATE servers_by_invite_code SET server_name = ?, server_image_url = ? WHERE invite_code = ?
UPDATE servers_by_profile SET server_name = ?, server_image_url = ? 
WHERE profile_id = ? AND joined_at = ? AND server_id = ?
```

### Delete Server
**File:** `app/api/server/[serverId]/route.ts`

```cql
-- Get server
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Delete server (3 tables)
DELETE FROM servers_by_id WHERE id = ?
DELETE FROM servers_by_invite_code WHERE invite_code = ?
DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?
```

### Regenerate Invite Code
**File:** `app/api/server/[serverId]/invite-code/route.ts`

```cql
-- Get server
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Update invite code (2 tables)
DELETE FROM servers_by_invite_code WHERE invite_code = ?
UPDATE servers_by_id SET invite_code = ?, updated_at = ? WHERE id = ?
INSERT INTO servers_by_invite_code (invite_code, server_id, server_name, server_image_url) 
VALUES (?, ?, ?, ?)
```

### Join Server by Invite
**File:** `app/(invite)/(routes)/invite/[inviteCode]/page.tsx`

```cql
-- Get server by invite code
SELECT * FROM servers_by_invite_code WHERE invite_code = ? LIMIT 1

-- Check if already member
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1

-- Get server details
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Get owner profile
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1

-- Add member (3 tables - batch)
INSERT INTO members_by_id (id, role, profile_id, server_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?)

INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO members_by_profile_and_server (profile_id, server_id, id, role, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?)

INSERT INTO servers_by_profile (profile_id, server_id, server_name, server_image_url, member_role, joined_at) 
VALUES (?, ?, ?, ?, ?, ?)
```

### Leave Server
**File:** `app/api/server/[serverId]/leave/route.ts`

```cql
-- Get server
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Get member
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1

-- Delete member (3 tables)
DELETE FROM members_by_id WHERE id = ?
DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?
DELETE FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?
DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?
```

### Get User's Servers
**File:** `app/(setup)/page.tsx`, `components/navigation/NavigationSidebar.tsx`

```cql
-- Get all servers for profile
SELECT * FROM servers_by_profile WHERE profile_id = ?
```

### Get Server Details (for sidebar)
**File:** `components/server/ServerSideBar.tsx`

```cql
-- Get server
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Get channels
SELECT * FROM channels_by_server WHERE server_id = ?

-- Get members
SELECT * FROM members_by_server WHERE server_id = ?
```

---

## Channel Queries

### Create Channel
**File:** `app/api/channels/route.ts`

```cql
-- Check if user is member
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1

-- Get server info
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Insert channel (2 tables - batch)
INSERT INTO channels_by_id (id, name, type, server_id, profile_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)

INSERT INTO channels_by_server (server_id, created_at, id, name, type, profile_id, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?)
```

### Update Channel
**File:** `app/api/channels/[channelId]/route.ts`

```cql
-- Get channel
SELECT * FROM channels_by_id WHERE id = ? LIMIT 1

-- Check if admin/moderator
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1

-- Update channel (2 tables)
UPDATE channels_by_id SET name = ?, type = ?, updated_at = ? WHERE id = ?
UPDATE channels_by_server SET name = ?, type = ?, updated_at = ? 
WHERE server_id = ? AND created_at = ? AND id = ?
```

### Delete Channel
**File:** `app/api/channels/[channelId]/route.ts`

```cql
-- Get channel
SELECT * FROM channels_by_id WHERE id = ? LIMIT 1

-- Check if admin/moderator
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1

-- Delete channel (2 tables)
DELETE FROM channels_by_id WHERE id = ?
DELETE FROM channels_by_server WHERE server_id = ? AND created_at = ? AND id = ?
```

---

## Member Queries

### Get Member by Profile and Server
**File:** Multiple files

```cql
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1
```

### Update Member Role
**File:** `app/api/members/[memberId]/route.ts`

```cql
-- Get server
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Get member to update
SELECT * FROM members_by_id WHERE id = ? LIMIT 1

-- Get profile info
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1

-- Get current members (to avoid duplicate roles)
SELECT * FROM members_by_server WHERE server_id = ?

-- Update member (3 tables)
UPDATE members_by_id SET role = ?, updated_at = ? WHERE id = ?

DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?
INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)

UPDATE members_by_profile_and_server SET role = ?, updated_at = ? 
WHERE profile_id = ? AND server_id = ?

UPDATE servers_by_profile SET member_role = ? 
WHERE profile_id = ? AND joined_at = ? AND server_id = ?
```

### Kick Member
**File:** `app/api/members/[memberId]/route.ts`

```cql
-- Get server
SELECT * FROM servers_by_id WHERE id = ? LIMIT 1

-- Get member to kick
SELECT * FROM members_by_id WHERE id = ? LIMIT 1

-- Get all members (to find the one to delete)
SELECT * FROM members_by_server WHERE server_id = ?

-- Delete member (4 tables)
DELETE FROM members_by_id WHERE id = ?
DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?
DELETE FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?
DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?
```

---

## Message Queries

### Get Messages (Paginated)
**File:** `app/api/messages/route.ts`

```cql
-- Without cursor (first page)
SELECT * FROM messages_by_channel WHERE channel_id = ? LIMIT ?

-- With cursor (next pages)
SELECT * FROM messages_by_channel WHERE channel_id = ? AND created_at < ? LIMIT ?
```

### Create Message (Socket)
**File:** `pages/api/socket/messages/index.ts`

```cql
-- Get member
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1

-- Get channel
SELECT * FROM channels_by_id WHERE id = ? LIMIT 1

-- Insert message (2 tables - batch)
INSERT INTO messages_by_id (id, content, file_url, member_id, channel_id, deleted, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO messages_by_channel (channel_id, created_at, id, content, file_url, member_id, member_profile_id, member_profile_name, member_profile_image_url, member_role, deleted, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### Update Message (Socket)
**File:** `pages/api/socket/messages/[messageId].ts`

```cql
-- Get member
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ? LIMIT 1

-- Get channel
SELECT * FROM channels_by_id WHERE id = ? LIMIT 1

-- Find message in channel
SELECT * FROM messages_by_channel WHERE channel_id = ? LIMIT 1000

-- Get full message
SELECT * FROM messages_by_id WHERE id = ? LIMIT 1

-- Update message (2 tables)
UPDATE messages_by_id SET content = ?, updated_at = ? WHERE id = ?
UPDATE messages_by_channel SET content = ?, updated_at = ? 
WHERE channel_id = ? AND created_at = ? AND id = ?
```

### Delete Message (Socket)
**File:** `pages/api/socket/messages/[messageId].ts`

```cql
-- Similar to update, but set deleted = true
UPDATE messages_by_id SET deleted = true, content = 'This message has been deleted.', updated_at = ? 
WHERE id = ?

UPDATE messages_by_channel SET deleted = true, content = 'This message has been deleted.', updated_at = ? 
WHERE channel_id = ? AND created_at = ? AND id = ?
```

---

## Direct Message Queries

### Get Direct Messages (Paginated)
**File:** `app/api/direct-messages/route.ts`

```cql
-- Without cursor (first page)
SELECT * FROM direct_messages_by_conversation WHERE conversation_id = ? LIMIT ?

-- With cursor (next pages)
SELECT * FROM direct_messages_by_conversation WHERE conversation_id = ? AND created_at < ? LIMIT ?
```

### Create Direct Message (Socket)
**File:** `pages/api/socket/direct-messages/index.ts`

```cql
-- Get conversation
SELECT * FROM conversations_by_id WHERE id = ? LIMIT 1

-- Get member profiles
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1

-- Insert direct message (2 tables - batch)
INSERT INTO direct_messages_by_id (id, content, file_url, member_id, conversation_id, deleted, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

INSERT INTO direct_messages_by_conversation (conversation_id, created_at, id, content, file_url, member_id, member_profile_id, member_profile_name, member_profile_image_url, deleted, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### Update Direct Message (Socket)
**File:** `pages/api/socket/direct-messages/[directmessageId].ts`

```cql
-- Get conversation
SELECT * FROM conversations_by_id WHERE id = ? LIMIT 1

-- Get member profiles
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1

-- Get message
SELECT * FROM direct_messages_by_id WHERE id = ? LIMIT 1

-- Update message (2 tables)
UPDATE direct_messages_by_id SET content = ?, updated_at = ? WHERE id = ?
UPDATE direct_messages_by_conversation SET content = ?, updated_at = ? 
WHERE conversation_id = ? AND created_at = ? AND id = ?
```

### Delete Direct Message (Socket)
**File:** `pages/api/socket/direct-messages/[directmessageId].ts`

```cql
-- Similar to update, but set deleted = true
UPDATE direct_messages_by_id SET deleted = true, content = 'This message has been deleted.', updated_at = ? 
WHERE id = ?

UPDATE direct_messages_by_conversation SET deleted = true, content = 'This message has been deleted.', updated_at = ? 
WHERE conversation_id = ? AND created_at = ? AND id = ?
```

---

## Conversation Queries

### Find or Create Conversation
**File:** `lib/conversation.ts`

```cql
-- Try both combinations of members
SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ? LIMIT 1
SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ? LIMIT 1

-- If not found, get member details
SELECT * FROM members_by_id WHERE id = ? LIMIT 1
SELECT * FROM members_by_id WHERE id = ? LIMIT 1

-- Get profile details
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1
SELECT * FROM profiles_by_id WHERE id = ? LIMIT 1

-- Create conversation (3 tables - batch)
INSERT INTO conversations_by_id (id, member_one_id, member_two_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?)

INSERT INTO conversations_by_members (member_one_id, member_two_id, id, created_at) 
VALUES (?, ?, ?, ?)

INSERT INTO conversations_by_members (member_one_id, member_two_id, id, created_at) 
VALUES (?, ?, ?, ?)
```

---

## Query Patterns Summary

### Data Access Patterns

1. **Denormalized Writes**: Most write operations update 2-4 tables to maintain different query paths
2. **Batch Operations**: Heavy use of batch queries for atomic multi-table operations
3. **Prepared Statements**: All queries use `{ prepare: true }` for performance
4. **Pagination**: Messages use time-based pagination with `created_at` clustering

### Common Query Types

| Operation | Tables Updated | Batch? |
|-----------|---------------|--------|
| Register User | 5 | Yes |
| Create Server | 8 | Yes |
| Send Friend Request | 4 | Yes |
| Accept Friend Request | 6 | Yes |
| Create Channel | 2 | Yes |
| Create Message | 2 | Yes |
| Update Member Role | 4 | No |
| Join Server | 4 | Yes |

### Performance Considerations

1. **Partition Keys**: All queries use proper partition keys for efficient lookups
2. **Clustering Columns**: Time-based ordering (DESC) for recent-first retrieval
3. **Denormalization**: User/profile data duplicated to avoid joins
4. **Batch Size**: Limited batches to avoid coordinator overwhelm
5. **Message Pagination**: 50 messages per page with cursor-based pagination

### Critical Query Paths

1. **Authentication Flow**: 2-3 queries per login
2. **Server Rendering**: 3-5 queries per page load
3. **Real-time Messaging**: 4-6 queries per message
4. **Friend System**: 4-6 queries per action

---

## Database Schema Tables

Total tables: **25**

### User/Profile Tables (5)
- `users_by_id`, `users_by_username`, `users_by_email`
- `profiles_by_id`, `profiles_by_user_id`

### Friend System Tables (5)
- `friend_requests_by_id`, `friend_requests_by_sender`, `friend_requests_by_receiver`
- `friend_requests_by_users`, `friends_by_user`

### Server Tables (3)
- `servers_by_id`, `servers_by_invite_code`, `servers_by_profile`

### Channel Tables (2)
- `channels_by_id`, `channels_by_server`

### Member Tables (3)
- `members_by_id`, `members_by_server`, `members_by_profile_and_server`

### Message Tables (4)
- `messages_by_id`, `messages_by_channel`
- `direct_messages_by_id`, `direct_messages_by_conversation`

### Conversation Tables (2)
- `conversations_by_id`, `conversations_by_members`

---

## Maintenance & Monitoring

### Recommended Monitoring Queries

```cql
-- Check table sizes
SELECT * FROM system_schema.tables WHERE keyspace_name = 'discord_app';

-- Monitor pending requests (per user)
SELECT COUNT(*) FROM friend_requests_by_receiver WHERE receiver_id = ?;

-- Check server activity (message count)
SELECT COUNT(*) FROM messages_by_channel WHERE channel_id = ?;
```

### Cleanup Operations

```cql
-- Archive old messages (manual process needed)
-- Cassandra doesn't have built-in archiving, consider TTL or external archival

-- Remove rejected/old friend requests
DELETE FROM friend_requests_by_id WHERE id = ?;
-- (Must also delete from other 3 friend_request tables)
```

---

## Best Practices Used

1. ✅ **Partition Key per Query**: Every table has appropriate partition key
2. ✅ **Clustering for Ordering**: Time-based clustering for chronological data
3. ✅ **Denormalization**: Duplicate data to avoid expensive lookups
4. ✅ **Batch Writes**: Atomic multi-table updates
5. ✅ **Prepared Statements**: All queries prepared for performance
6. ✅ **Pagination**: Cursor-based pagination for large datasets
7. ✅ **No Secondary Indexes**: Query-specific tables instead

---

**End of Query Summary**
