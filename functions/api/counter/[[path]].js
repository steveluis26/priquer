export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const incrementMatch = path.match(/^\/api\/counter\/([a-z_]+)\/increment$/);
  if (incrementMatch && request.method === 'POST') {
    const tool = incrementMatch[1];
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const yearKey = String(now.getFullYear());

    const key = `counter:${tool}`;
    let data = await env.PQ_COUNTER.get(key, 'json');

    if (!data) {
      data = { all: 0, monthly: {}, yearly: {} };
    }

    data.all = (data.all || 0) + 1;
    data.monthly[monthKey] = (data.monthly[monthKey] || 0) + 1;
    data.yearly[yearKey] = (data.yearly[yearKey] || 0) + 1;

    await env.PQ_COUNTER.put(key, JSON.stringify(data));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const getMatch = path.match(/^\/api\/counter\/([a-z_]+)$/);
  if (getMatch && request.method === 'GET') {
    const tool = getMatch[1];
    const key = `counter:${tool}`;
    const data = await env.PQ_COUNTER.get(key, 'json');

    if (!data) {
      return new Response(JSON.stringify({ all: 0, monthly: {}, yearly: {} }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (path === '/api/counter' && request.method === 'GET') {
    const list = await env.PQ_COUNTER.list({ prefix: 'counter:' });
    const result = {};

    for (const key of list.keys) {
      const toolName = key.name.replace('counter:', '');
      const data = await env.PQ_COUNTER.get(key.name, 'json');
      result[toolName] = data;
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response('Not found', { status: 404 });
}
