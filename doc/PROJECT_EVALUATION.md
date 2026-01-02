# Project Evaluation & Feedback Analysis

This document outlines specific feedback received regarding the system architecture and provides a technical analysis of the raised concerns along with proposed mitigation strategies.

## 1. Lecturer Feedback

### Limited Consistency Discussion
> "While the authors acknowledge the risks of LOCAL_ONE, there is a lack of detail on how the system handles specific failure modes or data repair (beyond mentioning Read-repair/Batch update)."

### Scalability Constraints
> "The performance testing was limited to 1,000 mock servers. In a true Discord-scale environment, the 'Wide Partition' strategy could lead to 'Hot Partitions' if a single channel becomes excessively large."

---

## 2. Technical Analysis & Mitigation

### A. Consistency Models (LOCAL_ONE)

**The Issue:**
Using `LOCAL_ONE` consistency for writes means the coordinator node considers the write successful as soon as *one* local replica acknowledges it.
- **Risk:** If that single replica crashes before the data propagates to other replicas (Hinted Handoff or Read Repair), the data is permanently lost.
- **Consequence:** Users might see a message "send" successfully, but upon refresh (hitting a different replica), it disappears.

**Mitigation & Repair Strategies:**

1.  **Write Consistency Upgrade (Recommended):**
    - **Action:** Switch critical writes (User Registration, Friend Requests) to `LOCAL_QUORUM`.
    - **Trade-off:** Slightly higher latency, but ensures strong consistency within the datacenter (requires majority acknowledgment). writers will not succeed if a majority of replicas are down.

2.  **Read Repair (Active):**
    - **Mechanism:** When a read occurs at a consistency level > `ONE` (e.g., `LOCAL_QUORUM`), Cassandra contacts multiple replicas. If it detects a digest mismatch (stale data), it initiates a background read repair to update the stale nodes with the latest data.
    - **Usage:** Our application uses `LOCAL_QUORUM` for reads in critical paths (e.g., Auth checks), effectively repairing data on access.

3.  **Anti-Entropy Repair (Maintenance):**
    - **Mechanism:** `nodetool repair` must be run periodically (e.g., weekly) to fix data inconsistencies (Merkle tree comparison) that Read Repair missed (e.g., data that is rarely read).
    - **Implementation:** Scheduled cron job on the production cluster.

4.  **Hinted Handoff (Transient Failure):**
    - **Mechanism:** If a replica is down during a write, the coordinator stores a "hint". When the replica recovers, the coordinator replays the write.
    - **Limitation:** Hints are stored for a limited time (default 3 hours). If a node is down longer, `nodetool repair` is required.

---

### B. Scalability: Wide & Hot Partitions

**The Issue:**
In the current schema, `messages_by_channel` uses `channel_id` as the Partition Key.
- **Wide Partition:** If a single channel has millions of messages, the partition grows indefinitely. Cassandra partitions ideally should stay under 100MB or 100k cells.
- **Hot Partition:** All writes for a popular channel hit the specific nodes responsible for that `channel_id` hash token, creating a "hot spot" while other nodes sit idle.

**Mitigation & Schema Evolution:**

1.  **Time-Window Bucketing (Recommended):**
    - **Strategy:** Append a time component (Bucket) to the Partition Key.
    - **New Schema:**
      ```cql
      PRIMARY KEY ((channel_id, bucket), created_at, id)
      ```
    - **Implementation:**
      - `bucket` could be `month_year` (e.g., `2023-11`) or a roughly calculated integer `(timestamp / bucket_size)`.
      - When querying, the application calculates the current bucket. If pagination reaches the end of the current bucket, it queries the previous bucket.
    - **Result:** Keeps partition sizes manageable and allows archiving/dropping old data easily.

2.  **Shard/Bucket ID:**
    - **Strategy:** For massively concurrent writes, distribute messages into random buckets within a time window.
    - **Trade-off:** Makes reading harder (must scatter-gather query all buckets to merge-sort results). Usually necessary only for extreme scales (e.g., Twitch chat).

3.  **Archival Strategy:**
    - Move messages older than X months to "Cold Storage" (e.g., separate keyspace or S3-backed storage) to keep the active Cassandra dataset lean.

---

## 3. Current Implementation Status

**⚠️ STATUS: NOT IMPLEMENTED**

Upon reviewing the codebase (`schema.cql`, `lib/db.ts`, and API routes), the project currently **DOES NOT** apply the recommended mitigation strategies:

1.  **Consistency**:
    -   The Cassandra client (`lib/db.ts`) allows the default driver consistency (usually `LOCAL_ONE` or `ONE`).
    -   Critical operations like User Registration (`app/api/auth/register/route.ts`) do **not** explicitly set `{ consistency: types.consistencies.localQuorum }`.
    -   **Risk**: There is a window for data loss or "phantom" reads if a replica fails immediately after a write.

2.  **Scalability**:
    -   Table `messages_by_channel` uses `PRIMARY KEY ((channel_id), created_at, id)`.
    -   **Risk**: A single channel with millions of messages will create a massive Wide Partition, degrading performance over time. "Hot Spot" risk is high for active channels.
