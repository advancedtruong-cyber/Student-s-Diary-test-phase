// ÉP VERCEL CHẠY EDGE RUNTIME (QUAN TRỌNG: Lách luật 10s timeout)
export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  const DIFY_API_KEY = process.env.DIFY_API_KEY;

  if (!DIFY_API_KEY) {
    return new Response(JSON.stringify({ error: 'Thiếu API Key' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // ==========================================
  // CỔNG GET: LẤY LỊCH SỬ CHAT KHI F5
  // ==========================================
  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('userEmail');
    const conversationId = searchParams.get('conversationId');

    if (!userEmail || !conversationId) {
      return new Response(JSON.stringify({ error: 'Thiếu param' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const response = await fetch(`https://api.dify.ai/v1/messages?user=${encodeURIComponent(userEmail)}&conversation_id=${encodeURIComponent(conversationId)}&limit=100`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }
      });
      
      const data = await response.json();
      return new Response(JSON.stringify(data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Lỗi lấy lịch sử' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // ==========================================
  // CỔNG POST: GỬI TIN NHẮN MỚI (STREAMING)
  // ==========================================
  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { message, sessionId, userEmail } = body;

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'Thiếu Email' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const response = await fetch('https://api.dify.ai/v1/chat-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query: message,
          response_mode: "streaming", // CHÌA KHÓA BẺ KHÓA TIMEOUT
          conversation_id: sessionId || "",
          user: userEmail 
        })
      });

      // Bắt lỗi Rate Limit ngay từ đầu nếu Dify từ chối
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return new Response(JSON.stringify({ 
          error: response.status === 429 ? 'rate_limit' : 'server_error',
          detail: errData.message || 'Lỗi từ Dify'
        }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
      }

      // STREAM DỮ LIỆU TRỰC TIẾP VỀ FRONTEND
      return new Response(response.body, {
        headers: { 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'server_error', detail: 'Mất kết nối máy chủ' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
}
