const http = require('http');
const fs = require('fs');
const path = require('path');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');

const serve = serveStatic(path.join(__dirname));
const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname !== '/') {
    const decodedPathname = decodeURIComponent(pathname);
    const normalizedRelativePath = path
      .normalize(decodedPathname)
      .replace(/^([/\\])+/, '');
    const absolutePath = path.join(__dirname, normalizedRelativePath);

    const isInsideRoot = absolutePath.startsWith(__dirname + path.sep);
    const exists = isInsideRoot && fs.existsSync(absolutePath);
    const isFile = exists && fs.statSync(absolutePath).isFile();

    if (!isFile) {
      const redirectStatus = req.method === 'GET' || req.method === 'HEAD' ? 302 : 307;
      res.statusCode = redirectStatus;
      res.setHeader('Location', '/');
      res.end();
      return;
    }
  }

  const done = finalhandler(req, res);
  serve(req, res, done);
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});