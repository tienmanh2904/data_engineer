Based on the standard architecture for this Discord clone project (and the typical responsibilities of "Person 5" in your team structure), here are the APIs related to messaging.

### 1. Server Channel Messages
These endpoints handle messages within a specific text channel in a server.

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/messages` | **Load Messages.** Fetches a batch of messages for infinite scrolling. | `channelId` |
| **POST** | `/api/socket/messages` | **Send Message.** Creates a new message and triggers a socket event. | `channelId`, `serverId` |
| **PATCH** | `/api/socket/messages/[messageId]` | **Edit Message.** Updates the content of an existing message. | `channelId`, `serverId` |
| **DELETE** | `/api/socket/messages/[messageId]` | **Delete Message.** Soft deletes or removes a message. | `channelId`, `serverId` |

### 2. Direct Messages (DMs)
These endpoints handle private messages between two users. Note that DMs require a `conversationId` first.

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/conversations` | **Get/Create Conversation.** Finds an existing conversation or creates a new one between the current user and another member. | N/A (Body: `memberId`) |
| **GET** | `/api/direct-messages` | **Load DMs.** Fetches a batch of direct messages for infinite scrolling. | `conversationId` |
| **POST** | `/api/socket/direct-messages` | **Send DM.** Creates a new direct message and triggers a socket event. | `conversationId` |
| **PATCH** | `/api/socket/direct-messages/[directMessageId]` | **Edit DM.** Updates the content of an existing direct message. | `conversationId` |
| **DELETE** | `/api/socket/direct-messages/[directMessageId]` | **Delete DM.** Soft deletes or removes a direct message. | `conversationId` |

**Note on "Socket" Routes:**
The routes with `/socket/` in the path are typically handled by a separate Pages Router instance (in Next.js) to support WebSocket connections, whereas standard CRUD operations (like loading history) use the standard App Router.