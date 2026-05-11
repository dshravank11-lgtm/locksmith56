import http from 'http';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEEPSEEK_API_KEY = 'sk-xxxxxxxxxxx';

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/' && req.method === 'GET') {
        const htmlPath = path.join(__dirname, 'index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
    }

    if (req.url === '/api/compounds' && req.method === 'GET') {
        const compoundsPath = path.join(__dirname, 'api', 'compounds-data.json');
        const data = fs.readFileSync(compoundsPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        return;
    }

    if (req.url === '/api/collected' && req.method === 'GET') {
        const collectedPath = path.join(__dirname, 'api', 'collected.json');
        if (!fs.existsSync(collectedPath)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('[]');
            return;
        }
        const data = fs.readFileSync(collectedPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
        return;
    }

    if (req.url === '/api/collected' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { compound } = JSON.parse(body);
                if (!compound) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'compound name required' }));
                    return;
                }
                const collectedPath = path.join(__dirname, 'api', 'collected.json');
                let collected = [];
                if (fs.existsSync(collectedPath)) {
                    collected = JSON.parse(fs.readFileSync(collectedPath, 'utf8'));
                }
                collected.push({
                    compound: compound,
                    timestamp: new Date().toISOString()
                });
                fs.writeFileSync(collectedPath, JSON.stringify(collected, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, total: collected.length }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    if (req.url === '/api/proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { messages } = JSON.parse(body);
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        max_tokens: 500,
                        messages: messages
                    })
                });
                const data = await response.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (error) {
                console.error('Proxy error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Press Ctrl+C to stop`);
});
