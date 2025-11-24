# Remote Testing Guide - Digital Ocean Droplet

This guide explains how to run stress tests from your laptop against a Cassandra database on Digital Ocean.

## Prerequisites

### On Digital Ocean Droplet

1. **Expose Cassandra Port** (Only for testing - use VPN in production!)
   ```bash
   # SSH into your droplet
   ssh root@your_droplet_ip
   
   # Allow Cassandra port in firewall
   ufw allow 9042/tcp
   
   # Check UFW status
   ufw status
   ```

2. **Configure Cassandra for Remote Access**
   ```bash
   # Edit Cassandra configuration
   docker exec -it cassandra-1 bash
   
   # Inside container, edit cassandra.yaml
   apt update && apt install -y nano
   nano /etc/cassandra/cassandra.yaml
   
   # Change these lines:
   # rpc_address: 0.0.0.0       (instead of localhost)
   # broadcast_rpc_address: YOUR_DROPLET_IP
   
   # Exit and restart Cassandra
   exit
   docker-compose restart
   ```

   **Alternative: Using docker-compose override**
   ```bash
   # On your droplet, create docker-compose.override.yml
   cat > docker-compose.override.yml << 'EOF'
   services:
     cassandra-1:
       environment:
         - CASSANDRA_RPC_ADDRESS=0.0.0.0
       ports:
         - "0.0.0.0:9042:9042"
   EOF
   
   # Restart services
   docker-compose down
   docker-compose up -d
   ```

3. **Verify Remote Access**
   ```bash
   # From your laptop, test connection (install cqlsh first)
   cqlsh YOUR_DROPLET_IP 9042
   ```

### On Your Laptop (Windows)

1. **Install dependencies** (if not already installed)
   ```powershell
   npm install
   ```

2. **Verify scripts are ready**
   ```powershell
   cd scripts
   ls *.ts
   ```

## Running the Tests

### Step 1: Seed Test Data

Generate test server and channel configurations:

```powershell
# Method 1: Using command line arguments
npx ts-node seed-stress-data.ts YOUR_DROPLET_IP 1000

# Method 2: Using environment variables
$env:CASSANDRA_HOST="YOUR_DROPLET_IP"; npx ts-node seed-stress-data.ts

# Method 3: Generate more servers
npx ts-node seed-stress-data.ts YOUR_DROPLET_IP 5000
npx ts-node seed-stress-data.ts 159.223.51.176 1000
```

**Example:**
```powershell
npx ts-node seed-stress-data.ts 143.198.123.45 2000
```

This creates `stress-test-config.json` with test targets.

### Step 2: Run Stress Test

Execute the stress test against remote Cassandra:

```powershell
# Default: 1M messages, 2000 concurrency
npx ts-node stress-test-cassandra.ts YOUR_DROPLET_IP
npx ts-node stress-test-cassandra.ts 159.223.51.176 250000
# Custom: 500K messages, 1000 concurrency
npx ts-node stress-test-cassandra.ts YOUR_DROPLET_IP 500000 1000
# 250,000 messages


# Using environment variables
$env:CASSANDRA_HOST="YOUR_DROPLET_IP"; $env:TOTAL_MESSAGES="100000"; $env:CONCURRENCY="500"; npx ts-node stress-test-cassandra.ts
```

**Example:**
```powershell
npx ts-node stress-test-cassandra.ts 152.42.243.76 250000 500
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CASSANDRA_HOST` | `localhost` | IP address of Cassandra server |
| `CASSANDRA_DC` | `dc1` | Data center name |
| `CASSANDRA_KEYSPACE` | `discord_app` | Keyspace to use |
| `TOTAL_MESSAGES` | `1000000` | Number of messages to insert |
| `CONCURRENCY` | `2000` | Parallel requests |
| `SERVER_COUNT` | `1000` | Number of test servers (seed only) |

### Command Line Arguments

**seed-stress-data.ts:**
```
npx ts-node seed-stress-data.ts [cassandra_host] [server_count]
```

**stress-test-cassandra.ts:**
```
npx ts-node stress-test-cassandra.ts [cassandra_host] [total_messages] [concurrency]
```

## Expected Output

### Seeding
```
🔗 Connecting to Cassandra at: 143.198.123.45
📍 Data Center: dc1
🗄️  Keyspace: discord_app
✅ Connected to Cassandra successfully!
🌱 Seeding 1000 servers and channels...
Seeding: 15.234ms
✅ Config saved to stress-test-config.json
📦 Generated 1000 test targets
👋 Disconnected from Cassandra
```

### Stress Test
```
🎯 Stress Test Configuration:
   Cassandra Host: 143.198.123.45
   Data Center: dc1
   Keyspace: discord_app
   Total Messages: 1,000,000
   Concurrency: 2000

🔌 Connecting to Cassandra...
✅ Connected successfully!

🚀 Starting Cassandra Stress Test: 1,000,000 messages
   Target: Distributed across 1000 servers
   Concurrency: 2000 parallel requests
   ... 50000 written (8234 msg/s)
   ... 100000 written (8156 msg/s)
   ...

📊 Cassandra Results:
   Total Time: 120.45s
   Throughput: 8302 messages/sec
   Average Latency: 0.12ms per message

👋 Disconnected from Cassandra
```

## Network Considerations

### Latency Impact
Testing from laptop to Digital Ocean will include:
- Network latency (varies by location)
- Internet bandwidth limitations
- Typically 20-100ms additional latency vs local testing

### Recommended Settings
For remote testing:
- **Lower concurrency**: Start with 500-1000
- **Smaller batch sizes**: 10K-100K messages initially
- **Monitor bandwidth**: Check your internet speed

### Compare Local vs Remote
```powershell
# Test locally first (if you have local Cassandra)
npx ts-node stress-test-cassandra.ts localhost 100000 1000

# Then test remote
npx ts-node stress-test-cassandra.ts YOUR_DROPLET_IP 100000 1000
```

## Security Best Practices

⚠️ **Important**: Exposing Cassandra port 9042 publicly is risky!

### Better Alternatives:

1. **SSH Tunnel** (Recommended)
   ```powershell
   # Create SSH tunnel
   ssh -L 9042:localhost:9042 root@YOUR_DROPLET_IP
   
   # In another terminal, test using localhost
   npx ts-node stress-test-cassandra.ts localhost
   ```

2. **VPN/Tailscale**
   - Set up Tailscale on both laptop and droplet
   - Use private IP for testing

3. **Firewall Rules**
   ```bash
   # Only allow your IP
   ufw allow from YOUR_LAPTOP_IP to any port 9042
   ufw deny 9042
   ```

## Troubleshooting

### Connection Timeout
```
Error: All host(s) tried for query failed
```
**Solutions:**
- Check firewall: `ufw status`
- Verify Cassandra is listening: `netstat -tlnp | grep 9042`
- Test connectivity: `telnet YOUR_DROPLET_IP 9042`

### Authentication Error
```
Error: Authentication error
```
**Solution:** Cassandra default setup has no auth. If enabled, update scripts with credentials.

### Out of Memory
**On Droplet:**
```bash
# Check memory
free -h

# Check Cassandra memory
docker stats cassandra-1
```

**Solution:** Reduce concurrency or increase droplet RAM

### Slow Performance
- Check droplet CPU/RAM usage
- Reduce CONCURRENCY_LIMIT
- Check network bandwidth: `speedtest-cli`

## Monitoring During Test

### On Droplet
```bash
# Terminal 1: Monitor Cassandra
docker stats cassandra-1

# Terminal 2: Watch logs
docker logs -f cassandra-1

# Terminal 3: System resources
htop
```

### On Laptop
```powershell
# Monitor network usage
netstat -e

# Check script progress (built into script output)
# Shows updates every 50,000 messages
```

## Example Full Workflow

```powershell
# 1. Set your droplet IP
$DROPLET_IP = "143.198.123.45"

# 2. Generate test data
cd scripts
npx ts-node seed-stress-data.ts $DROPLET_IP 1000

# 3. Run small test first (10K messages)
npx ts-node stress-test-cassandra.ts $DROPLET_IP 10000 500

# 4. Run full test (1M messages)
npx ts-node stress-test-cassandra.ts $DROPLET_IP 1000000 2000

# 5. Check results on droplet
ssh root@$DROPLET_IP "docker exec -it cassandra-1 cqlsh -e 'SELECT COUNT(*) FROM discord_app.messages_by_id;'"
```

## Cleanup After Testing

```bash
# On droplet, truncate test data
docker exec -it cassandra-1 cqlsh -e "TRUNCATE discord_app.messages_by_id;"
docker exec -it cassandra-1 cqlsh -e "TRUNCATE discord_app.messages_by_channel;"

# Close Cassandra port
ufw delete allow 9042/tcp
```

## Advanced: Using SSH Tunnel (Safest Method)

Create a PowerShell script for easy tunneling:

```powershell
# save as connect-cassandra.ps1
$DROPLET_IP = "YOUR_DROPLET_IP"

Write-Host "🔐 Creating SSH tunnel to Cassandra..."
Write-Host "📍 You can now use localhost:9042 for testing"
Write-Host "⚠️  Keep this window open during testing"

ssh -L 9042:localhost:9042 root@$DROPLET_IP -N
```

Then use:
```powershell
# Terminal 1: Start tunnel
.\connect-cassandra.ps1

# Terminal 2: Run tests using localhost
npx ts-node stress-test-cassandra.ts localhost 1000000 2000
```

---

**Need Help?**
- Check firewall rules on both laptop and droplet
- Verify Cassandra is running: `docker ps`
- Test basic connectivity: `telnet YOUR_DROPLET_IP 9042`
