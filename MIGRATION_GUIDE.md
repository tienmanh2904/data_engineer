# MongoDB to Cassandra Migration Guide

## Overview

This guide outlines the complete migration from MongoDB/Prisma to Apache Cassandra for the Discord-like application.

## Schema Changes

### ✅ Updated Schema
The `schema.cql` file has been completely redesigned to match the current application's data model:

**Key Changes:**
- Keyspace renamed: `realtime_chat_app` → `discord_app`
- Removed generic chat tables (users, friends, friend_requests, etc.)
- Added Discord-specific tables (profiles, servers, channels, members, messages, conversations, direct_messages)
- Proper denormalization for Cassandra query patterns
- Support for Clerk authentication integration

## Files That Need to Be Updated

### 1. **Database Client Configuration** ✅ (COMPLETED)
- `lib/db.ts` - Updated to use new keyspace name

### 2. **Type Definitions** (20+ files)
Files importing from `@prisma/client` need to be updated:

#### Type Definition Files:
- `types/ServerType.ts`
- All hook files using Prisma types

#### Component Files:
- `components/server/ServerMember.tsx`
- `components/server/ServerSideBar.tsx`
- `components/server/ServerSection.tsx`
- `components/chat/ChatMessages.tsx`
- `components/modals/MemberModal.tsx`
- `hooks/useModal.ts`
- `hooks/useChatSocket.ts`

### 3. **API Routes** (15+ files)
All API routes need to be rewritten to use Cassandra queries instead of Prisma:

#### Server Management:
- `app/api/server/route.ts` - Create server
- `app/api/server/[serverId]/route.ts` - Update/delete server
- `app/api/server/[serverId]/invite-code/route.ts` - Manage invite codes
- `app/api/server/[serverId]/leave/route.ts` - Leave server

#### Channel Management:
- `app/api/channels/route.ts` - Create channel
- `app/api/channels/[channelId]/route.ts` - Update/delete channel

#### Member Management:
- `app/api/members/[memberId]/route.ts` - Update/delete member role

#### Message Management:
- `app/api/messages/route.ts` - Fetch channel messages (paginated)
- `app/api/direct-messages/route.ts` - Fetch direct messages (paginated)

#### Socket Routes (Real-time):
- `pages/api/socket/messages/index.ts` - Create channel message
- `pages/api/socket/messages/[messageId].ts` - Update/delete channel message
- `pages/api/socket/direct-messages/index.ts` - Create direct message
- `pages/api/socket/direct-messages/[directmessageId].ts` - Update/delete direct message

### 4. **Profile Management** (3 files)
- `lib/currentProfile.ts` - Get current user profile
- `lib/currentProfilePage.ts` - Get profile in pages API
- `lib/initialProfile.ts` - Create initial profile from Clerk

### 5. **Conversation Management** (1 file)
- `lib/conversation.ts` - Get or create conversation between members

### 6. **Page Components** (5+ files)
Files that query the database for rendering:
- `app/(setup)/page.tsx`
- `app/(main)/(routes)/servers/[serverId]/page.tsx`
- `app/(main)/(routes)/servers/[serverId]/channels/[channelId]/page.tsx`
- `app/(main)/(routes)/servers/[serverId]/conversations/[memberId]/page.tsx`
- `components/navigation/NavigationSidebar.tsx`
- `components/server/ServerSideBar.tsx`

## Cassandra Query Patterns

### Key Differences from MongoDB/Prisma:

1. **No Joins**: Cassandra doesn't support joins. Data must be denormalized.
2. **No Complex Filters**: Queries must use partition key and clustering columns.
3. **Write Multiple Tables**: Updates often require writing to multiple tables.
4. **UUID Generation**: Use `uuid()` in Cassandra or generate UUIDs in application.

### Example Migrations:

#### 1. Create Server (Prisma → Cassandra)

**Prisma (Before):**
```typescript
const server = await db.server.create({
  data: {
    profileId: profile.id,
    name,
    imageUrl,
    inviteCode: uuidv4(),
    channels: {
      create: [{ name: "general", profileId: profile.id }]
    },
    members: {
      create: [{ profileId: profile.id, role: MemberRole.ADMIN }]
    }
  }
});
```

**Cassandra (After):**
```typescript
const serverId = uuid();
const channelId = uuid();
const memberId = uuid();
const inviteCode = uuidv4();

// Insert server
await db.execute(
  'INSERT INTO servers_by_id (id, name, image_url, invite_code, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [serverId, name, imageUrl, inviteCode, profile.id, new Date(), new Date()],
  { prepare: true }
);

// Insert invite code lookup
await db.execute(
  'INSERT INTO servers_by_invite_code (invite_code, server_id, server_name, server_image_url) VALUES (?, ?, ?, ?)',
  [inviteCode, serverId, name, imageUrl],
  { prepare: true }
);

// Insert server-profile relationship
await db.execute(
  'INSERT INTO servers_by_profile (profile_id, server_id, server_name, server_image_url, member_role, joined_at) VALUES (?, ?, ?, ?, ?, ?)',
  [profile.id, serverId, name, imageUrl, 'ADMIN', new Date()],
  { prepare: true }
);

// Insert channel
await db.execute(
  'INSERT INTO channels_by_id (id, name, type, server_id, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [channelId, 'general', 'TEXT', serverId, profile.id, new Date(), new Date()],
  { prepare: true }
);

// Insert channel-server relationship
await db.execute(
  'INSERT INTO channels_by_server (server_id, created_at, id, name, type, profile_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [serverId, new Date(), channelId, 'general', 'TEXT', profile.id, new Date()],
  { prepare: true }
);

// Insert member
await db.execute(
  'INSERT INTO members_by_id (id, role, profile_id, server_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  [memberId, 'ADMIN', profile.id, serverId, new Date(), new Date()],
  { prepare: true }
);

// Insert member-server relationship
await db.execute(
  'INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [serverId, 'ADMIN', memberId, profile.id, profile.name, profile.imageUrl, profile.email, new Date(), new Date()],
  { prepare: true }
);

// Insert member lookup by profile and server
await db.execute(
  'INSERT INTO members_by_profile_and_server (profile_id, server_id, id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  [profile.id, serverId, memberId, 'ADMIN', new Date(), new Date()],
  { prepare: true }
);
```

#### 2. Get Messages with Pagination (Prisma → Cassandra)

**Prisma (Before):**
```typescript
const messages = await db.message.findMany({
  take: MESSAGES_PER_PAGE,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  where: { channelId },
  include: {
    member: {
      include: {
        profile: true
      }
    }
  },
  orderBy: { createdAt: "desc" }
});
```

**Cassandra (After):**
```typescript
let query = 'SELECT * FROM messages_by_channel WHERE channel_id = ?';
const params = [channelId];

if (cursor) {
  // Parse cursor timestamp
  const cursorDate = new Date(cursor);
  query += ' AND created_at < ?';
  params.push(cursorDate);
}

query += ' LIMIT ?';
params.push(MESSAGES_PER_PAGE);

const result = await db.execute(query, params, { prepare: true });
const messages = result.rows;
```

#### 3. Get or Create Conversation (Prisma → Cassandra)

**Prisma (Before):**
```typescript
let conversation = await db.conversation.findFirst({
  where: {
    AND: [
      { memberOneId: memberOneId },
      { memberTwoId: memberTwoId }
    ]
  },
  include: {
    memberOne: { include: { profile: true } },
    memberTwo: { include: { profile: true } }
  }
});

if (!conversation) {
  conversation = await db.conversation.create({
    data: { memberOneId, memberTwoId },
    include: {
      memberOne: { include: { profile: true } },
      memberTwo: { include: { profile: true } }
    }
  });
}
```

**Cassandra (After):**
```typescript
// Try both combinations
const result1 = await db.execute(
  'SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ?',
  [memberOneId, memberTwoId],
  { prepare: true }
);

const result2 = await db.execute(
  'SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ?',
  [memberTwoId, memberOneId],
  { prepare: true }
);

let conversationId = result1.rows[0]?.id || result2.rows[0]?.id;

if (!conversationId) {
  // Create new conversation
  conversationId = uuid();
  const now = new Date();
  
  await db.execute(
    'INSERT INTO conversations_by_id (id, member_one_id, member_two_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [conversationId, memberOneId, memberTwoId, now, now],
    { prepare: true }
  );
  
  await db.execute(
    'INSERT INTO conversations_by_members (member_one_id, member_two_id, id, created_at) VALUES (?, ?, ?, ?)',
    [memberOneId, memberTwoId, conversationId, now],
    { prepare: true }
  );
}

// Get full conversation details (you'll need to fetch members separately)
const conversationResult = await db.execute(
  'SELECT * FROM conversations_by_id WHERE id = ?',
  [conversationId],
  { prepare: true }
);
```

## TypeScript Type Definitions

Create a new file `types/cassandra.ts` to define types:

```typescript
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
```

## Migration Checklist

### Phase 1: Preparation
- [x] Update `schema.cql` with correct Discord schema
- [x] Update `lib/db.ts` with new keyspace name
- [ ] Create `types/cassandra.ts` with TypeScript type definitions
- [ ] Set up Cassandra Docker containers (already configured in `docker-compose.yml`)
- [ ] Run schema creation in Cassandra

### Phase 2: Core Utilities
- [ ] Update `lib/currentProfile.ts`
- [ ] Update `lib/currentProfilePage.ts`
- [ ] Update `lib/initialProfile.ts`
- [ ] Update `lib/conversation.ts`

### Phase 3: API Routes - Server Management
- [ ] Update `app/api/server/route.ts`
- [ ] Update `app/api/server/[serverId]/route.ts`
- [ ] Update `app/api/server/[serverId]/invite-code/route.ts`
- [ ] Update `app/api/server/[serverId]/leave/route.ts`

### Phase 4: API Routes - Channel & Member Management
- [ ] Update `app/api/channels/route.ts`
- [ ] Update `app/api/channels/[channelId]/route.ts`
- [ ] Update `app/api/members/[memberId]/route.ts`

### Phase 5: API Routes - Messages
- [ ] Update `app/api/messages/route.ts`
- [ ] Update `app/api/direct-messages/route.ts`
- [ ] Update `pages/api/socket/messages/index.ts`
- [ ] Update `pages/api/socket/messages/[messageId].ts`
- [ ] Update `pages/api/socket/direct-messages/index.ts`
- [ ] Update `pages/api/socket/direct-messages/[directmessageId].ts`

### Phase 6: Page Components
- [ ] Update `app/(setup)/page.tsx`
- [ ] Update `app/(main)/(routes)/servers/[serverId]/page.tsx`
- [ ] Update `app/(main)/(routes)/servers/[serverId]/channels/[channelId]/page.tsx`
- [ ] Update `app/(main)/(routes)/servers/[serverId]/conversations/[memberId]/page.tsx`
- [ ] Update `components/navigation/NavigationSidebar.tsx`
- [ ] Update `components/server/ServerSideBar.tsx`

### Phase 7: Components & Types
- [ ] Update all component imports from `@prisma/client` to use new types
- [ ] Update `types/ServerType.ts`
- [ ] Update hooks that use Prisma types

### Phase 8: Testing & Cleanup
- [ ] Test all CRUD operations
- [ ] Test real-time messaging
- [ ] Test pagination
- [ ] Verify data consistency across denormalized tables
- [ ] Remove Prisma dependencies from `package.json`
- [ ] Remove `prisma/` folder

## Important Notes

### Data Denormalization
Cassandra requires denormalization for performance. When updating data:

1. **Update Profile**: Must update all tables where profile data is denormalized
   - `servers_by_profile`
   - `members_by_server` 
   - `messages_by_channel`
   - `direct_messages_by_conversation`

2. **Update Server**: Must update
   - `servers_by_id`
   - `servers_by_invite_code`
   - `servers_by_profile`

3. **Update Member Role**: Must update
   - `members_by_id`
   - `members_by_server`
   - `members_by_profile_and_server`

### UUID Handling
- Install: `npm install uuid @types/uuid`
- Use `uuid.v4()` for generating UUIDs
- Convert strings to UUIDs when needed for Cassandra driver

### Timestamp Handling
- Cassandra timestamps are stored as milliseconds since epoch
- Convert JavaScript `Date` objects: `date.getTime()`
- Parse from Cassandra: `new Date(timestamp)`

### Batch Operations
For multiple writes, use batch statements:

```typescript
const queries = [
  { query: 'INSERT INTO ...', params: [...] },
  { query: 'INSERT INTO ...', params: [...] }
];

await db.batch(queries, { prepare: true });
```

## Performance Considerations

1. **Read Optimization**: Data is denormalized, so reads are fast
2. **Write Amplification**: Updates may require writing to multiple tables
3. **Pagination**: Use `created_at` timestamp-based pagination
4. **Eventual Consistency**: Accept that denormalized data may be briefly inconsistent

## Additional Resources

- [Cassandra Node.js Driver Documentation](https://docs.datastax.com/en/developer/nodejs-driver/4.6/)
- [Cassandra Data Modeling Best Practices](https://cassandra.apache.org/doc/latest/data_modeling/)
- [UUID Package Documentation](https://www.npmjs.com/package/uuid)
