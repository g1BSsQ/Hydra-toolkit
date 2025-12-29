# Hydra Toolkit

A user-friendly web interface for managing Cardano Hydra Head protocol nodes without command-line complexity.

## Features

- 🔑 **Key Management**: Generate and manage Hydra node keys (Alice & Bob)
- 🚀 **Node Control**: Start and manage Hydra nodes with live logs
- 💰 **Commit Funds**: Select and commit UTxOs to Hydra Head
- 🔄 **Transactions**: Send transactions within the Head
- 📊 **Head Control**: Init, Open, Close, and Fanout operations
- ⚙️ **Configuration**: Easy-to-use settings panel for all paths

## Prerequisites

- **Windows with WSL2** (Ubuntu recommended)
- **Node.js** 18+ and npm
- **Cardano Node** running and synced (preprod testnet)
- **Hydra Node** binaries installed in WSL
- **cardano-cli** installed in WSL
- **websocat** installed in WSL (`cargo install websocat`)

## Quick Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd hydra-toolkit
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and replace `/home/yourusername` with your actual WSL username:

```bash
# Example: if your WSL username is "john"
NEXT_PUBLIC_WSL_HOME=/home/john
NEXT_PUBLIC_NODE_SOCKET=/home/john/node.socket
# ... etc
```

### 3. Setup Cardano Node Files

Make sure you have these files in your WSL home directory:
- `node.socket` - Your Cardano node socket
- `protocol-parameters.json` - Query with: `cardano-cli latest query protocol-parameters --testnet-magic 1 --out-file ~/protocol-parameters.json`
- `config.json` - Cardano node config
- `topology.json` - Cardano node topology

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First Time Setup

### 1. Configure Settings

Click the **Settings** button (gear icon) in the header and verify/update all paths:

- **Cardano Config File**: Path to your `config.json`
- **Topology File**: Path to your `topology.json`
- **Database Path**: Path to your Cardano node database
- **Node Socket Path**: Path to your `node.socket`
- **Testnet Magic**: `1` for preprod, `2` for preview
- **Protocol Parameters**: Path to `protocol-parameters.json`
- **Credentials Directory**: Where keys will be stored (default: `~/credentials`)

Settings are automatically saved to browser localStorage.

### 2. Generate Keys

1. Go to **Section 1: Key Generation**
2. Click **Generate Keys for Alice**
3. Click **Generate Keys for Bob**
4. Keys will be saved in `~/credentials/` in WSL

### 3. Fund Addresses

1. Copy Alice and Bob's addresses from the Key Generation section
2. Send testnet ADA to both addresses from a faucet:
   - Preprod faucet: https://faucet.preprod.world.dev.cardano.org/

### 4. Start Nodes

1. Go to **Section 2: Node Management**
2. Start Alice's node (port 4001)
3. Start Bob's node (port 4002)
4. Wait for nodes to initialize and connect

### 5. Initialize Head

1. Go to **Section 3: Head Control**
2. Click **Init** for Alice
3. Head state will change to "Initializing"

### 6. Commit Funds

1. Go to **Section 4: Commit UTxOs**
2. For each participant:
   - Click **Refresh UTxOs**
   - Select UTxOs to commit
   - Click **Commit Selected UTxOs**

### 7. Send Transactions

1. Once Head is **Open**, go to **Section 5: Send Transactions**
2. Enter recipient address and amount
3. Click **Send Transaction**
4. Click **Refresh** to update balances

### 8. Close and Fanout

1. Go back to **Section 3: Head Control**
2. Click **Close** to close the Head
3. Wait for state to become "FanoutPossible"
4. Click **Fanout** to return funds to layer 1

## Configuration for Different Machines

When cloning this project to a new machine:

### Option 1: Use .env.local (Recommended)

1. Copy `.env.example` to `.env.local`
2. Update all paths to match your system
3. Restart the dev server

### Option 2: Use Settings UI

1. Start the application
2. Click **Settings** (gear icon)
3. Update all paths to match your system
4. Settings persist in browser localStorage

### Option 3: Both

Use `.env.local` for defaults, then adjust in UI if needed.

## Troubleshooting

### WSL Path Errors

If you see errors about translating paths, ensure your WSL username is correct in all configs.

### Node Won't Start

- Check that `hydra-node` is in your PATH in WSL
- Verify all file paths in Settings exist
- Check node logs in the UI for specific errors

### Can't Commit UTxOs

- Ensure your Cardano node is fully synced
- Verify addresses have funds (check with `cardano-cli query utxo`)
- Make sure `node.socket` path is correct

### Transactions Fail

- Ensure Head is in "Open" state
- Verify you have sufficient balance in the Head
- Check recipient address is valid

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm build

# Start production server
npm start
```

## Technology Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Cardano CLI** - Blockchain operations
- **Hydra Node** - Layer 2 protocol

## Learn More

- [Hydra Documentation](https://hydra.family/head-protocol/)
- [Cardano Documentation](https://docs.cardano.org/)
- [Next.js Documentation](https://nextjs.org/docs)
