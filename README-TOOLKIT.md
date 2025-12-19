# Hydra Toolkit

A modern web-based GUI for managing Hydra Head protocol nodes without command-line operations.

## Features

- 🚀 **Node Management**: Start, stop, and monitor Cardano and Hydra nodes (Alice & Bob)
- 🔗 **WebSocket Integration**: Real-time communication with Hydra nodes via WebSocket API
- 💾 **Data Management**: Clear persistence data with one click
- 🎮 **Head Control**: Initialize, commit, close, and fanout Hydra heads through a user-friendly interface
- 📊 **Live Monitoring**: View real-time messages and status updates from Hydra nodes
- ⚙️ **Configuration**: Easily configure node parameters through the UI

## Prerequisites

Before using this toolkit, ensure you have:

1. **hydra-node** installed and accessible from your PATH
2. **cardano-node** installed and accessible from your PATH
3. Required credentials in a `credentials/` directory:
   - `alice-node.sk` / `alice-node.vk`
   - `alice-hydra.sk` / `alice-hydra.vk`
   - `bob-node.sk` / `bob-node.vk`
   - `bob-hydra.sk` / `bob-hydra.vk`
4. `protocol-parameters.json` file in your working directory
5. Cardano node configuration files (`config.json`, `topology.json`)

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd hydra-toolkit

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Starting Nodes

1. **Start Cardano Node First**: Click the "Start" button on the Cardano Node card
2. **Start Hydra Nodes**: Once Cardano node is running, start Alice and Bob nodes
3. **Monitor Status**: Watch the status indicators and connection information

### Managing Hydra Heads

Each node (Alice and Bob) has its own Head Control panel where you can:

- **Init**: Initialize a new Hydra head
- **Commit**: Commit UTxOs to the head
- **Close**: Close the head
- **Fanout**: Distribute final UTxOs
- **Abort**: Abort the head initialization
- **Get UTxO**: Query current UTxO set

### Data Management

Use the "Clear All Persistence Data" button to remove all Hydra persistence directories and start fresh. This will:

- Remove `~/persistence-alice` and `~/persistence-bob`
- Clean up temporary persistence files
- Recreate empty persistence directories

### Configuration

Click the "Settings" button to configure:

- Node socket path
- Testnet magic number
- Protocol parameters file location
- Working directory

## API Structure

The toolkit uses Next.js API routes (`/api/hydra`) to manage node processes:

- `POST /api/hydra` - Start/stop nodes, clear data
- `GET /api/hydra?nodeId=<node>` - Get node status

## WebSocket Communication

Each Hydra node exposes a WebSocket API on:

- Alice: `ws://127.0.0.1:4001`
- Bob: `ws://127.0.0.1:4002`

The toolkit automatically connects to these endpoints and displays real-time messages.

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Styling
- **lucide-react** - Icons
- **WebSocket API** - Real-time communication

## Commands Reference

The toolkit executes these commands under the hood:

### Clear Data

```bash
rm -rf ~/persistence-alice ~/persistence-bob
mkdir -p ~/persistence-alice ~/persistence-bob
```

### Run Alice Node

```bash
hydra-node \
  --node-id "alice-node" \
  --persistence-dir ~/persistence-alice \
  --cardano-signing-key credentials/alice-node.sk \
  --hydra-signing-key credentials/alice-hydra.sk \
  --api-port 4001 \
  --listen 127.0.0.1:5001 \
  --peer 127.0.0.1:5002 \
  ...
```

### Run Bob Node

```bash
hydra-node \
  --node-id "bob-node" \
  --persistence-dir ~/persistence-bob \
  --cardano-signing-key credentials/bob-node.sk \
  --hydra-signing-key credentials/bob-hydra.sk \
  --api-port 4002 \
  --listen 127.0.0.1:5002 \
  --peer 127.0.0.1:5001 \
  ...
```

### Run Cardano Node

```bash
cardano-node run \
  --config config.json \
  --topology topology.json \
  --socket-path /path/to/node.socket \
  --database-path db
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Troubleshooting

### Nodes won't start

- Verify hydra-node and cardano-node are in your PATH
- Check that all credential files exist
- Ensure protocol-parameters.json is present
- Verify no other processes are using the required ports

### WebSocket connection fails

- Make sure the node is running before trying to connect
- Check that the API ports (4001, 4002) are not blocked by firewall
- Verify the node started successfully (check for errors in the UI)

### Data clearing fails

- Some paths may require sudo permissions
- Adjust the paths in the Data Management settings if your setup differs

## Resources

- [Hydra Documentation](https://hydra.family/head-protocol/docs)
- [Hydra GitHub](https://github.com/cardano-scaling/hydra)
- [Cardano Documentation](https://docs.cardano.org/)

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
