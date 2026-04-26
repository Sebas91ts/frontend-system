const http = require('http');
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const HOST = 'localhost';
const PORT = Number(process.env.COLLAB_PORT || 1234);

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Yjs collab server is running\n');
});

const websocketServer = new WebSocket.Server({ server });

websocketServer.on('connection', (connection, request) => {
  setupWSConnection(connection, request);
});

websocketServer.on('error', (error) => {
  console.error('Yjs collab server websocket error:', error);
});

server.listen(PORT, HOST, () => {
  console.log(`Yjs collab server running at ws://${HOST}:${PORT}`);
});
