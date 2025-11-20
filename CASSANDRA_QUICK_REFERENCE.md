# Cassandra Query Quick Reference

This document provides quick reference examples for common database operations in the Discord app migration.

## Setup

```typescript
import { Client } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';

const db = new Client({
  contactPoints: ['localhost'],
  localDataCenter: 'dc1',
  keyspace: 'discord_app'
});

// Helper to generate UUID
const uuid = () => uuidv4();
```

## Profile Operations

### Get Profile by Clerk User ID
```typescript
const getProfileByUserId = async (userId: string) => {
  const result = await db.execute(
    'SELECT * FROM profiles_by_user_id WHERE user_id = ?',
    [userId],
    { prepare: true }
  );
  return result.rows[0] || null;
};
```

### Create Profile
```typescript
const createProfile = async (userId: string, name: string, imageUrl: string, email: string) => {
  const profileId = uuid();
  const now = new Date();
  
  const queries = [
    {
      query: 'INSERT INTO profiles_by_id (id, user_id, name, image_url, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [profileId, userId, name, imageUrl, email, now, now]
    },
    {
      query: 'INSERT INTO profiles_by_user_id (user_id, id, name, image_url, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [userId, profileId, name, imageUrl, email, now, now]
    }
  ];
  
  await db.batch(queries, { prepare: true });
  return { id: profileId, userId, name, imageUrl, email, createdAt: now, updatedAt: now };
};
```

## Server Operations

### Create Server
```typescript
const createServer = async (profileId: string, name: string, imageUrl: string, profileName: string, profileImageUrl: string, profileEmail: string) => {
  const serverId = uuid();
  const channelId = uuid();
  const memberId = uuid();
  const inviteCode = uuidv4();
  const now = new Date();
  
  const queries = [
    // Server
    {
      query: 'INSERT INTO servers_by_id (id, name, image_url, invite_code, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [serverId, name, imageUrl, inviteCode, profileId, now, now]
    },
    // Invite code lookup
    {
      query: 'INSERT INTO servers_by_invite_code (invite_code, server_id, server_name, server_image_url) VALUES (?, ?, ?, ?)',
      params: [inviteCode, serverId, name, imageUrl]
    },
    // Profile-server relationship
    {
      query: 'INSERT INTO servers_by_profile (profile_id, server_id, server_name, server_image_url, member_role, joined_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [profileId, serverId, name, imageUrl, 'ADMIN', now]
    },
    // Default channel
    {
      query: 'INSERT INTO channels_by_id (id, name, type, server_id, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [channelId, 'general', 'TEXT', serverId, profileId, now, now]
    },
    {
      query: 'INSERT INTO channels_by_server (server_id, created_at, id, name, type, profile_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [serverId, now, channelId, 'general', 'TEXT', profileId, now]
    },
    // Member
    {
      query: 'INSERT INTO members_by_id (id, role, profile_id, server_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [memberId, 'ADMIN', profileId, serverId, now, now]
    },
    {
      query: 'INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: [serverId, 'ADMIN', memberId, profileId, profileName, profileImageUrl, profileEmail, now, now]
    },
    {
      query: 'INSERT INTO members_by_profile_and_server (profile_id, server_id, id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      params: [profileId, serverId, memberId, 'ADMIN', now, now]
    }
  ];
  
  await db.batch(queries, { prepare: true });
  
  return {
    id: serverId,
    name,
    imageUrl,
    inviteCode,
    profileId,
    createdAt: now,
    updatedAt: now
  };
};
```

### Get Servers for Profile
```typescript
const getServersByProfile = async (profileId: string) => {
  const result = await db.execute(
    'SELECT * FROM servers_by_profile WHERE profile_id = ?',
    [profileId],
    { prepare: true }
  );
  return result.rows;
};
```

### Get Server by ID (with channels and members)
```typescript
const getServerById = async (serverId: string) => {
  // Get server
  const serverResult = await db.execute(
    'SELECT * FROM servers_by_id WHERE id = ?',
    [serverId],
    { prepare: true }
  );
  const server = serverResult.rows[0];
  
  if (!server) return null;
  
  // Get channels
  const channelsResult = await db.execute(
    'SELECT * FROM channels_by_server WHERE server_id = ?',
    [serverId],
    { prepare: true }
  );
  
  // Get members
  const membersResult = await db.execute(
    'SELECT * FROM members_by_server WHERE server_id = ?',
    [serverId],
    { prepare: true }
  );
  
  return {
    ...server,
    channels: channelsResult.rows,
    members: membersResult.rows
  };
};
```

### Update Server
```typescript
const updateServer = async (serverId: string, name: string, imageUrl: string) => {
  const now = new Date();
  
  // Update main table
  await db.execute(
    'UPDATE servers_by_id SET name = ?, image_url = ?, updated_at = ? WHERE id = ?',
    [name, imageUrl, now, serverId],
    { prepare: true }
  );
  
  // Get invite code for lookup table
  const serverResult = await db.execute(
    'SELECT invite_code FROM servers_by_id WHERE id = ?',
    [serverId],
    { prepare: true }
  );
  const inviteCode = serverResult.rows[0].invite_code;
  
  // Update invite code lookup
  await db.execute(
    'UPDATE servers_by_invite_code SET server_name = ?, server_image_url = ? WHERE invite_code = ?',
    [name, imageUrl, inviteCode],
    { prepare: true }
  );
  
  // Update in servers_by_profile (requires reading all profiles first)
  const membersResult = await db.execute(
    'SELECT profile_id FROM members_by_server WHERE server_id = ?',
    [serverId],
    { prepare: true }
  );
  
  const updateQueries = membersResult.rows.map(member => ({
    query: 'UPDATE servers_by_profile SET server_name = ?, server_image_url = ? WHERE profile_id = ? AND server_id = ?',
    params: [name, imageUrl, member.profile_id, serverId]
  }));
  
  if (updateQueries.length > 0) {
    await db.batch(updateQueries, { prepare: true });
  }
};
```

## Channel Operations

### Create Channel
```typescript
const createChannel = async (serverId: string, name: string, type: string, profileId: string) => {
  const channelId = uuid();
  const now = new Date();
  
  const queries = [
    {
      query: 'INSERT INTO channels_by_id (id, name, type, server_id, profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [channelId, name, type, serverId, profileId, now, now]
    },
    {
      query: 'INSERT INTO channels_by_server (server_id, created_at, id, name, type, profile_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params: [serverId, now, channelId, name, type, profileId, now]
    }
  ];
  
  await db.batch(queries, { prepare: true });
  
  return { id: channelId, name, type, serverId, profileId, createdAt: now, updatedAt: now };
};
```

### Get Channels by Server
```typescript
const getChannelsByServer = async (serverId: string) => {
  const result = await db.execute(
    'SELECT * FROM channels_by_server WHERE server_id = ?',
    [serverId],
    { prepare: true }
  );
  return result.rows;
};
```

### Delete Channel
```typescript
const deleteChannel = async (channelId: string) => {
  // First get channel info
  const channelResult = await db.execute(
    'SELECT server_id, created_at FROM channels_by_id WHERE id = ?',
    [channelId],
    { prepare: true }
  );
  
  const channel = channelResult.rows[0];
  if (!channel) return;
  
  const queries = [
    {
      query: 'DELETE FROM channels_by_id WHERE id = ?',
      params: [channelId]
    },
    {
      query: 'DELETE FROM channels_by_server WHERE server_id = ? AND created_at = ? AND id = ?',
      params: [channel.server_id, channel.created_at, channelId]
    }
  ];
  
  await db.batch(queries, { prepare: true });
};
```

## Member Operations

### Get Member by Profile and Server
```typescript
const getMemberByProfileAndServer = async (profileId: string, serverId: string) => {
  const result = await db.execute(
    'SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?',
    [profileId, serverId],
    { prepare: true }
  );
  return result.rows[0] || null;
};
```

### Update Member Role
```typescript
const updateMemberRole = async (memberId: string, serverId: string, profileId: string, newRole: string) => {
  const now = new Date();
  
  // Get current member info
  const memberResult = await db.execute(
    'SELECT * FROM members_by_id WHERE id = ?',
    [memberId],
    { prepare: true }
  );
  const member = memberResult.rows[0];
  
  const queries = [
    {
      query: 'UPDATE members_by_id SET role = ?, updated_at = ? WHERE id = ?',
      params: [newRole, now, memberId]
    },
    {
      query: 'DELETE FROM members_by_server WHERE server_id = ? AND role = ? AND id = ?',
      params: [serverId, member.role, memberId]
    },
    {
      query: 'INSERT INTO members_by_server (server_id, role, id, profile_id, profile_name, profile_image_url, profile_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: [serverId, newRole, memberId, profileId, member.profile_name, member.profile_image_url, member.profile_email, member.created_at, now]
    },
    {
      query: 'UPDATE members_by_profile_and_server SET role = ?, updated_at = ? WHERE profile_id = ? AND server_id = ?',
      params: [newRole, now, profileId, serverId]
    }
  ];
  
  await db.batch(queries, { prepare: true });
};
```

## Message Operations

### Create Channel Message
```typescript
const createMessage = async (
  channelId: string,
  memberId: string,
  content: string,
  fileUrl: string | null,
  memberProfileId: string,
  memberProfileName: string,
  memberProfileImageUrl: string,
  memberRole: string
) => {
  const messageId = uuid();
  const now = new Date();
  
  const queries = [
    {
      query: 'INSERT INTO messages_by_id (id, content, file_url, member_id, channel_id, deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      params: [messageId, content, fileUrl, memberId, channelId, false, now, now]
    },
    {
      query: 'INSERT INTO messages_by_channel (channel_id, created_at, id, content, file_url, member_id, member_profile_id, member_profile_name, member_profile_image_url, member_role, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: [channelId, now, messageId, content, fileUrl, memberId, memberProfileId, memberProfileName, memberProfileImageUrl, memberRole, false, now]
    }
  ];
  
  await db.batch(queries, { prepare: true });
  
  return { id: messageId, content, fileUrl, memberId, channelId, deleted: false, createdAt: now, updatedAt: now };
};
```

### Get Messages (Paginated)
```typescript
const getMessages = async (channelId: string, cursor: string | null, limit: number = 10) => {
  let query = 'SELECT * FROM messages_by_channel WHERE channel_id = ?';
  const params = [channelId];
  
  if (cursor) {
    const cursorDate = new Date(cursor);
    query += ' AND created_at < ?';
    params.push(cursorDate);
  }
  
  query += ' LIMIT ?';
  params.push(limit);
  
  const result = await db.execute(query, params, { prepare: true });
  
  return {
    messages: result.rows,
    nextCursor: result.rows.length === limit ? result.rows[limit - 1].created_at.toISOString() : null
  };
};
```

### Update Message
```typescript
const updateMessage = async (messageId: string, channelId: string, content: string) => {
  const now = new Date();
  
  // Get message info
  const msgResult = await db.execute(
    'SELECT created_at FROM messages_by_id WHERE id = ?',
    [messageId],
    { prepare: true }
  );
  const createdAt = msgResult.rows[0].created_at;
  
  const queries = [
    {
      query: 'UPDATE messages_by_id SET content = ?, updated_at = ? WHERE id = ?',
      params: [content, now, messageId]
    },
    {
      query: 'UPDATE messages_by_channel SET content = ?, updated_at = ? WHERE channel_id = ? AND created_at = ? AND id = ?',
      params: [content, now, channelId, createdAt, messageId]
    }
  ];
  
  await db.batch(queries, { prepare: true });
};
```

### Delete Message (Soft Delete)
```typescript
const deleteMessage = async (messageId: string, channelId: string) => {
  const now = new Date();
  
  // Get message info
  const msgResult = await db.execute(
    'SELECT created_at FROM messages_by_id WHERE id = ?',
    [messageId],
    { prepare: true }
  );
  const createdAt = msgResult.rows[0].created_at;
  
  const queries = [
    {
      query: 'UPDATE messages_by_id SET deleted = ?, updated_at = ? WHERE id = ?',
      params: [true, now, messageId]
    },
    {
      query: 'UPDATE messages_by_channel SET deleted = ?, updated_at = ? WHERE channel_id = ? AND created_at = ? AND id = ?',
      params: [true, now, channelId, createdAt, messageId]
    }
  ];
  
  await db.batch(queries, { prepare: true });
};
```

## Conversation & Direct Message Operations

### Get or Create Conversation
```typescript
const getOrCreateConversation = async (memberOneId: string, memberTwoId: string) => {
  // Try to find existing conversation
  const result1 = await db.execute(
    'SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ?',
    [memberOneId, memberTwoId],
    { prepare: true }
  );
  
  if (result1.rows.length > 0) {
    return result1.rows[0];
  }
  
  const result2 = await db.execute(
    'SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ?',
    [memberTwoId, memberOneId],
    { prepare: true }
  );
  
  if (result2.rows.length > 0) {
    return result2.rows[0];
  }
  
  // Create new conversation
  const conversationId = uuid();
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
  
  return { id: conversationId, member_one_id: memberOneId, member_two_id: memberTwoId, created_at: now };
};
```

### Create Direct Message
```typescript
const createDirectMessage = async (
  conversationId: string,
  memberId: string,
  content: string,
  fileUrl: string | null,
  memberProfileId: string,
  memberProfileName: string,
  memberProfileImageUrl: string
) => {
  const messageId = uuid();
  const now = new Date();
  
  const queries = [
    {
      query: 'INSERT INTO direct_messages_by_id (id, content, file_url, member_id, conversation_id, deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      params: [messageId, content, fileUrl, memberId, conversationId, false, now, now]
    },
    {
      query: 'INSERT INTO direct_messages_by_conversation (conversation_id, created_at, id, content, file_url, member_id, member_profile_id, member_profile_name, member_profile_image_url, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: [conversationId, now, messageId, content, fileUrl, memberId, memberProfileId, memberProfileName, memberProfileImageUrl, false, now]
    }
  ];
  
  await db.batch(queries, { prepare: true });
  
  return { id: messageId, content, fileUrl, memberId, conversationId, deleted: false, createdAt: now, updatedAt: now };
};
```

### Get Direct Messages (Paginated)
```typescript
const getDirectMessages = async (conversationId: string, cursor: string | null, limit: number = 10) => {
  let query = 'SELECT * FROM direct_messages_by_conversation WHERE conversation_id = ?';
  const params = [conversationId];
  
  if (cursor) {
    const cursorDate = new Date(cursor);
    query += ' AND created_at < ?';
    params.push(cursorDate);
  }
  
  query += ' LIMIT ?';
  params.push(limit);
  
  const result = await db.execute(query, params, { prepare: true });
  
  return {
    messages: result.rows,
    nextCursor: result.rows.length === limit ? result.rows[limit - 1].created_at.toISOString() : null
  };
};
```

## Error Handling

```typescript
try {
  await db.execute(query, params, { prepare: true });
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Cannot connect to Cassandra');
  } else if (error.code === 'ResponseError') {
    console.error('Cassandra query error:', error.message);
  }
  throw error;
}
```

## Performance Tips

1. **Always use prepared statements**: `{ prepare: true }`
2. **Use batch for multiple writes**: `db.batch(queries, { prepare: true })`
3. **Limit query results**: Always use `LIMIT` clause
4. **Avoid `ALLOW FILTERING`**: Design tables for your queries
5. **Use async/await**: Don't block the event loop
