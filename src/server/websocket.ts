import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

console.log('WebSocket UI Deployment Server running on ws://localhost:3001');

const LOGS = [
  "> Initializing Myk Agent 23 core engine...",
  "> Provisioning secure Docker sandbox environment...",
  "> Allocating 1.2GB memory space...",
  "> Loading language models (Gemini Pro)...",
  "> Connecting to OpenClaw framework...",
  "> Configuring end-to-end encryption keys...",
  "> Establishing WhatsApp and Telegram bridges...",
  "> Verifying runtime dependencies...",
  "> Agent successfully deployed and online."
];

wss.on('connection', (ws) => {
  console.log('Client connected to deployment terminal');
  ws.send(JSON.stringify({ type: 'log', message: '> Connected to deployment cluster.' }));
  
  let step = 0;
  const interval = setInterval(() => {
    if (step < LOGS.length) {
      ws.send(JSON.stringify({ type: 'log', message: LOGS[step] }));
      step++;
    } else {
      ws.send(JSON.stringify({ type: 'done', message: '> Server process exited with code 0.' }));
      clearInterval(interval);
      ws.close();
    }
  }, 1200); // 1.2 seconds per log 

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});
