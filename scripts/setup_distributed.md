# 1. Allow Node B to talk to Node A (Cluster Gossip)
ufw allow from 10.104.0.3 to any port 7000 proto tcp

# 2. Allow Public Access for your Laptop (Stress Test)
ufw allow 9042/tcp

# 3. Allow SSH and App
ufw allow 22/tcp
ufw allow 3000/tcp  # For Next.js

ufw enable


# 1. Allow Node A to talk to Node B (Cluster Gossip)
ufw allow from 10.104.0.2 to any port 7000 proto tcp

# 2. Allow Public Access for your Laptop (Stress Test)
ufw allow 9042/tcp

# 3. Allow SSH
ufw allow 22/tcp

ufw enable


docker compose up -d
*Wait about 60 seconds for Cassandra to fully start before moving to Phase 3.*

---

### Phase 3: Setup Droplet B (The Peer)

**Step 3.1: Create/Edit `docker-compose.yml`**
Run `nano docker-compose.yml` on Droplet B and paste this content.


http://googleusercontent.com/immersive_entry_chip/1

**Step 3.2: Start Droplet B**
```bash
docker compose up -d

---

### Phase 4: Verification

**Step 4.1: Check Cluster Status**
Run this command on **Droplet A**:

```bash
docker exec -it cassandra-1 nodetool status
docker cp schema.cql cassandra-1:/schema.cql
docker exec -it cassandra-1 cqlsh -f /schema.cql
**Expected Output:**
You must see **two lines** starting with `UN` (Up Normal).
Datacenter: dc1
===============
Status=Up/Down
|/ State=Normal/Leaving/Joining/Moving
--  Address      Load       Tokens       Owns    Host ID                               Rack
UN  10.104.0.2   140.2 KB   256          ?       <uuid-1>                              rack1
UN  10.104.0.3   128.5 KB   256          ?       <uuid-2>                              rack1

* If you see `DN` (Down Normal) for the second node: Check the Firewall ports (7000).
* If you only see one node: Check `CASSANDRA_SEEDS` config on Droplet B.

---

### Phase 5: Run Your Stress Test

Now you can configure your 4 laptops to distribute the load.

* **Laptop 1 & 2:** Point to Droplet A
    ```bash
    DB_HOST=159.223.51.176 TOTAL_MESSAGES=250000 npx ts-node stress-test-cassandra.ts
    
* **Laptop 3 & 4:** Point to Droplet B
    ```bash
    DB_HOST=152.42.243.76 TOTAL_MESSAGES=250000 npx ts-node stress-test-cassandra.ts