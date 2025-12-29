# Quick Start Guide

## For New Users Cloning This Project

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Your Paths

**Option A: Using .env.local (Recommended)**

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and replace `yourusername` with your WSL username:
   ```bash
   # Example: if your WSL user is "alice"
   NEXT_PUBLIC_WSL_HOME=/home/alice
   NEXT_PUBLIC_NODE_SOCKET=/home/alice/node.socket
   NEXT_PUBLIC_PROTOCOL_PARAMETERS=/home/alice/protocol-parameters.json
   NEXT_PUBLIC_CARDANO_CONFIG=/home/alice/config.json
   NEXT_PUBLIC_CARDANO_TOPOLOGY=/home/alice/topology.json
   NEXT_PUBLIC_CARDANO_DB_PATH=/home/alice/db
   ```

3. Save and restart the dev server

**Option B: Using Settings UI**

1. Start the app: `npm run dev`
2. Open http://localhost:3000
3. Click the Settings ⚙️ icon
4. Update all paths to match your system
5. Settings are saved automatically

### Step 3: Start the App
```bash
npm run dev
```

### Step 4: Verify Your Setup

1. Click **Settings** and confirm all paths are correct
2. Generate keys for Alice and Bob
3. Fund their addresses from a testnet faucet
4. Start the nodes and begin using Hydra!

## Common Paths to Update

Replace these paths based on your system:

| Config | Default | Your Path |
|--------|---------|-----------|
| WSL Home | `/home/yourusername` | `/home/YOUR_USERNAME` |
| Node Socket | `~/node.socket` | Path to your node socket |
| Protocol Params | `~/protocol-parameters.json` | Your protocol params file |
| Credentials | `~/credentials` | Where you want keys stored |

## Need Help?

See the full [README.md](./README.md) for detailed instructions.
