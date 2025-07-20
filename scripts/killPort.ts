const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function killPort(port: number) {
  try {
    // For macOS/Linux
    const { stdout: pid } = await execAsync(`lsof -i :${port} -t`);
    if (pid) {
      await execAsync(`kill -9 ${pid}`);
      console.log(`Successfully killed process on port ${port}`);
    } else {
      console.log(`No process found running on port ${port}`);
    }
  } catch (error) {
    console.error(`Error killing port ${port}:`, error);
  }
}

// Common development ports to kill
const ports = [3000, 3001, 3002, 3003, 3004, 5000, 5001, 5002, 8080, 8081];

async function killAllPorts() {
  console.log('Killing processes on common development ports...');
  for (const port of ports) {
    await killPort(port);
  }
  console.log('Done!');
}

// If a port is provided as a command line argument, kill that specific port
const args = process.argv.slice(2);
if (args.length > 0) {
  const port = parseInt(args[0]);
  if (!isNaN(port)) {
    killPort(port);
  } else {
    console.error('Please provide a valid port number');
  }
} else {
  // Otherwise kill all common development ports
  killAllPorts();
} 