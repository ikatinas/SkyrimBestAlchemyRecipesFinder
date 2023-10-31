const http = require('http');
const path = require('path');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');

const serve = serveStatic(path.join(__dirname));
const server = http.createServer((req, res) => {
  const done = finalhandler(req, res);
  serve(req, res, done);
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});