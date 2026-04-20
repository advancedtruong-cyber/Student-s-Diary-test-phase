// File: api/chat.js
export default async function handler(req, res) {
  const { DIFY_API_KEY } = process.env;

  // LẤY LỊCH SỬ CHAT (Phương thức GET)
  if (req.method === 'GET') {
    const { userEmail, conversationId } = req.query;

    if (!userEmail || !conversationId) {
      return res.status(400).json({ error: 'Thiếu thông tin để lấy lịch sử' });
    }

    try {
      const response = await fetch(`https://api.dify.ai/v1/messages?user=${userEmail}&conversation_id=${conversationId}&limit=100`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${DIFY_API_KEY}` }
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: 'Không tải được lịch sử' });
    }
  }

  // GỬI TIN NHẮN MỚI (Phương thức POST)
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

  return res.status(405).json({ error: 'Method Not Allowed' });
}
