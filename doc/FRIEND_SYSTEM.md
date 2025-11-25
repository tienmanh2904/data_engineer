Searched codebase for "explain:
friend_requests_by_id
friend_requests_by_sender
friend_requests_by_receiver
friend_requests_by_users
friends_by_user", 15 results

Based on your schema.cql and documentation, here is an explanation of the five tables that make up your Friend System.

In Cassandra, data is modeled around **queries** rather than relationships. This means you often store the same data in multiple ways to answer different questions efficiently.

### 1. `friend_requests_by_id`
*   **Purpose:** The **Master Record** (Source of Truth).
*   **Primary Key:** `id` (UUID)
*   **Query:** "Get details for Request ID X."
*   **Usage:**
    *   Used when a user clicks "Accept" or "Reject" on a specific request.
    *   The API uses this to validate the status of a request before modifying it.
    *   It is the only table that is guaranteed to be unique per request ID.

### 2. `friend_requests_by_sender`
*   **Purpose:** The **"Sent Items"** folder.
*   **Primary Key:** `((sender_id), created_at, id)`
*   **Query:** "Show me all requests User A has sent."
*   **Usage:**
    *   Populates the **"Sent"** tab in the Friends page.
    *   **Denormalization:** It stores copies of the *receiver's* username and avatar so the UI can display the list without looking up the receiver's profile separately (which would be slow).

### 3. `friend_requests_by_receiver`
*   **Purpose:** The **"Inbox"** folder.
*   **Primary Key:** `((receiver_id), created_at, id)`
*   **Query:** "Show me all requests User A has received."
*   **Usage:**
    *   Populates the **"Pending"** tab in the Friends page.
    *   **Denormalization:** It stores copies of the *sender's* username and avatar so the UI can instantly show who sent the request.

### 4. `friend_requests_by_users`
*   **Purpose:** The **Duplicate Checker**.
*   **Primary Key:** `((user_one_id, user_two_id))`
*   **Query:** "Is there already a pending request between User A and User B?"
*   **Usage:**
    *   Checked *before* creating a new request.
    *   Without this, checking if a request exists would require scanning the entire database.
    *   **Note:** Your code checks this table twice (A->B and B->A) to ensure no request exists in either direction.

### 5. `friends_by_user`
*   **Purpose:** The **"Contacts List"**.
*   **Primary Key:** `((user_id), became_friends_at, friend_id)`
*   **Query:** "Show me all friends of User A."
*   **Usage:**
    *   Populates the **"All"** and **"Online"** tabs.
    *   Stores the actual established friendships (Status = ACCEPTED).
    *   When a request is accepted, rows are inserted here for *both* users (User A is friend of B, and B is friend of A).

### Summary of Data Flow
When **User A** sends a request to **User B**:
1.  Check `friend_requests_by_users` (Stop if exists).
2.  Insert into `friend_requests_by_id` (Create ID).
3.  Insert into `friend_requests_by_sender` (So A sees it in "Sent").
4.  Insert into `friend_requests_by_receiver` (So B sees it in "Pending").
5.  Insert into `friend_requests_by_users` (To block future duplicates).

When **User B** accepts:
1.  Update status in tables 1, 2, 3.
2.  Insert into `friends_by_user` for User A.
3.  Insert into `friends_by_user` for User B.

Based on the QUERIES_SUMMARY.md file, here are the API endpoints for the Friend System (Person 2) and their corresponding HTTP methods:

### 1. Friend Requests

**Endpoint:** `/api/friends/requests`
*   **POST**: Send a new friend request.
    *   *Logic:* Inserts into `friend_requests_by_id`, `_sender`, `_receiver`, and `_users`.
*   **GET**: Retrieve pending requests (Incoming/Outgoing).
    *   *Logic:* Selects from `friend_requests_by_receiver` (for "Pending" tab) or `friend_requests_by_sender` (for "Sent" tab).

**Endpoint:** `/api/friends/requests/[requestId]`
*   **PATCH**: Accept or Reject a friend request.
    *   *Logic:* Updates status to 'ACCEPTED' or 'REJECTED' in all 4 request tables. If accepted, also inserts into `friends_by_user`.

### 2. Friends List

**Endpoint:** `/api/friends`
*   **GET**: Get the current user's friends list.
    *   *Logic:* Selects from `friends_by_user`.

**Endpoint:** `/api/friends/[friendId]`
*   **DELETE**: Remove a friend.
    *   *Logic:* Deletes the friendship record from `friends_by_user` for both users.