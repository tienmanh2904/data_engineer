# Team Query Distribution

This document divides the Cassandra queries implementation among 5 team members for the Discord-like application.

**Last Updated:** November 21, 2025

---

## Distribution Strategy

The queries are divided based on feature domains and complexity to ensure balanced workload:

- **Person 1**: Authentication & Profile System (Foundation)
- **Person 2**: Friend System (Social Features)
- **Person 3**: Server Management (Core Infrastructure)
- **Person 4**: Channel & Member Management (Server Operations)
- **Person 5**: Messaging System (Real-time Features)

---

## Person 1: Authentication & Profile System

**Complexity:** Medium | **Tables:** 5 | **Queries:** ~15

### Responsibilities

#### 1. User Authentication
**Files:** 
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`

**Tables to Implement:**
- `users_by_id`
- `users_by_username`
- `users_by_email`
- `profiles_by_id`
- `profiles_by_user_id`

**Queries:**
```cql
-- Register (5 inserts in batch)
INSERT INTO users_by_id (...)
INSERT INTO users_by_username (...)
INSERT INTO users_by_email (...)
INSERT INTO profiles_by_id (...)
INSERT INTO profiles_by_user_id (...)

-- Login (1 select)
SELECT * FROM users_by_username WHERE username = ?

-- Check username exists
SELECT * FROM users_by_username WHERE username = ?

-- Check email exists
SELECT * FROM users_by_email WHERE email = ?
```

#### 2. Profile Management
**Files:**
- `lib/currentProfile.ts`
- `lib/currentProfilePage.ts`

**Queries:**
```cql
-- Get profile by user ID
SELECT * FROM profiles_by_user_id WHERE user_id = ?

-- Get profile by ID
SELECT * FROM profiles_by_id WHERE id = ?
```

### Key Deliverables
- [ ] Schema creation scripts for 5 user/profile tables
- [ ] Registration endpoint with validation
- [ ] Login endpoint with password verification
- [ ] Profile retrieval functions
- [ ] Unit tests for auth flow

---

## Person 2: Friend System

**Complexity:** High | **Tables:** 5 | **Queries:** ~25

### Responsibilities

#### 1. Friend Request Management
**Files:**
- `app/api/friends/requests/route.ts`
- `app/api/friends/requests/[requestId]/route.ts`

**Tables to Implement:**
- `friend_requests_by_id`
- `friend_requests_by_sender`
- `friend_requests_by_receiver`
- `friend_requests_by_users`
- `friends_by_user`

**Queries:**
```cql
-- Send friend request (4 inserts in batch)
INSERT INTO friend_requests_by_id (...)
INSERT INTO friend_requests_by_sender (...)
INSERT INTO friend_requests_by_receiver (...)
INSERT INTO friend_requests_by_users (...)

-- Get sent requests
SELECT * FROM friend_requests_by_sender WHERE sender_id = ?

-- Get received requests
SELECT * FROM friend_requests_by_receiver WHERE receiver_id = ?

-- Accept request (4 updates + 2 inserts in batch)
UPDATE friend_requests_by_id SET status = 'ACCEPTED' WHERE id = ?
UPDATE friend_requests_by_sender SET status = 'ACCEPTED' WHERE ...
UPDATE friend_requests_by_receiver SET status = 'ACCEPTED' WHERE ...
UPDATE friend_requests_by_users SET status = 'ACCEPTED' WHERE ...
INSERT INTO friends_by_user (...) -- both directions

-- Reject request (4 updates)
UPDATE friend_requests_by_id SET status = 'REJECTED' WHERE id = ?
UPDATE friend_requests_by_sender SET status = 'REJECTED' WHERE ...
UPDATE friend_requests_by_receiver SET status = 'REJECTED' WHERE ...
UPDATE friend_requests_by_users SET status = 'REJECTED' WHERE ...

-- Check existing request/friendship
SELECT * FROM friend_requests_by_users WHERE user_one_id = ? AND user_two_id = ?
SELECT * FROM friends_by_user WHERE user_id = ? AND friend_id = ?
```

#### 2. Friends List Management
**Files:**
- `app/api/friends/route.ts`
- `app/api/friends/[friendId]/route.ts`

**Queries:**
```cql
-- Get friends list
SELECT * FROM friends_by_user WHERE user_id = ?

-- Remove friend (1 deletes)
DELETE FROM friends_by_user WHERE user_id = ? AND became_friends_at = ? AND friend_id = ?
```

### Key Deliverables
- [ ] Schema creation scripts for 5 friend tables
- [ ] Friend request send/accept/reject logic
- [ ] Duplicate request prevention
- [ ] Bidirectional friendship maintenance
- [ ] Unit tests for friend operations

---

## Person 3: Server Management

**Complexity:** High | **Tables:** 3 | **Queries:** ~20

### Responsibilities

#### 1. Server CRUD Operations
**Files:**
- `app/api/server/route.ts`
- `app/api/server/[serverId]/route.ts`
- `app/api/server/[serverId]/invite-code/route.ts`
- `app/api/server/[serverId]/leave/route.ts`

**Tables to Implement:**
- `servers_by_id`
- `servers_by_invite_code`
- `servers_by_profile`

**Queries:**
```cql
-- Create server (3 inserts + 5 from Person 4 - coordinate!)
INSERT INTO servers_by_id (...)
INSERT INTO servers_by_invite_code (...)
INSERT INTO servers_by_profile (...)

-- Update server (3 updates)
UPDATE servers_by_id SET name = ?, image_url = ? WHERE id = ?
UPDATE servers_by_invite_code SET server_name = ?, server_image_url = ? WHERE invite_code = ?
UPDATE servers_by_profile SET server_name = ?, server_image_url = ? WHERE ...

-- Delete server (3 deletes)
DELETE FROM servers_by_id WHERE id = ?
DELETE FROM servers_by_invite_code WHERE invite_code = ?
DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?

-- Regenerate invite code (1 delete, 1 update, 1 insert)
DELETE FROM servers_by_invite_code WHERE invite_code = ?
UPDATE servers_by_id SET invite_code = ? WHERE id = ?
INSERT INTO servers_by_invite_code (...)

-- Get server by ID
SELECT * FROM servers_by_id WHERE id = ?

-- Get server by invite code
SELECT * FROM servers_by_invite_code WHERE invite_code = ?

-- Get user's servers
SELECT * FROM servers_by_profile WHERE profile_id = ?
```

#### 2. Server Join/Leave
**Files:**
- `app/(invite)/(routes)/invite/[inviteCode]/page.tsx`

**Queries:**
```cql
-- Join server (1 insert to servers_by_profile + 3 from Person 4)
INSERT INTO servers_by_profile (...)

-- Leave server (1 delete from servers_by_profile + 3 from Person 4)
DELETE FROM servers_by_profile WHERE profile_id = ? AND joined_at = ? AND server_id = ?

-- Check if already member (coordinate with Person 4)
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?
```

### Key Deliverables
- [ ] Schema creation scripts for 3 server tables
- [ ] Server CRUD endpoints
- [ ] Invite code generation/regeneration
- [ ] Server join/leave logic (coordinate with Person 4)
- [ ] Unit tests for server operations

---

## Person 4: Channel & Member Management

**Complexity:** High | **Tables:** 5 | **Queries:** ~25

### Responsibilities

#### 1. Channel Management
**Files:**
- `app/api/channels/route.ts`
- `app/api/channels/[channelId]/route.ts`

**Tables to Implement:**
- `channels_by_id`
- `channels_by_server`

**Queries:**
```cql
-- Create channel (2 inserts in batch)
INSERT INTO channels_by_id (...)
INSERT INTO channels_by_server (...)

-- Update channel (2 updates)
UPDATE channels_by_id SET name = ?, type = ? WHERE id = ?
UPDATE channels_by_server SET name = ?, type = ? WHERE server_id = ? AND created_at = ? AND id = ?

-- Delete channel (2 deletes)
DELETE FROM channels_by_id WHERE id = ?
DELETE FROM channels_by_server WHERE server_id = ? AND created_at = ? AND id = ?

-- Get channel by ID
SELECT * FROM channels_by_id WHERE id = ?

-- Get channels by server
SELECT * FROM channels_by_server WHERE server_id = ?
```

#### 2. Member Management
**Files:**
- `app/api/members/[memberId]/route.ts`

**Tables to Implement:**
- `members_by_id`
- `members_by_server`
- `members_by_profile_and_server`

**Queries:**
```cql
-- Add member (3 inserts in batch - during server join)
INSERT INTO members_by_id (...)
INSERT INTO members_by_server (...)
INSERT INTO members_by_profile_and_server (...)

-- Update member role (3 updates: 1 update, 1 delete+insert combo, 1 update)
UPDATE members_by_id SET role = ? WHERE id = ?
DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?
INSERT INTO members_by_server (...)
UPDATE members_by_profile_and_server SET role = ? WHERE ...

-- Kick member (3 deletes)
DELETE FROM members_by_id WHERE id = ?
DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?
DELETE FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?

-- Get member by ID
SELECT * FROM members_by_id WHERE id = ?

-- Get members by server
SELECT * FROM members_by_server WHERE server_id = ?

-- Get member by profile and server
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?
```

### Key Deliverables
- [ ] Schema creation scripts for 5 tables
- [ ] Channel CRUD endpoints
- [ ] Member add/remove/update logic
- [ ] Role-based permission checks
- [ ] Coordinate with Person 3 for server create/join operations
- [ ] Unit tests for channel and member operations

---

## Person 5: Messaging System

**Complexity:** High | **Tables:** 6 | **Queries:** ~30

### Responsibilities

#### 1. Channel Messages
**Files:**
- `app/api/messages/route.ts`
- `pages/api/socket/messages/index.ts`
- `pages/api/socket/messages/[messageId].ts`

**Tables to Implement:**
- `messages_by_id`
- `messages_by_channel`

**Queries:**
```cql
-- Create message (2 inserts in batch)
INSERT INTO messages_by_id (...)
INSERT INTO messages_by_channel (...)

-- Get messages (paginated)
SELECT * FROM messages_by_channel WHERE channel_id = ? LIMIT ?
SELECT * FROM messages_by_channel WHERE channel_id = ? AND created_at < ? LIMIT ?

-- Update message (2 updates)
UPDATE messages_by_id SET content = ? WHERE id = ?
UPDATE messages_by_channel SET content = ? WHERE channel_id = ? AND created_at = ? AND id = ?

-- Delete message (2 updates - soft delete)
UPDATE messages_by_id SET deleted = true, content = 'This message has been deleted.' WHERE id = ?
UPDATE messages_by_channel SET deleted = true, content = 'This message has been deleted.' WHERE ...

-- Get message by ID
SELECT * FROM messages_by_id WHERE id = ?

-- Find message in channel (for update/delete)
SELECT * FROM messages_by_channel WHERE channel_id = ? LIMIT 1000
```

#### 2. Direct Messages & Conversations
**Files:**
- `app/api/direct-messages/route.ts`
- `pages/api/socket/direct-messages/index.ts`
- `pages/api/socket/direct-messages/[directmessageId].ts`
- `lib/conversation.ts`

**Tables to Implement:**
- `direct_messages_by_id`
- `direct_messages_by_conversation`
- `conversations_by_id`
- `conversations_by_members`

**Queries:**
```cql
-- Find or create conversation (3 inserts if not exists)
SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ?
INSERT INTO conversations_by_id (...)
INSERT INTO conversations_by_members (...) -- both directions

-- Create direct message (2 inserts in batch)
INSERT INTO direct_messages_by_id (...)
INSERT INTO direct_messages_by_conversation (...)

-- Get direct messages (paginated)
SELECT * FROM direct_messages_by_conversation WHERE conversation_id = ? LIMIT ?
SELECT * FROM direct_messages_by_conversation WHERE conversation_id = ? AND created_at < ? LIMIT ?

-- Update direct message (2 updates)
UPDATE direct_messages_by_id SET content = ? WHERE id = ?
UPDATE direct_messages_by_conversation SET content = ? WHERE conversation_id = ? AND created_at = ? AND id = ?

-- Delete direct message (2 updates - soft delete)
UPDATE direct_messages_by_id SET deleted = true WHERE id = ?
UPDATE direct_messages_by_conversation SET deleted = true WHERE ...

-- Get conversation by ID
SELECT * FROM conversations_by_id WHERE id = ?
```

### Key Deliverables
- [ ] Schema creation scripts for 6 tables
- [ ] Channel message CRUD with Socket.IO
- [ ] Direct message CRUD with Socket.IO
- [ ] Conversation find/create logic
- [ ] Pagination implementation (cursor-based)
- [ ] Real-time message broadcasting
- [ ] Unit tests for messaging operations

---

## Coordination Points

### Critical Dependencies

1. **Person 1 → Everyone**: Auth system must be completed first
2. **Person 3 ↔ Person 4**: Server creation includes channel and member creation
3. **Person 4 → Person 5**: Member verification needed for messaging
4. **Person 2 → Person 5**: Friends can have direct message conversations

### Shared Responsibilities

#### Server Creation (Person 3 + Person 4)
```cql
-- Person 3 handles:
INSERT INTO servers_by_id (...)
INSERT INTO servers_by_invite_code (...)
INSERT INTO servers_by_profile (...)

-- Person 4 handles (in same batch):
INSERT INTO channels_by_id (...)  -- default general channel
INSERT INTO channels_by_server (...)
INSERT INTO members_by_id (...)  -- owner as member
INSERT INTO members_by_server (...)
INSERT INTO members_by_profile_and_server (...)
```

#### Server Join (Person 3 + Person 4)
```cql
-- Person 3 handles:
SELECT * FROM servers_by_invite_code WHERE invite_code = ?
INSERT INTO servers_by_profile (...)

-- Person 4 handles (in same batch):
INSERT INTO members_by_id (...)
INSERT INTO members_by_server (...)
INSERT INTO members_by_profile_and_server (...)
```

#### Server Leave/Kick (Person 3 + Person 4)
```cql
-- Person 4 handles:
DELETE FROM members_by_id WHERE id = ?
DELETE FROM members_by_server WHERE ...
DELETE FROM members_by_profile_and_server WHERE ...

-- Person 3 handles:
DELETE FROM servers_by_profile WHERE ...
```

---

## Development Schedule Suggestion

### Week 1: Foundation
- **Person 1**: Complete auth system (blocks everyone)
- **Others**: Schema design and local Cassandra setup

### Week 2: Core Features
- **Person 2**: Friend system (independent)
- **Person 3**: Server management (depends on Person 1)
- **Person 4**: Channel/member tables setup (coordinate with Person 3)

### Week 3: Advanced Features
- **Person 3 + Person 4**: Complete server create/join integration
- **Person 5**: Messaging system (depends on Person 4)

### Week 4: Integration & Testing
- **Everyone**: Integration testing, bug fixes, optimization

---

## Testing Responsibilities

Each person should create tests for their domain:

### Person 1: Auth Tests
```javascript
- Register user (success/duplicate)
- Login (success/wrong password)
- Profile retrieval
```

### Person 2: Friend Tests
```javascript
- Send friend request (success/duplicate)
- Accept/reject requests
- Get friends list
- Remove friend
```

### Person 3: Server Tests
```javascript
- Create server
- Update server
- Delete server
- Regenerate invite
- Join server (with Person 4)
```

### Person 4: Channel/Member Tests
```javascript
- Create/update/delete channel
- Add/remove/update member
- Permission checks
```

### Person 5: Message Tests
```javascript
- Send channel message
- Send direct message
- Pagination
- Update/delete message
- Real-time broadcasting
```

---

## Query Complexity Summary

| Person | Feature Domain | Tables | Queries | Complexity | Dependencies |
|--------|---------------|--------|---------|------------|--------------|
| Person 1 | Auth & Profiles | 5 | ~15 | Medium | None (Foundation) |
| Person 2 | Friend System | 5 | ~25 | High | Person 1 |
| Person 3 | Server Management | 3 | ~20 | High | Person 1, Person 4 |
| Person 4 | Channels & Members | 5 | ~25 | High | Person 1, Person 3 |
| Person 5 | Messaging | 6 | ~30 | High | Person 1, Person 4 |

**Total**: 24 tables (1 shared), ~115 queries

---

## Communication Protocol

### Daily Standups
- What queries did you complete?
- Any blocking issues?
- What's next?

### Code Review Requirements
- All batch operations reviewed by at least 2 people
- Schema changes require team approval
- Integration points require pair programming

### Documentation
Each person maintains:
- Schema diagrams for their tables
- Query performance notes
- Example usage in README

---

## Contact & Coordination

### Quick Reference

**Batch Operations to Coordinate:**
- Server Creation: Person 3 + Person 4
- Server Join: Person 3 + Person 4
- Server Leave: Person 3 + Person 4
- Member Kick: Person 3 + Person 4

**Profile Data Sharing:**
- Person 1 owns profile tables
- Others read profile data for denormalization

**Permission Checks:**
- Person 4 implements member role checks
- Others call Person 4's permission utilities

---

## Success Criteria

### Individual Completion
- [ ] All assigned tables created with proper schema
- [ ] All queries implemented with prepared statements
- [ ] Unit tests passing (>80% coverage)
- [ ] Documentation complete

### Team Integration
- [ ] All coordination points tested
- [ ] Batch operations atomic and correct
- [ ] Real-time features working
- [ ] Performance benchmarks met

---

**Good luck team! Remember to communicate frequently and test integration points early.**