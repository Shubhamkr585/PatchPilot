import * as http from 'http';
import { ApiController } from './controller';
import { IncidentStore } from '../../../packages/db/src/client';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.API_PORT || '3001', 10);

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve(data);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Delivery, X-Hub-Signature-256, X-GitHub-Event',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Delivery, X-Hub-Signature-256, X-GitHub-Event',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // 1. Webhook endpoint: POST /api/webhooks/github
    if (req.method === 'POST' && pathname === '/api/webhooks/github') {
      const body = await parseJsonBody(req);
      const headers = {
        'x-github-delivery': req.headers['x-github-delivery'] as string,
        'x-hub-signature-256': req.headers['x-hub-signature-256'] as string,
        'x-github-event': req.headers['x-github-event'] as string,
      };
      const result = await ApiController.handleGithubWebhook(headers, body);
      return sendJson(res, result.status, result.response);
    }

    // 2. 1-Click Simulation endpoint: POST /api/incidents/simulate
    if (req.method === 'POST' && pathname === '/api/incidents/simulate') {
      const body = await parseJsonBody(req);
      const scenario = body.scenario || 'stripe_concurrency';
      const incident = await ApiController.simulateFailure(scenario);
      return sendJson(res, 201, { message: 'Simulation finished', incident });
    }

    // 3. List incidents: GET /api/incidents
    if (req.method === 'GET' && pathname === '/api/incidents') {
      const incidents = await IncidentStore.getAllIncidents();
      return sendJson(res, 200, { incidents });
    }

    // 4. Get incident details: GET /api/incidents/:id
    if (req.method === 'GET' && pathname.startsWith('/api/incidents/')) {
      const parts = pathname.split('/');
      const id = parts[3];
      if (id) {
        const incident = await IncidentStore.getIncidentById(id);
        if (incident) {
          return sendJson(res, 200, { incident });
        }
        return sendJson(res, 404, { error: `Incident ${id} not found` });
      }
    }

    // 5. Approve & Post PR review: POST /api/incidents/:id/post-pr
    if (req.method === 'POST' && pathname.includes('/post-pr')) {
      const parts = pathname.split('/');
      const id = parts[3];
      const updated = await ApiController.approveAndPostPr(id);
      return sendJson(res, 200, { message: 'PR review diff posted successfully', incident: updated });
    }

    // 6. Telemetry KPIs: GET /api/telemetry
    if (req.method === 'GET' && pathname === '/api/telemetry') {
      const stats = await ApiController.getTelemetryStats();
      return sendJson(res, 200, stats);
    }

    // Healthcheck: GET /healthz
    if (pathname === '/healthz') {
      return sendJson(res, 200, { status: 'healthy', version: '2.4-agent', timestamp: new Date() });
    }

    return sendJson(res, 404, { error: 'Not Found', path: pathname });
  } catch (err: any) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: 'Internal Server Error', message: err.message });
  }
});

export function startApiServer(port = PORT): Promise<http.Server> {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🚀 PatchPilot API & Webhook Ingestion server listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startApiServer();
}

export { server };
