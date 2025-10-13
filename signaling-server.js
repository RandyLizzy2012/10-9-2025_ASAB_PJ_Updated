const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

console.log('Signaling server started on port 8080');

// Store connected clients
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  let clientId = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      switch (data.type) {
        case 'register':
          // Register client
          clientId = data.userID;
          clients.set(clientId, ws);
          console.log(`Client registered: ${clientId}`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'registered',
            userID: clientId
          }));
          break;
          
        case 'call_invite':
          // Forward call invite to target user
          const targetWs = clients.get(data.toUserID);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify(data));
            console.log(`Call invite forwarded to: ${data.toUserID}`);
          } else {
            // Target user not online, send back error
            ws.send(JSON.stringify({
              type: 'call_error',
              error: 'User not online',
              toUserID: data.toUserID
            }));
          }
          break;
          
        case 'call_accept':
        case 'call_reject':
        case 'call_end':
        case 'ice_candidate':
        case 'offer':
        case 'answer':
          // Forward signaling messages
          const targetClient = clients.get(data.toUserID);
          if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify(data));
            console.log(`${data.type} forwarded to: ${data.toUserID}`);
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    if (clientId) {
      clients.delete(clientId);
      console.log(`Client disconnected: ${clientId}`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down signaling server...');
  wss.close(() => {
    console.log('Signaling server stopped');
    process.exit(0);
  });
});
