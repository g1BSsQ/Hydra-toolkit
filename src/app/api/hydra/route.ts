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
    const { action, nodeId, config } = body;

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
      
      case 'status':
        return handleGetStatus(nodeId);
      
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

  const args = [
    '--node-id', nodeId,
    '--persistence-dir', config.persistenceDir || `~/persistence-${node}`,
    '--cardano-signing-key', `credentials/${node}-node.sk`,
    '--hydra-signing-key', `credentials/${node}-hydra.sk`,
    '--hydra-scripts-tx-id', config.hydraScriptsTxId || '$(curl -s https://raw.githubusercontent.com/cardano-scaling/hydra/master/hydra-node/networks.json | jq -r \'.preprod."1.1.0"\')',
    '--ledger-protocol-parameters', config.protocolParameters || 'protocol-parameters.json',
    '--testnet-magic', config.testnetMagic || '1',
    '--node-socket', config.nodeSocket || '/home/g1bssq/node.socket',
    '--api-port', port.toString(),
    '--listen', `127.0.0.1:${listenPort}`,
    '--api-host', '127.0.0.1',
    '--peer', `127.0.0.1:${peerPort}`,
    '--hydra-verification-key', `credentials/${otherNode}-hydra.vk`,
    '--cardano-verification-key', `credentials/${otherNode}-node.vk`,
  ];

  try {
    const process = spawn('hydra-node', args, {
      cwd: config.workingDir || process.cwd(),
      shell: true,
      detached: false,
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[${nodeId}] ${data}`);
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[${nodeId}] ${data}`);
    });

    process.on('close', (code) => {
      console.log(`[${nodeId}] Process exited with code ${code}`);
      runningProcesses.delete(nodeId);
    });

    runningProcesses.set(nodeId, {
      process,
      startTime: new Date(),
      output,
      errorOutput,
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

  const args = [
    'run',
    '--config', config.configFile || 'config.json',
    '--topology', config.topologyFile || 'topology.json',
    '--socket-path', config.socketPath || '/home/g1bssq/node.socket',
    '--database-path', config.databasePath || 'db',
  ];

  try {
    const process = spawn('cardano-node', args, {
      cwd: config.workingDir || process.cwd(),
      shell: true,
      detached: false,
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[${nodeId}] ${data}`);
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[${nodeId}] ${data}`);
    });

    process.on('close', (code) => {
      console.log(`[${nodeId}] Process exited with code ${code}`);
      runningProcesses.delete(nodeId);
    });

    runningProcesses.set(nodeId, {
      process,
      startTime: new Date(),
      output,
      errorOutput,
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
  
  if (!processInfo) {
    return NextResponse.json({ 
      error: `Node ${nodeId} is not running` 
    }, { status: 400 });
  }

  try {
    processInfo.process.kill('SIGTERM');
    runningProcesses.delete(nodeId);
    
    return NextResponse.json({
      success: true,
      message: `${nodeId} stopped successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleClearData(config: any) {
  try {
    const paths = [
      '~/persistence-alice',
      '~/persistence-bob',
      '~/hydra/demo/devnet/persistence/',
      '~/hydra-demo/demo/devnet/persistence/',
      '/tmp/persistence-*',
      '/tmp/hydra-*',
    ];

    const commands: string[] = [];
    
    for (const p of paths) {
      if (p.includes('*')) {
        commands.push(`rm -rf ${p}`);
      } else {
        commands.push(`rm -rf ${p}`);
      }
    }

    // Create directories
    commands.push('mkdir -p ~/persistence-alice ~/persistence-bob');

    const command = commands.join(' && ');
    await execAsync(command);

    return NextResponse.json({
      success: true,
      message: 'Data cleared successfully',
      clearedPaths: paths,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleGetStatus(nodeId?: string) {
  if (nodeId) {
    const processInfo = runningProcesses.get(nodeId);
    if (!processInfo) {
      return NextResponse.json({
        nodeId,
        running: false,
      });
    }

    return NextResponse.json({
      nodeId,
      running: true,
      startTime: processInfo.startTime,
      pid: processInfo.process.pid,
      port: processInfo.port,
    });
  }

  // Return status of all nodes
  const statuses: any = {};
  
  ['alice-node', 'bob-node', 'cardano-node'].forEach(id => {
    const processInfo = runningProcesses.get(id);
    statuses[id] = processInfo ? {
      running: true,
      startTime: processInfo.startTime,
      pid: processInfo.process.pid,
      port: processInfo.port,
    } : {
      running: false,
    };
  });

  return NextResponse.json(statuses);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('nodeId');
  
  return handleGetStatus(nodeId || undefined);
}
