const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const RESTRICTED_PORTS = [
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 101, 
  102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 138, 139, 143, 161, 
  162, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 
  563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 
  5061, 5173, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080
];

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}

async function findAvailablePort(startPort) {
  const isPortAvailable = (port) => {
    if (RESTRICTED_PORTS.includes(port)) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port, '0.0.0.0');
    });
  };

  let port = startPort;
  while (port < startPort + 100) {
    if (await isPortAvailable(port)) return port;
    port++;
  }
  throw new Error(`Could not find an available port starting from ${startPort}`);
}

async function start() {
  try {
    loadEnv();
    const port = await findAvailablePort(5173);
    console.log(`[Dev Wrapper] Starting Vite on port ${port}...`);

    const env = {
      ...process.env,
      VITE_PORT: port.toString(),
      ELECTRON_RENDERER_URL: `http://localhost:${port}`
    };

    const child = spawn('npx', ['electron-vite', 'dev'], {
      stdio: 'inherit',
      env,
      shell: true
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (err) {
    console.error('[Dev Wrapper] Failed to start:', err);
    process.exit(1);
  }
}

start();
