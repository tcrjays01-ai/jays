const httpServer = require('http-server');
const port = process.env.PORT || 9090;
const server = httpServer.createServer({ root: '.', cors: true, cache: -1 });
server.listen(port, '0.0.0.0', () => {
  console.log(`COSMIC http-server running on port ${port}`);
});
