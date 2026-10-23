import { routes } from './routes.js';
/** OpenAPI 3 document generated from the single route table (so the spec can never drift from the API). */
export function openapi() {
  const paths = {};
  for (const [m, url, summary, tag] of routes) {
    const p = url.replace(/:(\w+)/g, '{$1}'); const params = [...url.matchAll(/:(\w+)/g)].map((x) => ({ name: x[1], in: 'path', required: true, schema: { type: 'string' } }));
    (paths[p] ||= {})[m.toLowerCase()] = { summary, tags: [tag], operationId: `${m.toLowerCase()}${p.replace(/[{}]/g, '').replace(/\/(\w)/g, (_, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '')}`, parameters: params, ...(m !== 'GET' && m !== 'DELETE' ? { requestBody: { content: { 'application/json': { schema: { type: 'object' } } } } } : {}), responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } }, 400: { description: 'Validation error' }, 404: { description: 'Not found' } } };
  }
  paths['/api/stream'] = { get: { summary: 'Server-Sent Events: `live` snapshots (~3/s) and `note` events (immediate)', tags: ['System'], responses: { 200: { description: 'text/event-stream' } } } };
  paths['/api/openapi.json'] = { get: { summary: 'This document', tags: ['System'], responses: { 200: { description: 'OpenAPI 3.0 JSON' } } } };
  return { openapi: '3.0.3', info: { title: 'Gateline airport retail media API', version: '1.0.0', description: 'REST API over the canonical model. Airport data enters only through adapters (AODB 33-column CSV, IATA AIDX FlightLegNotifRQ XML, ACI ACRIS NGSI-LD). Live updates: GET /api/stream (SSE).' }, servers: [{ url: '/' }], paths };
}
