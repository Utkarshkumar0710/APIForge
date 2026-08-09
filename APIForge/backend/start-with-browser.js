const { spawn, exec } = require('child_process');
const net = require('net');
const path = require('path');

const port = Number(process.env.PORT) || 4000;
const host = '127.0.0.1';
const targetUrl = `http://${host}:${port}/`;
const backendScript = path.join(__dirname, 'server.js');
const launchBrowser = process.env.BROWSER_LAUNCH !== 'false' && process.env.NODE_ENV !== 'production';

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

function waitForPort(timeoutMs = 30000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      isPortOpen().then((open) => {
        if (open) return resolve();
        if (Date.now() - startedAt > timeoutMs) {
          return reject(new Error(`Timed out waiting for ${host}:${port}`));
        }
        setTimeout(check, 500);
      });
    };
    check();
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`, { windowsHide: true });
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
  } else {
    spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  }
}

function startBackend() {
  const child = spawn(process.execPath, [backendScript], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error('Failed to start backend:', err.message);
    process.exit(1);
  });

  return child;
}

async function main() {
  const alreadyRunning = await isPortOpen();
  if (alreadyRunning) {
    console.log(`Backend already available at ${targetUrl}`);
    if (launchBrowser) {
      openBrowser(targetUrl);
    }
    return;
  }

  const child = startBackend();
  try {
    await waitForPort();
    console.log(`Backend is listening at ${targetUrl}`);
    if (launchBrowser) {
      console.log(`Opening ${targetUrl} in your default browser...`);
      openBrowser(targetUrl);
    }
  } catch (err) {
    console.error(err.message);
    child.kill('SIGTERM');
    process.exit(1);
  }
}

main();

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
