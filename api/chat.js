export default async function handler(req, res) {
  const DIFY_API_KEY = process.env.DIFY_API_KEY;

  if (!DIFY_API_KEY) {
    return res.status(500).json({ error: 'Server chưa được cấu hình API Key' });
  }

  // ==========================================
  // CỔNG GET: LẤY LỊCH SỬ CHAT KHI F5
  // ==========================================
  if (req.method === 'GET') {
    const { userEmail, conversationId } = req.query;

    if (!userEmail || !conversationId) {
      return res.status(400).json({ error: 'Thiếu thông tin user hoặc session' });
    }

    try {
      const response = await fetch(`https://api.dify.ai/v1/messages?user=${encodeURIComponent(userEmail)}&conversation_id=${encodeURIComponent(conversationId)}&limit=100`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }
      });
      
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.message || 'Lỗi từ Dify' });
      
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Lỗi lấy lịch sử' });
    }
  }

  // ==========================================
  // CỔNG POST: GỬI TIN NHẮN MỚI
  // ==========================================
  if (req.method === 'POST') {
    const { message, sessionId, userEmail } = req.body;

    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: Trạm gác yêu cầu Email' });
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
          response_mode: "blocking",
          conversation_id: sessionId || "",
          user: userEmail 
        })
      });

      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data.message || 'Lỗi từ Dify' });
      
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Lỗi kết nối máy chủ AI' });
    }
  }

  // CHẶN CÁC METHOD KHÁC
  return res.status(405).json({ error: 'Method Not Allowed' });
}
