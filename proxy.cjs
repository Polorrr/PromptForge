const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3456;
const NVIDIA_API = 'https://integrate.api.nvidia.com';

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Extract the target path after /nvidia/
  const parsedUrl = url.parse(req.url);
  let path = parsedUrl.pathname.replace(/^\/nvidia/, '');

  // Add /v1 prefix if not already present
  if (!path.startsWith('/v1')) {
    path = '/v1' + path;
  }

  // Build target URL
  const targetUrl = `${NVIDIA_API}${path}${parsedUrl.search || ''}`;

  console.log(`[Proxy] ${req.method} ${targetUrl}`);

  // Collect request body
  let body = [];
  req.on('data', (chunk) => body.push(chunk));
  req.on('end', () => {
    const bodyBuffer = Buffer.concat(body);

    const options = {
      hostname: 'integrate.api.nvidia.com',
      port: 443,
      path: path + (parsedUrl.search || ''),
      method: req.method,
      headers: {
        ...req.headers,
        host: 'integrate.api.nvidia.com',
      },
    };

    // Remove localhost-specific headers
    delete options.headers['connection'];

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error]', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });

    if (bodyBuffer.length > 0) {
      proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          NVIDIA API CORS Proxy Running               ║
╠══════════════════════════════════════════════════════╣
║  Local:  http://localhost:${PORT}                      ║
║  Target: ${NVIDIA_API}                ║
╠══════════════════════════════════════════════════════╣
║  Usage: Keep this running while using NVIDIA API     ║
║  Press Ctrl+C to stop                                ║
╚══════════════════════════════════════════════════════╝
  `);
});
