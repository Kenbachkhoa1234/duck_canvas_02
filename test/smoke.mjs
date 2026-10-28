import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const appUrl = process.argv[2] || 'http://127.0.0.1:4173/';
const debugPort = 9333;
const profile = mkdtempSync(join(tmpdir(), 'duck-canvas-02-'));
const candidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = candidates.find(existsSync);

if (!chromePath) throw new Error('Không tìm thấy Chrome. Có thể đặt CHROME_PATH rồi chạy lại.');

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--hide-scrollbars',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  '--window-size=1678,944',
  appUrl,
], { stdio: 'ignore', windowsHide: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForPage() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
      const page = pages.find((item) => item.type === 'page' && item.url.startsWith(appUrl));
      if (page) return page;
    } catch {
      // Chrome chưa sẵn sàng.
    }
    await delay(150);
  }
  throw new Error('Chrome DevTools không sẵn sàng.');
}

function createCdpClient(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let id = 0;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    async send(method, params = {}) {
      await ready;
      id += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

let client;
try {
  const page = await waitForPage();
  client = createCdpClient(page.webSocketDebuggerUrl);
  await client.send('Runtime.enable');
  await delay(500);

  const initialThreads = await evaluate(client, 'document.querySelectorAll("#savedThreads .thread-path").length');
  const points = await evaluate(client, `(() => {
    const from = document.querySelector('[data-anchor="city"]').getBoundingClientRect();
    const to = document.querySelector('[data-target="reply-top"] .bubble').getBoundingClientRect();
    return {
      from: { x: from.left + from.width / 2, y: from.top + from.height / 2 },
      to: { x: to.left + 8, y: to.top + to.height / 2 }
    };
  })()`);

  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points.from });
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points.from, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...points.to, button: 'left', buttons: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.to, button: 'left', clickCount: 1 });
  await delay(250);

  const finalThreads = await evaluate(client, 'document.querySelectorAll("#savedThreads .thread-path").length');
  if (finalThreads !== initialThreads + 1) throw new Error(`Kéo dây thất bại: ${initialThreads} -> ${finalThreads}`);

  const sentText = await evaluate(client, `(() => {
    const input = document.querySelector('#messageInput');
    input.value = 'Tin nhắn smoke test';
    document.querySelector('#composerForm').requestSubmit();
    return document.querySelector('.node--reply-lake .bubble').textContent;
  })()`);
  if (sentText !== 'Tin nhắn smoke test') throw new Error('Composer không cập nhật tin nhắn.');

  const quickMenuOpen = await evaluate(client, `(() => {
    document.querySelector('#plusButton').click();
    return !document.querySelector('#quickMenu').hidden;
  })()`);
  if (!quickMenuOpen) throw new Error('Menu công cụ không mở.');

  console.log(`OK: HTTP UI, kéo dây ${initialThreads}->${finalThreads}, composer và menu công cụ hoạt động.`);
  await client.send('Browser.close');
} finally {
  client?.close();
  if (!chrome.killed) chrome.kill();
}
