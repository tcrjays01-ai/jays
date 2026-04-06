const httpServer = require('http-server');
const server = httpServer.createServer({ root: '.', cors: true, cache: -1 });
server.listen(9090, '0.0.0.0', () => {
  console.log('COSMIC http-server running on port 9090');
});
