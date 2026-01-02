# Cassandra Query Patterns & Explanations

This document outlines the data access patterns used in the application. It explains the purpose of each query, the table it targets, and the reasoning behind the schema design (Partition Keys vs. Clustering Keys).

---

## 1. Authentication & User Profiles

### User Registration
When a new user registers, we denormalize their data across multiple tables to support different lookup patterns (by ID, Username, Email) without needing secondary indexes which are less performant at scale.

**Query:**
```cql
-- Batch insert for atomicity
BEGIN BATCH
  INSERT INTO users_by_id (id, username, email, password_hash, ...) VALUES (?, ?, ?, ?, ...);
  INSERT INTO users_by_username (username, id, email, ...) VALUES (?, ?, ?, ...);
  INSERT INTO users_by_email (email, id, username, ...) VALUES (?, ?, ?, ...);
  INSERT INTO profiles_by_id (id, user_id, name, email, ...) VALUES (?, ?, ?, ?, ...);
  INSERT INTO profiles_by_user_id (user_id, id, name, email, ...) VALUES (?, ?, ?, ?, ...);
APPLY BATCH;
```

### User Login
We look up users by their username to verify credentials. The `users_by_username` table uses `username` as the **Partition Key** for O(1) direct lookup.

**Query:**
```cql
SELECT * FROM users_by_username WHERE username = ?;
```

### Existence Checks
Before registration, we verify uniqueness of usernames and emails.

**Queries:**
```cql
SELECT * FROM users_by_username WHERE username = ?;
SELECT * FROM users_by_email WHERE email = ?;
```

### Profile Retrieval
Profiles are retrieved either by the internal profile UUID or the external User ID (e.g., from a third-party auth provider or the internal auth system).

**Queries:**
```cql
-- Allow lookup by external/auth user_id
SELECT * FROM profiles_by_user_id WHERE user_id = ?;

-- Allow lookup by internal profile_id
SELECT * FROM profiles_by_id WHERE id = ?;
```

---

## 2. Friend System

### Sending a Friend Request
Friend requests are complex because they need to be queryable by:
1. The unique Request ID.
2. The Sender (to show "Sent Requests").
3. The Receiver (to show "Received Requests").
4. The pair of Users (to check if a request already exists).

We use a **Batch Insert** to keep these views in sync.

**Query:**
```cql
BEGIN BATCH
  INSERT INTO friend_requests_by_id (id, sender_id, receiver_id, status, ...) VALUES (...);
  INSERT INTO friend_requests_by_sender (sender_id, created_at, id, ...) VALUES (...);
  INSERT INTO friend_requests_by_receiver (receiver_id, created_at, id, ...) VALUES (...);
  INSERT INTO friend_requests_by_users (user_one_id, user_two_id, id, status, ...) VALUES (...);
APPLY BATCH;
```

### Retrieving Friend Requests
We use the `sender_id` or `receiver_id` as the **Partition Key** to group all requests for a user together. `created_at` is a **Clustering Key** (DESC) to ensure the newest requests appear first.

**Queries:**
```cql
-- Get sent requests (My outgoing requests)
SELECT * FROM friend_requests_by_sender WHERE sender_id = ?;

-- Get received requests (My incoming requests)
SELECT * FROM friend_requests_by_receiver WHERE receiver_id = ?;
```

### Accepting a Request
Accepting a request involves updating the status in all request tables and creating the friendship entries.

**Query:**
```cql
BEGIN BATCH
  -- Update status to ACCEPTED
  UPDATE friend_requests_by_id SET status = 'ACCEPTED' WHERE id = ?;
  UPDATE friend_requests_by_sender SET status = 'ACCEPTED' WHERE sender_id = ? AND created_at = ? AND id = ?;
  UPDATE friend_requests_by_receiver SET status = 'ACCEPTED' WHERE receiver_id = ? AND created_at = ? AND id = ?;
  UPDATE friend_requests_by_users SET status = 'ACCEPTED' WHERE user_one_id = ? AND user_two_id = ?;

  -- Create bidirectional friendship
  INSERT INTO friends_by_user (user_id, friend_id, ...) VALUES (me, friend, ...);
  INSERT INTO friends_by_user (user_id, friend_id, ...) VALUES (friend, me, ...);
APPLY BATCH;
```

### Checking Friendship Status
To prevent duplicate requests, we check if a relationship exists between two users. Note that we store relationships sorted by user IDs (e.g., `user_one_id < user_two_id`) to ensure a consistent lookup key regardless of who initiated.

**Query:**
```cql
SELECT * FROM friend_requests_by_users WHERE user_one_id = ? AND user_two_id = ?;
```

---

## 3. Server Management

### Creating a Server
When a server is created, we also create default entries (not shown in this batch but typically handled in logic). The server itself is indexed by ID, Invite Code, and for the creator's profile list.

**Query:**
```cql
BEGIN BATCH
  INSERT INTO servers_by_id (id, name, invite_code, ...) VALUES (...);
  INSERT INTO servers_by_invite_code (invite_code, server_id, ...) VALUES (...);
  INSERT INTO servers_by_profile (profile_id, server_id, ...) VALUES (creator_id, server_id, ...);
APPLY BATCH;
```

### Browsing User's Servers
To list the servers a user has joined (the sidebar), we query `servers_by_profile`. `profile_id` is the **Partition Key**, and `joined_at` is the **Clustering Key** (DESC) to show recently joined servers at the top (or sorted by preference if schema supported it).

**Query:**
```cql
SELECT * FROM servers_by_profile WHERE profile_id = ?;
```

### Joining a Server via Invite Code
1. **Lookup**: First, resolve the invite code to a server ID.
2. **Join**: Add the user to the server members and the server to the user's server list.

**Lookup Query:**
```cql
SELECT * FROM servers_by_invite_code WHERE invite_code = ?;
```

**Join Query (Batch):**
```cql
BEGIN BATCH
  -- Add server to user's list
  INSERT INTO servers_by_profile (profile_id, server_id, ...) VALUES (...);
  
  -- Add user to server's member list (See Member Management)
  INSERT INTO members_by_id (id, server_id, profile_id, ...) VALUES (...);
  INSERT INTO members_by_server (server_id, role, id, ...) VALUES (...);
  INSERT INTO members_by_profile_and_server (profile_id, server_id, id, ...) VALUES (...);
APPLY BATCH;
```

---

## 4. Channels & Member Management

### Retrieving Server Channels
Channels are grouped by `server_id` (**Partition Key**) so we can fetch all channels for a server in a single efficient query. They are ordered by `created_at` or `type`.

**Query:**
```cql
SELECT * FROM channels_by_server WHERE server_id = ?;
```

### Retrieving Server Members
We often need to display the member list. Members are partitioned by `server_id` and clustered by `role` and `id`, allowing us to easily show Admins, Moderators, and Guests in order.

**Query:**
```cql
-- Get all members
SELECT * FROM members_by_server WHERE server_id = ?;
```

### Checking Member Permissions
Before allowing an action (e.g., deleting a message), we need to check the user's role in that specific server.

**Query:**
```cql
SELECT * FROM members_by_profile_and_server WHERE profile_id = ? AND server_id = ?;
```

---

## 5. Messaging System

### Storing Messages
Messages are write-heavy. We store them in `messages_by_channel` partitioned by `channel_id`. `created_at` is the **Clustering Key** (DESC), ensuring the latest messages are physically stored together for efficient retrieval.

**Query:**
```cql
BEGIN BATCH
  INSERT INTO messages_by_id (id, channel_id, content, ...) VALUES (...);
  INSERT INTO messages_by_channel (channel_id, created_at, id, content, ...) VALUES (...);
APPLY BATCH;
```

### Retrieving Messages (Pagination)
We use **Cursor-based Pagination** (using `created_at`). Avoid `OFFSET`.

**Query:**
```cql
-- First page (latest messages)
SELECT * FROM messages_by_channel WHERE channel_id = ? LIMIT 50;

-- Next page (older than the last message seen)
SELECT * FROM messages_by_channel 
WHERE channel_id = ? AND created_at < ? 
LIMIT 50;
```

### Message Updates & Deletes
Cassandra is an append-only system. "Deletes" are typically updates setting a `deleted` flag or Tumbstones. For chat apps, we often update the content to "This message has been deleted" and set a flag.

**Query:**
```cql
BEGIN BATCH
  UPDATE messages_by_id SET content = 'Deleted', deleted = true WHERE id = ?;
  UPDATE messages_by_channel SET content = 'Deleted', deleted = true 
  WHERE channel_id = ? AND created_at = ? AND id = ?;
APPLY BATCH;
```
*Note: We must provide the full primary key (including `created_at`) to update `messages_by_channel` efficiently.*

### Direct Messages
Direct Messages function similarly to channel messages but are grouped by `conversation_id`.

**Query:**
```cql
SELECT * FROM direct_messages_by_conversation 
WHERE conversation_id = ? AND created_at < ? 
LIMIT 50;
```

### Finding a Conversation
To start a DM, we check if a conversation already exists between two members. We query `conversations_by_members` which is keyed by the pair of member IDs.

**Query:**
```cql
SELECT * FROM conversations_by_members WHERE member_one_id = ? AND member_two_id = ?;
```
