import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // Test 1: Check hydra-node binary
    try {
      const { stdout: version, stderr: versionErr } = await execAsync('wsl bash -l -c "/home/g1bssq/bin/hydra-node --version 2>&1"');
      results.tests.hydraNodeVersion = {
        success: true,
        output: version.trim(),
        error: versionErr?.trim()
      };
    } catch (err: any) {
      results.tests.hydraNodeVersion = {
        success: false,
        error: err.message
      };
    }

    // Test 2: Check credentials folder
    try {
      const { stdout: credentials } = await execAsync('wsl bash -l -c "ls -la ~/credentials/ 2>&1"');
      results.tests.credentialsFolder = {
        success: true,
        output: credentials.trim()
      };
    } catch (err: any) {
      results.tests.credentialsFolder = {
        success: false,
        error: err.message
      };
    }

    // Test 3: Check protocol-parameters.json
    try {
      const { stdout: protocol } = await execAsync('wsl bash -l -c "test -f ~/protocol-parameters.json && echo EXISTS || echo NOT_FOUND"');
      results.tests.protocolParameters = {
        success: true,
        exists: protocol.trim() === 'EXISTS'
      };
    } catch (err: any) {
      results.tests.protocolParameters = {
        success: false,
        error: err.message
      };
    }

    // Test 4: Check cardano node socket
    try {
      const { stdout: socket } = await execAsync('wsl bash -l -c "test -S /home/g1bssq/node.socket && echo EXISTS || echo NOT_FOUND"');
      results.tests.cardanoSocket = {
        success: true,
        exists: socket.trim() === 'EXISTS'
      };
    } catch (err: any) {
      results.tests.cardanoSocket = {
        success: false,
        error: err.message
      };
    }

    // Test 5: Try running hydra-node with minimal params
    try {
      const { stdout: testRun, stderr: testErr } = await execAsync('wsl bash -l -c "timeout 2 /home/g1bssq/bin/hydra-node --help 2>&1 | head -10"');
      results.tests.hydraNodeHelp = {
        success: true,
        output: testRun.trim(),
        error: testErr?.trim()
      };
    } catch (err: any) {
      results.tests.hydraNodeHelp = {
        success: false,
        error: err.message
      };
    }

    // Test 6: Check PATH
    try {
      const { stdout: path } = await execAsync('wsl bash -l -c "echo $PATH"');
      results.tests.wslPath = {
        success: true,
        output: path.trim()
      };
    } catch (err: any) {
      results.tests.wslPath = {
        success: false,
        error: err.message
      };
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      results
    }, { status: 500 });
  }
}
