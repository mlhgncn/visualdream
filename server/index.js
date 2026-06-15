const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
// Log every incoming request (helps diagnose hanging/partial requests from devices)
app.use((req, res, next) => {
  try {
    const brief = `${new Date().toISOString()} - REQ ${req.method} ${req.originalUrl} from ${req.ip || req.connection && req.connection.remoteAddress}`;
    fs.appendFileSync(path.join(__dirname, 'requests.log'), brief + '\n');
  } catch (e) {}
  next();
});
// serve generated images
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
app.use('/public', express.static(publicDir));

const PORT = process.env.PORT || 3001;

// Helper: save a data:...;base64, string to public/last.png and return local HTTP URL
async function saveDataUrlToPublic(dataUrl, req) {
  try {
    const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/s);
    if (!m) return null;
    const mime = m[1];
    const b64 = m[2];
    const buf = Buffer.from(b64, 'base64');
    const outPath = path.join(publicDir, 'last.png');
    if (mime === 'image/svg+xml') {
      // convert SVG -> PNG
      await sharp(buf).png().toFile(outPath);
    } else {
      // try to decode other image types and convert to PNG for consistency
      await sharp(buf).png().toFile(outPath);
    }
    const hostHeader = (req.headers.host || '').split(':')[0] || getLocalIPv4() || '127.0.0.1';
    const port = process.env.PORT || 3001;
    return `http://${hostHeader}:${port}/public/last.png`;
  } catch (e) {
    try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${new Date().toISOString()} - saveDataUrlToPublic failed ${e && e.message}\n`); } catch (e){}
    return null;
  }
}

function getLocalIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        // prefer private addresses
        if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) return net.address;
      }
    }
  }
  // fallback: first external IPv4
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/generate-image', async (req, res) => {
  const prompt = (req.body && (req.body.prompt || req.body.text)) || '';
  const remote = req.ip || req.connection && req.connection.remoteAddress;
  const now = new Date().toISOString();
  try {
    // If configured to mock generation, return an embedded PNG data URL
    const MOCK_GEN = process.env.MOCK_GENERATE === 'true' || (process.env.GEMINI_IMAGE_URL || '').toLowerCase() === 'mock';
    if (MOCK_GEN) {
      const smallPng = 'iVBORw0KGgoAAAANSUhEUgAAAOAAAADgCAIAAAD+3b9eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEKUlEQVR4nO3dQW7rMBCG4Z8K//+3bYQJAQm3s2g7s2LQ1s1kQ2g0m9ZK6Yk3lB4GQAAAAAAAAAAAAAAAMBv3W3a9fV3e7s3t7Yv9v1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1Pb/1fU9v9X1PZ/9sZ0A3gLw8QAAAABJRU5ErkJggg==';
      const dataUrl = `data:image/png;base64,${smallPng}`;
      try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - returning embedded mock imageDataUrl size:${smallPng.length}\n`); } catch(e){}
      // also write a PNG file to public so the client can load it via http
      try {
        const buf = Buffer.from(smallPng, 'base64');
        fs.writeFileSync(path.join(publicDir, 'last.png'), buf);
        const host = req.headers.host || `192.168.1.21:3001`;
        const imageUrlLocal = `http://${host.replace(/:\d+$/, '') || '192.168.1.21'}:${process.env.PORT || 3001}/public/last.png`;
        try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - wrote public/last.png and returning imageUrlLocal ${imageUrlLocal}\n`); } catch(e){}
        try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - response: ${JSON.stringify({ ok:true, imageDataUrl: dataUrl, imageUrl: imageUrlLocal }).slice(0,1000)}\n`); } catch(e){}
        return res.json({ ok: true, imageDataUrl: dataUrl, imageUrl: imageUrlLocal });
      } catch (e) {
        try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - write public failed ${e && e.message}\n`); } catch(e){}
        try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - response: ${JSON.stringify({ ok:true, imageDataUrl: dataUrl }).slice(0,1000)}\n`); } catch(e){}
        return res.json({ ok: true, imageDataUrl: dataUrl });
      }
    }
    fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - ${remote} - prompt: ${prompt}\n`);
  } catch (e) {
    console.error('Failed to write request log', e && e.message);
  }
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const GEMINI_KEY = process.env.GEMINI_IMAGE_API_KEY || process.env.GEMINI_API_KEY;
  const GEMINI_URL = process.env.GEMINI_IMAGE_URL || process.env.GEMINI_URL;
  if (!GEMINI_KEY || !GEMINI_URL) return res.status(410).json({ error: 'Gemini not configured' });

  try {
    // If GEMINI_URL points to a direct image URL (debug/testing), return it directly
    if (/\.(png|jpe?g|gif|webp)$/i.test(GEMINI_URL)) {
      try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - returning direct image ${GEMINI_URL}\n`); } catch(e){}
      try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - response: ${JSON.stringify({ ok:true, imageUrl: GEMINI_URL }).slice(0,1000)}\n`); } catch(e){}
      return res.json({ ok: true, imageUrl: GEMINI_URL });
    }
    const r = await axios.post(GEMINI_URL, { prompt }, { headers: { Authorization: `Bearer ${GEMINI_KEY}` }, timeout: 60000 });
    const data = r && r.data ? r.data : {};
    if (data.imageBase64) {
      const dataUrl = data.imageBase64.startsWith('data:') ? data.imageBase64 : `data:image/png;base64,${data.imageBase64}`;
      try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - got imageBase64, attempting to save to public\n`); } catch(e){}
      const local = await saveDataUrlToPublic(dataUrl, req);
      if (local) {
        try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - saved imageBase64 to ${local}\n`); } catch(e){}
        return res.json({ ok: true, imageUrl: local, imageDataUrl: dataUrl });
      }
      try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - response: ${JSON.stringify({ ok:true, imageDataUrl: dataUrl }).slice(0,1000)}\n`); } catch(e){}
      return res.json({ ok: true, imageDataUrl: dataUrl });
    }
    if (data.imageUrl || data.url) { const out = { ok: true, imageUrl: data.imageUrl || data.url }; try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - response: ${JSON.stringify(out).slice(0,1000)}\n`); } catch(e){}; return res.json(out); }
    if (Array.isArray(data.images) && data.images[0]) {
      const img = data.images[0];
      if (img.base64) {
        const dataUrl = img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`;
        try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - got images[0].base64, saving to public\n`); } catch(e){}
        const local = await saveDataUrlToPublic(dataUrl, req);
        if (local) {
          try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - saved images[0].base64 to ${local}\n`); } catch(e){}
          return res.json({ ok: true, imageUrl: local, imageDataUrl: dataUrl });
        }
        const out = { ok: true, imageDataUrl: dataUrl };
        try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - response: ${JSON.stringify(out).slice(0,1000)}\n`); } catch(e){}
        return res.json(out);
      }
      if (img.url) { const out = { ok: true, imageUrl: img.url }; try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - response: ${JSON.stringify(out).slice(0,1000)}\n`); } catch(e){}; return res.json(out); }
    }

    return res.status(502).json({ error: 'unexpected_response', detail: data });
  } catch (err) {
    console.error('Gemini proxy error', err && err.message);
    try { fs.appendFileSync(path.join(__dirname, 'requests.log'), `${now} - proxy_failed ${err && err.message}\n`); } catch(e){}
    return res.status(502).json({ error: 'proxy_failed', detail: err && err.message });
  }
});

// small helper to escape HTML in SVG
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>');
}

app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on 0.0.0.0:${PORT}`));
