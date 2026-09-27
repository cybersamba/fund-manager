import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handler as navHandler } from './netlify/functions/nav.js'

function navApiPlugin() {
    return {
        name: 'nav-api-plugin',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url.startsWith('/api/nav')) {
                    try {
                        const parsedUrl = new URL(req.url, 'http://localhost');
                        const params = Object.fromEntries(parsedUrl.searchParams);
                        const event = {
                            httpMethod: req.method,
                            queryStringParameters: params
                        };
                        const result = await navHandler(event);
                        res.writeHead(result.statusCode, result.headers);
                        res.end(result.body);
                        return;
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: err.message }));
                        return;
                    }
                }
                next();
            });
        }
    };
}

export default defineConfig({
    plugins: [react(), navApiPlugin()],
    server: {
        port: 5173,
        strictPort: true
    }
})
