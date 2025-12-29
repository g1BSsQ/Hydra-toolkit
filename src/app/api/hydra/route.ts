import { NextRequest, NextResponse } from 'next/server';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Store running processes
const runningProcesses = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, nodeId, config, participant, from, to, amount, credentialsPath, utxos } = body;

    switch (action) {
      case 'start-alice':
        return handleStartNode('alice', config);
      
      case 'start-bob':
        return handleStartNode('bob', config);
      
      case 'start-cardano':
        return handleStartCardanoNode(config);
      
      case 'stop':
        return handleStopNode(nodeId);
      
      case 'clear-data':
        return handleClearData(config);
      
      case 'clear-lock':
        return handleClearLock();
      
      case 'status':
        return handleGetStatus(nodeId);
      
      case 'generate-keys':
        return handleGenerateKeys(participant, credentialsPath);
      
      case 'check-keys':
        return handleCheckKeys(credentialsPath);
      
      case 'setup-protocol-params':
        return handleSetupProtocolParams();
      
      case 'init-head':
        return handleInitHead();
      
      case 'commit-funds':
        return handleCommitFunds(participant, config, utxos);
      
      case 'close-head':
        return handleCloseHead();
      
      case 'fanout':
        return handleFanout();
      
      case 'send-transaction':
        return handleSendTransaction(participant, config, body.recipientAddress, body.lovelace);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleStartNode(node: 'alice' | 'bob', config: any) {
  const nodeId = `${node}-node`;
  
  if (runningProcesses.has(nodeId)) {
    return NextResponse.json({ 
      error: `${node} node is already running`,
      nodeId 
    }, { status: 400 });
  }

  const otherNode = node === 'alice' ? 'bob' : 'alice';
  const port = node === 'alice' ? 4001 : 4002;
  const listenPort = node === 'alice' ? 5001 : 5002;
  const peerPort = node === 'alice' ? 5002 : 5001;

  // Use pre-fetched hydra-scripts-tx-id or fetch it
  let hydraScriptsTxId = config.hydraScriptsTxId || '';
  
  if (!hydraScriptsTxId) {
    try {
      // Try to fetch hydra-scripts-tx-id for version 1.2.0
      const { stdout } = await execAsync('wsl curl -s https://raw.githubusercontent.com/cardano-scaling/hydra/master/hydra-node/networks.json | jq -r \'.preprod."1.2.0"\'');
      hydraScriptsTxId = stdout.trim();
      console.log(`Fetched hydra-scripts-tx-id: ${hydraScriptsTxId}`);
    } catch (error) {
      console.error('Failed to fetch hydra-scripts-tx-id, using default for 1.2.0');
      // Fallback to known values for preprod 1.2.0 (3 transaction IDs)
      hydraScriptsTxId = 'ba97aaa648271c75604e66e3a4e00da49bdcaca9ba74d9031ab4c08f736e1c12,ff046eba10b9b0f90683bf5becbd6afa496059fc1cf610e798cfe778d85b70ba,4bb8c01290599cc9de195b586ee1eb73422b00198126f51f52b00a8e35da9ce3';
    }
  }

  // Build command to run in WSL - use absolute path with login shell
  const protocolParams = config.protocolParameters || '/home/g1bssq/protocol-parameters.json';
  const socketPath = config.nodeSocket || '/home/g1bssq/node.socket';
  const testnetMagic = config.testnetMagic || '1';
  const credentialsPath = config.credentialsPath || '/home/g1bssq/credentials';
  
  // Build direct command with setsid to fully detach from parent process
  const hydraCmd = `/home/g1bssq/bin/hydra-node --node-id ${nodeId} --persistence-dir /home/g1bssq/persistence-${node} --cardano-signing-key ${credentialsPath}/${node}-node.sk --hydra-signing-key ${credentialsPath}/${node}-hydra.sk --hydra-scripts-tx-id ${hydraScriptsTxId} --ledger-protocol-parameters ${protocolParams} --testnet-magic ${testnetMagic} --node-socket ${socketPath} --api-port ${port} --listen 0.0.0.0:${listenPort} --api-host 0.0.0.0 --peer 127.0.0.1:${peerPort} --hydra-verification-key ${credentialsPath}/${otherNode}-hydra.vk --cardano-verification-key ${credentialsPath}/${otherNode}-node.vk`;
  
  // Use setsid to run in new session, fully detached from terminal
  const wslCommand = `cd /home/g1bssq && mkdir -p persistence-${node} && setsid ${hydraCmd} > /tmp/hydra-${node}.log 2>&1 &`;

  try {
    // Run in WSL - execute and return immediately
    await execAsync(`wsl bash -l -c "${wslCommand}"`);
    
    // Wait a moment for the process to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if process actually started
    const { stdout: pgrepOutput } = await execAsync(`wsl bash -l -c "pgrep -f 'hydra-node.*${port}' || echo ''"`);
    const pidLines = pgrepOutput.split('\n').filter((line: string) => line.trim().match(/^\d+$/));
    const pid = pidLines[0]?.trim();
    
    if (!pid) {
      // Try to read log for error
      try {
        const { stdout: logOutput } = await execAsync(`wsl bash -l -c "tail -20 /tmp/hydra-${node}.log 2>/dev/null || echo 'No log available'"`);
        console.error(`[${nodeId}] Failed to start. Log: ${logOutput}`);
        return NextResponse.json({ 
          error: `Failed to start ${node} node. Check /tmp/hydra-${node}.log for details.`,
          log: logOutput.substring(0, 500)
        }, { status: 500 });
      } catch (e) {
        return NextResponse.json({ 
          error: `Failed to start ${node} node`
        }, { status: 500 });
      }
    }
    
    console.log(`[${nodeId}] Started with PID ${pid}`);
    
    // Create a placeholder process object for compatibility
    const process = {
      pid: parseInt(pid),
      kill: () => {}
    } as any;

    runningProcesses.set(nodeId, {
      process,
      startTime: new Date(),
      output: '',
      errorOutput: '',
      port,
    });

    return NextResponse.json({
      success: true,
      message: `${node} node started successfully`,
      nodeId,
      port,
      pid: process.pid,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleStartCardanoNode(config: any) {
  const nodeId = 'cardano-node';
  
  if (runningProcesses.has(nodeId)) {
    return NextResponse.json({ 
      error: 'Cardano node is already running',
      nodeId 
    }, { status: 400 });
  }

  // Build command to run in WSL - use absolute path and login shell with config values
  // Expand ~ to absolute path to ensure db is reused
  const cardanoConfig = config.cardanoConfig || '/home/g1bssq/config.json';
  const cardanoTopology = config.cardanoTopology || '/home/g1bssq/topology.json';
  const cardanoDbPath = config.cardanoDbPath || '/home/g1bssq/db';
  const socketPath = config.nodeSocket || '/home/g1bssq/node.socket';
  
  try {
    // Check if lock file exists
    const { stdout: lockCheck } = await execAsync('wsl bash -l -c "test -f /home/g1bssq/db/lock && echo exists || echo none"');
    
    if (lockCheck.trim() === 'exists') {
      console.log('[cardano-node] Lock file detected, clearing existing processes...');
      // Only kill if there's a lock - try graceful shutdown first
      await execAsync('wsl bash -l -c "pkill -TERM cardano-node 2>/dev/null || true; sleep 2; pkill -9 cardano-node 2>/dev/null || true; rm -f /home/g1bssq/db/lock"');
      console.log('[cardano-node] Cleared lock file');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('[cardano-node] No lock file, starting cleanly...');
    }
  } catch (err) {
    console.warn('[cardano-node] Warning: Failed to check/clear lock:', err);
  }
  
  // Build command directly - simple version
  const cardanoCmd = `cardano-node run --config config.json --topology topology.json --socket-path node.socket --database-path db`;
  
  try {
    // Run directly with cd to home dir and nohup for full detachment
    const startCommand = `cd /home/g1bssq && nohup ${cardanoCmd} > /tmp/cardano-node.log 2>&1 &`;
    await execAsync(`wsl bash -l -c "${startCommand}"`);
    
    // Wait longer for the process to start and check multiple times
    let pid: string | undefined;
    let attempts = 0;
    const maxAttempts = 10; // Check for up to 10 seconds
    
    while (!pid && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const { stdout: psOutput } = await execAsync(`wsl bash -l -c "ps aux | grep 'cardano-node run' | grep -v grep | awk '{print \\$2}' | head -1"`);
        pid = psOutput.trim();
        if (pid && pid.match(/^\d+$/)) break;
      } catch (e) {
        console.log(`[${nodeId}] Attempt ${attempts + 1}: Process not found yet`);
      }
      attempts++;
    }
    
    if (!pid) {
      // Try to read log for error
      try {
        const { stdout: logOutput } = await execAsync(`wsl bash -l -c "tail -20 /tmp/cardano-node.log 2>/dev/null || echo 'No log available'"`);
        console.error(`[${nodeId}] Failed to start. Log: ${logOutput}`);
        return NextResponse.json({ 
          error: `Failed to start cardano-node. Check /tmp/cardano-node.log for details.`,
          log: logOutput.substring(0, 500)
        }, { status: 500 });
      } catch (e) {
        return NextResponse.json({ 
          error: `Failed to start cardano-node`
        }, { status: 500 });
      }
    }
    
    console.log(`[${nodeId}] Started with PID ${pid}`);
    
    // Create a placeholder process object for compatibility
    const process = {
      pid: parseInt(pid),
      kill: () => {}
    } as any;

    runningProcesses.set(nodeId, {
      process,
      startTime: new Date(),
      output: '',
      errorOutput: '',
    });

    return NextResponse.json({
      success: true,
      message: 'Cardano node started successfully',
      nodeId,
      pid: process.pid,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleStopNode(nodeId: string) {
  const processInfo = runningProcesses.get(nodeId);
  
  // Try to kill process in Map first
  if (processInfo) {
    try {
      processInfo.process.kill('SIGTERM');
      runningProcesses.delete(nodeId);
      console.log(`[${nodeId}] Killed process from Map`);
    } catch (error: any) {
      console.error(`[${nodeId}] Error killing process from Map: ${error.message}`);
    }
  }

  // Always try to kill actual WSL process by finding PID first
  try {
    let grepPattern = '';
    
    if (nodeId === 'cardano-node') {
      grepPattern = 'cardano-node';
    } else if (nodeId === 'alice-node') {
      grepPattern = 'hydra-node.*4001';
    } else if (nodeId === 'bob-node') {
      grepPattern = 'hydra-node.*4002';
    } else {
      return NextResponse.json({ 
        error: `Unknown node: ${nodeId}` 
      }, { status: 400 });
    }
    
    // Step 1: Get PID(s) of the process
    const getPidCmd = `wsl bash -l -c "pgrep -f '${grepPattern}' 2>/dev/null"`;
    console.log(`[${nodeId}] Getting PIDs: ${getPidCmd}`);
    
    let pids: string[] = [];
    try {
      const { stdout } = await execAsync(getPidCmd);
      pids = stdout.trim().split('\n').filter(pid => pid && pid.match(/^\d+$/));
      console.log(`[${nodeId}] Found PIDs:`, pids);
    } catch (e) {
      console.log(`[${nodeId}] No PIDs found`);
    }
    
    // Step 2: Kill each PID with SIGKILL
    if (pids.length > 0) {
      const killCmd = `wsl bash -l -c "kill -9 ${pids.join(' ')} 2>/dev/null; echo done"`;
      console.log(`[${nodeId}] Killing: ${killCmd}`);
      await execAsync(killCmd);
      console.log(`[${nodeId}] Killed ${pids.length} process(es)`);
    }
    
    // Step 3: Verify they're gone
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const { stdout: checkPids } = await execAsync(getPidCmd);
      const remainingPids = checkPids.trim().split('\n').filter(pid => pid && pid.match(/^\d+$/));
      if (remainingPids.length > 0) {
        console.log(`[${nodeId}] WARNING: ${remainingPids.length} process(es) still running`);
      } else {
        console.log(`[${nodeId}] All processes stopped successfully`);
      }
    } catch (e) {
      console.log(`[${nodeId}] Verified: no processes found`);
    }
    
    return NextResponse.json({
      success: true,
      message: `${nodeId} stopped successfully`,
    });
  } catch (error: any) {
    // Even if command "fails", process might be stopped, so return success
    console.warn(`[${nodeId}] Stop command had warnings, but process should be stopped: ${error.message}`);
    return NextResponse.json({
      success: true,
      message: `${nodeId} stopped (with warnings)`,
    });
  }
}

async function handleClearData(config: any) {
  try {
    const paths = config?.paths || [
      '~/persistence-alice',
      '~/persistence-bob',
      '~/hydra/demo/devnet/persistence/',
      '~/hydra-demo/demo/devnet/persistence/',
      '/tmp/persistence-*',
      '/tmp/hydra-*',
    ];

    const commands: string[] = [];
    
    for (const p of paths) {
      commands.push(`rm -rf ${p}`);
    }

    // Create directories after cleanup
    commands.push('mkdir -p ~/persistence-alice ~/persistence-bob');

    const command = commands.join(' && ');
    
    // Run in WSL with login shell
    await execAsync(`wsl bash -l -c "${command}"`);

    return NextResponse.json({
      success: true,
      message: 'Data cleared successfully',
      clearedPaths: paths,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleClearLock() {
  try {
    // Kill all cardano-node processes and remove lock file
    const wslCommand = 'pkill -9 cardano-node; rm -f /home/g1bssq/db/lock; echo "DB lock cleared"';
    
    const process = spawn('wsl', ['bash', '-l', '-c', wslCommand], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    process.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    process.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    await new Promise<void>((resolve, reject) => {
      process.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(errorOutput || `Process exited with code ${code}`));
        }
      });
      process.on('error', reject);
    });

    // Clear the running process from memory
    runningProcesses.delete('cardano-node');

    return NextResponse.json({
      success: true,
      message: 'Database lock cleared successfully. Cardano node stopped.',
      output: output.trim(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleGetStatus(nodeId?: string) {
  if (nodeId) {
    // Check if process is actually running in WSL (not just in memory)
    let grepPattern = '';
    let processName = '';
    
    if (nodeId === 'cardano-node') {
      grepPattern = 'cardano-node run';
      processName = 'cardano-node';
    } else if (nodeId === 'alice-node') {
      grepPattern = 'hydra-node.*4001';
      processName = 'hydra-node';
    } else if (nodeId === 'bob-node') {
      grepPattern = 'hydra-node.*4002';
      processName = 'hydra-node';
    }

    if (grepPattern) {
      try {
        // Use ps + grep instead of pgrep to avoid matching pgrep itself
        // Also verify the process is actually the binary, not a script
        const command = `wsl bash -l -c "ps aux | grep '${grepPattern}' | grep -v grep | awk '{print \\$2}' | head -1"`;
        console.log(`[${nodeId}] Checking status with command: ${command}`);
        
        const { stdout } = await execAsync(command);
        const pid = stdout.trim();
        
        console.log(`[${nodeId}] stdout:`, stdout);
        console.log(`[${nodeId}] PID:`, pid);
        
        if (pid && pid.match(/^\d+$/)) {
          // Verify process still exists
          try {
            await execAsync(`wsl bash -l -c "ps -p ${pid} > /dev/null 2>&1"`);
            
            // Process is running
            const processInfo = runningProcesses.get(nodeId);
            
            console.log(`[${nodeId}] Process verified, returning running: true`);
            return NextResponse.json({
              nodeId,
              running: true,
              startTime: processInfo?.startTime || new Date().toISOString(),
              pid: parseInt(pid),
              port: processInfo?.port,
              output: processInfo?.output || '',
              errorOutput: processInfo?.errorOutput || '',
            });
          } catch (verifyError) {
            console.log(`[${nodeId}] Process verification failed - PID ${pid} doesn't exist`);
          }
        }
      } catch (error: any) {
        // Process not found
        console.log(`[${nodeId}] grep returned no matches (process not running)`);
      }
    }
    
    // Process not running - clean up memory
    runningProcesses.delete(nodeId);
    console.log(`[${nodeId}] Process not found, returning running: false`);
    
    return NextResponse.json({
      nodeId,
      running: false,
    });
  }

  // Return status of all nodes
  const statuses: any = {};
  
  for (const id of ['alice-node', 'bob-node', 'cardano-node']) {
    const processInfo = runningProcesses.get(id);
    
    if (processInfo) {
      statuses[id] = {
        running: true,
        startTime: processInfo.startTime,
        pid: processInfo.process.pid,
        port: processInfo.port,
      };
    } else {
      statuses[id] = { running: false };
    }
  }

  return NextResponse.json(statuses);
}

// Generate Cardano and Hydra keys for a participant
async function handleGenerateKeys(participant: 'alice' | 'bob', credentialsPath: string = '~/credentials') {
  try {
    // Expand tilde to full path
    const expandedPath = credentialsPath.startsWith('~') 
      ? credentialsPath.replace('~', '$HOME')
      : credentialsPath;
    
    // Create credentials directory
    await execAsync(`wsl bash -l -c "mkdir -p ${expandedPath}"`);
    
    // Generate Cardano node keys
    await execAsync(`wsl bash -l -c "cd ~ && cardano-cli address key-gen --verification-key-file ${expandedPath}/${participant}-node.vk --signing-key-file ${expandedPath}/${participant}-node.sk"`);
    
    // Generate Cardano funds keys
    await execAsync(`wsl bash -l -c "cd ~ && cardano-cli address key-gen --verification-key-file ${expandedPath}/${participant}-funds.vk --signing-key-file ${expandedPath}/${participant}-funds.sk"`);
    
    // Generate Hydra keys
    await execAsync(`wsl bash -l -c "cd ~ && hydra-node gen-hydra-key --output-file ${expandedPath}/${participant}-hydra"`);
    
    // Build addresses
    const { stdout: nodeAddr } = await execAsync(`wsl bash -l -c "cd ~ && cardano-cli address build --verification-key-file ${expandedPath}/${participant}-node.vk --testnet-magic 1"`);
    const { stdout: fundsAddr } = await execAsync(`wsl bash -l -c "cd ~ && cardano-cli address build --verification-key-file ${expandedPath}/${participant}-funds.vk --testnet-magic 1"`);
    
    return NextResponse.json({
      success: true,
      participant,
      credentialsPath,
      keys: {
        nodeAddress: nodeAddr.trim(),
        fundsAddress: fundsAddr.trim(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Check if keys exist for Alice and Bob
async function handleCheckKeys(credentialsPath: string = '~/credentials') {
  try {
    const expandedPath = credentialsPath.startsWith('~') 
      ? credentialsPath.replace('~', '$HOME')
      : credentialsPath;
    
    const checkParticipant = async (participant: 'alice' | 'bob') => {
      try {
        const { stdout: nodeAddr } = await execAsync(`wsl bash -l -c "cd ~ && test -f ${expandedPath}/${participant}-node.vk && cardano-cli address build --verification-key-file ${expandedPath}/${participant}-node.vk --testnet-magic 1"`);
        const { stdout: fundsAddr } = await execAsync(`wsl bash -l -c "cd ~ && test -f ${expandedPath}/${participant}-funds.vk && cardano-cli address build --verification-key-file ${expandedPath}/${participant}-funds.vk --testnet-magic 1"`);
        
        return {
          nodeAddress: nodeAddr.trim(),
          fundsAddress: fundsAddr.trim(),
        };
      } catch {
        return null;
      }
    };

    const alice = await checkParticipant('alice');
    const bob = await checkParticipant('bob');

    return NextResponse.json({ 
      alice, 
      bob,
      credentialsPath 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Setup protocol parameters with zero fees
async function handleSetupProtocolParams() {
  try {
    const command = `cardano-cli query protocol-parameters --testnet-magic 1 --socket-path ~/node.socket | jq '.txFeeFixed = 0 | .txFeePerByte = 0 | .executionUnitPrices.priceMemory = 0 | .executionUnitPrices.priceSteps = 0' > ~/protocol-parameters.json`;
    await execAsync(`wsl bash -l -c "${command}"`);
    
    return NextResponse.json({
      success: true,
      message: 'Protocol parameters configured with zero fees',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Initialize Hydra Head
async function handleInitHead() {
  try {
    // Send Init command to Alice's WebSocket (port 4001)
    const command = `echo '{"tag":"Init"}' | websocat ws://127.0.0.1:4001`;
    await execAsync(`wsl bash -l -c "${command}"`);
    
    return NextResponse.json({
      success: true,
      message: 'Head initialization sent',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Query UTxOs for a participant
async function handleQueryUtxos(participant: 'alice' | 'bob', credentialsPath: string = '~/credentials') {
  try {
    const expandedPath = credentialsPath.startsWith('~') 
      ? credentialsPath.replace('~', '$HOME')
      : credentialsPath;
    
    // First get the address
    const { stdout: address } = await execAsync(`wsl bash -l -c "cat ${expandedPath}/${participant}-funds.addr"`);
    
    if (!address || !address.trim()) {
      return NextResponse.json({
        success: false,
        error: `Address file not found for ${participant}`,
        utxos: {},
      });
    }
    
    // Query UTxOs - output to temp file then read it
    const tempFile = `${participant}-utxo-temp.json`;
    await execAsync(`wsl bash -l -c "cardano-cli query utxo --address ${address.trim()} --testnet-magic 1 --socket-path ~/node.socket --output-json --out-file ~/${tempFile}"`);
    const { stdout } = await execAsync(`wsl bash -l -c "cat ~/${tempFile}"`);
    
    let utxos = {};
    try {
      const trimmed = stdout.trim();
      if (trimmed && trimmed !== '') {
        utxos = JSON.parse(trimmed);
      }
    } catch (parseError) {
      console.warn(`Failed to parse UTxOs for ${participant}:`, parseError);
      utxos = {};
    }
    
    return NextResponse.json({
      success: true,
      participant,
      utxos,
    });
  } catch (error: any) {
    console.error(`Error querying UTxOs for ${participant}:`, error.message);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      utxos: {} 
    });
  }
}

// Commit funds to the Hydra Head
async function handleCommitFunds(participant: 'alice' | 'bob', config: any, customUtxos?: Record<string, any>) {
  try {
    const port = participant === 'alice' ? 4001 : 4002;
    const credentialsPath = config?.credentialsPath || '~/credentials';
    const expandedPath = credentialsPath.startsWith('~') 
      ? credentialsPath.replace('~', '$HOME')
      : credentialsPath;
    
    console.log(`[${participant}] Commit - received utxos:`, JSON.stringify(customUtxos, null, 2));
    
    // Always write UTxOs to file in Windows first for proper JSON format
    let utxoJson;
    if (customUtxos && Object.keys(customUtxos).length > 0) {
      utxoJson = JSON.stringify(customUtxos, null, 2);
      console.log(`[${participant}] Using custom UTxOs`);
    } else {
      // Query all UTxOs
      console.log(`[${participant}] Querying all UTxOs`);
      const { stdout: address } = await execAsync(`wsl bash -l -c "cat ${expandedPath}/${participant}-funds.addr"`);
      const tempFile = `${participant}-query-temp.json`;
      await execAsync(`wsl bash -l -c "cardano-cli query utxo --address ${address.trim()} --testnet-magic 1 --socket-path ~/node.socket --output-json --out-file ~/${tempFile}"`);
      const { stdout: queryResult } = await execAsync(`wsl bash -l -c "cat ~/${tempFile}"`);
      utxoJson = queryResult;
    }
    
    // Write to temp file in Windows
    const tempPath = path.join(process.cwd(), `${participant}-commit-utxo-temp.json`);
    fs.writeFileSync(tempPath, utxoJson, 'utf-8');
    console.log(`[${participant}] Wrote UTxO JSON to:`, tempPath);
    
    // Convert Windows path to WSL path (D:/path -> /mnt/d/path)
    let wslPath = tempPath.replace(/\\/g, '/');
    if (wslPath.match(/^([A-Z]):/i)) {
      const drive = wslPath[0].toLowerCase();
      wslPath = `/mnt/${drive}${wslPath.substring(2)}`;
    }
    console.log(`[${participant}] WSL path:`, wslPath);
    
    // Copy to WSL home directory  
    await execAsync(`wsl bash -l -c "cat '${wslPath}' > ~/${participant}-commit-utxo.json"`);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    // Check if UTxO file is empty
    const { stdout: utxoContent } = await execAsync(`wsl bash -l -c "cat ~/${participant}-commit-utxo.json"`);
    console.log(`[${participant}] UTxO content:`, utxoContent);
    
    let utxoObj;
    try {
      utxoObj = JSON.parse(utxoContent.trim());
    } catch (parseErr) {
      return NextResponse.json({ 
        error: `Invalid UTxO JSON format: ${parseErr.message}. Content: ${utxoContent.substring(0, 200)}` 
      }, { status: 400 });
    }
    
    if (Object.keys(utxoObj).length === 0) {
      return NextResponse.json({ 
        error: `No UTxOs available to commit for ${participant}. Fund the address first.` 
      }, { status: 400 });
    }
    
    // Create commit transaction via HTTP API
    const commitCmd = `curl -s -X POST 127.0.0.1:${port}/commit --data @${participant}-commit-utxo.json > ${participant}-commit-tx.json`;
    await execAsync(`wsl bash -l -c "cd ~ && ${commitCmd}"`);
    
    // Check if commit tx is valid JSON
    const { stdout: txContent } = await execAsync(`wsl bash -l -c "cat ~/${participant}-commit-tx.json"`);
    console.log(`[${participant}] Commit tx response:`, txContent.substring(0, 500));
    
    try {
      const txObj = JSON.parse(txContent.trim());
      // Check if it's an error message
      if (txObj.error || txObj.message) {
        return NextResponse.json({ 
          error: `Hydra node returned error: ${txObj.error || txObj.message}` 
        }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ 
        error: `Invalid response from hydra-node /commit API. Make sure the head is in Initializing state. Response: ${txContent.substring(0, 200)}` 
      }, { status: 400 });
    }
    
    // Sign the transaction
    await execAsync(`wsl bash -l -c "cd ~ && cardano-cli latest transaction sign --tx-file ${participant}-commit-tx.json --signing-key-file ${expandedPath}/${participant}-funds.sk --out-file ${participant}-commit-tx-signed.json"`);
    
    // Submit the transaction
    await execAsync(`wsl bash -l -c "cd ~ && cardano-cli latest transaction submit --tx-file ${participant}-commit-tx-signed.json --testnet-magic 1 --socket-path node.socket"`);
    
    return NextResponse.json({
      success: true,
      participant,
      message: `${participant} committed funds`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Close the Hydra Head
async function handleCloseHead() {
  try {
    // Send Close command to Alice's WebSocket
    const command = `echo '{"tag":"Close"}' | websocat ws://127.0.0.1:4001`;
    await execAsync(`wsl bash -l -c "${command}"`);
    
    return NextResponse.json({
      success: true,
      message: 'Head close initiated',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Fanout the Hydra Head
async function handleFanout() {
  try {
    // Send Fanout command to Alice's WebSocket
    const command = `echo '{"tag":"Fanout"}' | websocat ws://127.0.0.1:4001`;
    await execAsync(`wsl bash -l -c "${command}"`);
    
    return NextResponse.json({
      success: true,
      message: 'Fanout initiated',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Send transaction within Hydra Head
async function handleQueryHeadUtxos(participant: 'alice' | 'bob', apiPort: number, credentialsPath: string) {
  try {
    console.log(`[${participant}] Querying head UTxOs from port ${apiPort}`);
    
    // Get all UTxOs from head - use exec with explicit error handling
    const { exec } = require('child_process');
    const allUtxosJson = await new Promise<string>((resolve, reject) => {
      exec(
        `wsl bash -l -c "curl -s 127.0.0.1:${apiPort}/snapshot/utxo 2>/dev/null"`,
        { maxBuffer: 1024 * 1024 * 10 },
        (error: any, stdout: string, stderr: string) => {
          // Ignore error if we have stdout (WSL warnings cause error but stdout is valid)
          if (stdout && stdout.trim()) {
            resolve(stdout);
          } else if (error) {
            reject(new Error(`Failed to query Hydra API: ${error.message}`));
          } else {
            reject(new Error('No response from Hydra API'));
          }
        }
      );
    });
    
    console.log(`[${participant}] Raw response from head:`, allUtxosJson.substring(0, 200));
    
    // Get participant address
    const participantAddr = await new Promise<string>((resolve, reject) => {
      exec(
        `wsl bash -l -c "cat ${credentialsPath}/${participant}-funds.addr 2>/dev/null"`,
        (error: any, stdout: string, stderr: string) => {
          if (stdout && stdout.trim()) {
            resolve(stdout);
          } else if (error) {
            reject(new Error(`Failed to read address file: ${error.message}`));
          } else {
            reject(new Error('Address file is empty'));
          }
        }
      );
    });
    
    const address = participantAddr.trim();
    console.log(`[${participant}] Looking for address:`, address);
    
    // Parse and filter UTxOs
    const allUtxos = JSON.parse(allUtxosJson);
    const filteredUtxos: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(allUtxos)) {
      if ((value as any).address === address) {
        filteredUtxos[key] = value;
      }
    }
    
    console.log(`[${participant}] Found ${Object.keys(filteredUtxos).length} UTxO(s) in head`);
    
    return NextResponse.json({
      success: true,
      utxos: filteredUtxos
    });
  } catch (error: any) {
    console.error(`[${participant}] Error querying head UTxOs:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleSendTransaction(participant: 'alice' | 'bob', config: any, recipientAddress: string, lovelace: number) {
  try {
    const apiPort = config?.apiPort || (participant === 'alice' ? 4001 : 4002);
    const credentialsPath = config?.credentialsPath || '~/credentials';
    
    console.log(`[${participant}] Building transaction: ${lovelace} lovelace to ${recipientAddress.substring(0, 20)}...`);
    
    // Get current UTxOs from the head using the same method as handleQueryHeadUtxos
    const { exec } = require('child_process');
    const allUtxosJson = await new Promise<string>((resolve, reject) => {
      exec(
        `wsl bash -l -c "curl -s 127.0.0.1:${apiPort}/snapshot/utxo 2>/dev/null"`,
        { maxBuffer: 1024 * 1024 * 10 },
        (error: any, stdout: string, stderr: string) => {
          if (stdout && stdout.trim()) {
            resolve(stdout);
          } else if (error) {
            reject(new Error(`Failed to query Hydra API: ${error.message}`));
          } else {
            reject(new Error('No response from Hydra API'));
          }
        }
      );
    });
    
    // Get participant address
    const participantAddr = await new Promise<string>((resolve, reject) => {
      exec(
        `wsl bash -l -c "cat ${credentialsPath}/${participant}-funds.addr 2>/dev/null"`,
        (error: any, stdout: string, stderr: string) => {
          if (stdout && stdout.trim()) {
            resolve(stdout);
          } else if (error) {
            reject(new Error(`Failed to read address file: ${error.message}`));
          } else {
            reject(new Error('Address file is empty'));
          }
        }
      );
    });
    
    const address = participantAddr.trim();
    
    // Parse and filter UTxOs for this participant
    const allUtxos = JSON.parse(allUtxosJson);
    const utxos: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(allUtxos)) {
      if ((value as any).address === address) {
        utxos[key] = value;
      }
    }
    
    const utxoKeys = Object.keys(utxos);
    
    if (utxoKeys.length === 0) {
      throw new Error(`No UTxO found for ${participant} in head`);
    }
    
    // Select first UTxO with enough balance
    let selectedUtxoKey = null;
    let selectedUtxo = null;
    
    for (const key of utxoKeys) {
      const utxo = utxos[key];
      if (utxo.value.lovelace >= lovelace) {
        selectedUtxoKey = key;
        selectedUtxo = utxo;
        break;
      }
    }
    
    if (!selectedUtxoKey || !selectedUtxo) {
      throw new Error(`No UTxO with sufficient balance (need ${lovelace} lovelace)`);
    }
    
    const currentLovelace = selectedUtxo.value.lovelace;
    const changeAmount = currentLovelace - lovelace;
    
    console.log(`[${participant}] Selected UTxO: ${selectedUtxoKey}`);
    console.log(`[${participant}] Balance: ${currentLovelace}, Sending: ${lovelace}, Change: ${changeAmount}`);
    
    // Get sender address for change output
    const { stdout: fromAddr } = await execAsync(`wsl bash -l -c "cat ${credentialsPath}/${participant}-funds.addr"`);
    
    // Build raw transaction
    const timestamp = Date.now();
    const txFile = `${participant}-tx-${timestamp}.json`;
    const txSignedFile = `${participant}-tx-signed-${timestamp}.json`;
    
    const buildCmd = `cardano-cli latest transaction build-raw ` +
      `--tx-in ${selectedUtxoKey} ` +
      `--tx-out ${recipientAddress}+${lovelace} ` +
      `--tx-out ${fromAddr.trim()}+${changeAmount} ` +
      `--fee 0 ` +
      `--out-file ~/${txFile}`;
    
    await execAsync(`wsl bash -l -c "${buildCmd}"`);
    console.log(`[${participant}] Transaction built: ${txFile}`);
    
    // Sign transaction
    const signCmd = `cardano-cli latest transaction sign ` +
      `--tx-body-file ~/${txFile} ` +
      `--signing-key-file ${credentialsPath}/${participant}-funds.sk ` +
      `--out-file ~/${txSignedFile}`;
    
    await execAsync(`wsl bash -l -c "${signCmd}"`);
    console.log(`[${participant}] Transaction signed: ${txSignedFile}`);
    
    // Read signed transaction and prepare NewTx command
    const { stdout: txContent } = await execAsync(`wsl bash -l -c "cat ~/${txSignedFile}"`);
    const txJson = JSON.parse(txContent);
    
    // Submit via WebSocket using NewTx command - use base64 to avoid quoting issues
    const newTxCommand = {
      tag: 'NewTx',
      transaction: txJson
    };
    
    const newTxJson = JSON.stringify(newTxCommand);
    const base64Json = Buffer.from(newTxJson).toString('base64');
    await execAsync(`wsl bash -l -c "echo ${base64Json} | base64 -d | websocat ws://127.0.0.1:${apiPort}"`);
    
    // Extract transaction ID from signed tx - use simpler parsing
    const txIdMatch = txContent.match(/"txId"\s*:\s*"([^"]+)"/);
    const txId = txIdMatch ? txIdMatch[1] : 'unknown';
    
    console.log(`[${participant}] Transaction submitted: ${txId.trim()}`);
    
    // Clean up temp files (only tx files, no newtx file)
    await execAsync(`wsl bash -l -c "rm -f ~/${txFile} ~/${txSignedFile}"`).catch(() => {});
    
    return NextResponse.json({
      success: true,
      message: `Transaction submitted successfully`,
      txId: txId.trim(),
      amount: lovelace / 1_000_000
    });
  } catch (error: any) {
    console.error(`[${participant}] Transaction error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const nodeId = searchParams.get('nodeId');
  const participant = searchParams.get('participant');
  const credentialsPath = searchParams.get('credentialsPath') || '~/credentials';
  const apiPort = parseInt(searchParams.get('apiPort') || '0');
  
  if (action === 'check-keys') {
    return handleCheckKeys(credentialsPath);
  }
  
  if (action === 'query-utxos' && participant) {
    return handleQueryUtxos(participant as 'alice' | 'bob', credentialsPath);
  }
  
  if (action === 'query-head-utxos' && participant && apiPort) {
    return handleQueryHeadUtxos(participant as 'alice' | 'bob', apiPort, credentialsPath);
  }
  
  return handleGetStatus(nodeId || undefined);
}
