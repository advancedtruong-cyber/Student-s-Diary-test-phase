// File: api/chat.js
// Edge Runtime — lách timeout 10s của Vercel Hobby plan
// Cú pháp Web API (Request/Response), không dùng Express (req, res)

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const DIFY_API_KEY = process.env.DIFY_API_KEY;

  if (!DIFY_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'server_error', detail: 'Thiếu API Key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── CORS headers (cần thiết nếu sau này tách domain) ──
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ══════════════════════════════════════════════════════
  // GET — Lấy lịch sử chat khi user F5
  // ══════════════════════════════════════════════════════
  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url);
    const userEmail      = searchParams.get('userEmail');
    const conversationId = searchParams.get('conversationId');

    if (!userEmail || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'bad_request', detail: 'Thiếu userEmail hoặc conversationId' }),
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      const difyRes = await fetch(
        `https://api.dify.ai/v1/messages?user=${encodeURIComponent(userEmail)}&conversation_id=${encodeURIComponent(conversationId)}&limit=50`,
        { headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` } }
      );
      const data = await difyRes.json();
      return new Response(JSON.stringify(data), { status: difyRes.status, headers: corsHeaders });
    } catch {
      return new Response(
        JSON.stringify({ error: 'server_error', detail: 'Lỗi lấy lịch sử' }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // ══════════════════════════════════════════════════════
  // POST — Gửi tin nhắn mới
  // ══════════════════════════════════════════════════════
  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'bad_request', detail: 'Invalid JSON body' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { message, sessionId, userEmail } = body;

    // Chốt chặn: không có email → 401
    if (!userEmail || !userEmail.includes('@gmail.com')) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', detail: 'Cần email Gmail hợp lệ' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Chốt chặn: không có message → 400
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'bad_request', detail: 'Message không được rỗng' }),
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      const difyRes = await fetch('https://api.dify.ai/v1/chat-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query: message.trim(),
          response_mode: 'blocking',
          conversation_id: sessionId || '',
          user: userEmail,
        }),
      });

      const data = await difyRes.json();

      // Bắt lỗi từ Dify — phân loại rõ 429 vs lỗi khác
      if (!difyRes.ok) {
        return new Response(
          JSON.stringify({
            error: difyRes.status === 429 ? 'rate_limit' : 'server_error',
            detail: data.message || `Dify returned ${difyRes.status}`,
          }),
          { status: difyRes.status, headers: corsHeaders }
        );
      }

      // Trả về đã mapping — fix nguyên nhân 2 (snake_case → camelCase)
      return new Response(
        JSON.stringify({
          answer:         data.answer          || '',
          conversationId: data.conversation_id || sessionId || '',
        }),
        { status: 200, headers: corsHeaders }
      );

    } catch {
      return new Response(
        JSON.stringify({ error: 'server_error', detail: 'Mất kết nối tới Dify' }),
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // Block mọi method khác
  return new Response(
    JSON.stringify({ error: 'method_not_allowed' }),
    { status: 405, headers: corsHeaders }
  );
}
