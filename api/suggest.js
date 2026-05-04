// MiniMax Expert Advice API - Vercel Serverless Function
// POST /api/suggest
// Body: { role, tasks[], energy, coins, hp, date }
//
// ✅ 正确端点: https://api.minimaxi.com/v1/chat/completions
// ✅ 正确模型: MiniMax-M2.7
// ✅ 标准 OpenAI 兼容格式（messages 数组）

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { role, tasks = [], energy, coins, hp, date } = req.body;

    const systemPrompt = `你是 JARVIS，日本用户"Kim Kami"的人生仪表盘 AI 助手。你的专长是帮助用户理解"有意义的一天"。

当用户选择一个角色（如"创业者"），你会给出：
1. 这个角色今天的核心主题（一句话）
2. 3个角度的意义解读：
   - 🎯 角色角度：这个角色今天为什么要做这些事？
   - 🧰 工具角度：用户手头有什么资源/能力可以用？
   - 💎 意义角度：这些事情加起来，对用户的长期目标有什么贡献？
3. 优先级最高的1件事

注意：
- 始终用中文回复
- 温暖、简洁、有洞见
- 站在用户视角，不说教
- 150字以内`;

    const userPrompt = `用户角色：${role}
今天的任务：${tasks.length > 0 ? tasks.map(t => `- ${t.text || t}`).join('\n') : '暂无'}
当前能量：${energy ?? '未知'}/100
金币：${coins ?? 0}
HP：${hp ?? '未知'}
日期：${date || new Date().toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'long' })}

请给出今天的"有意义的一天"建议。`;

    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // ✅ 正确格式：OpenAI 兼容，api.minimaxi.com + MiniMax-M2.7
    const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.log('MiniMax error response:', err);
      return res.status(502).json({ error: `MiniMax API error: ${response.status}`, detail: err });
    }

    const data = await response.json();
    console.log('MiniMax raw response:', JSON.stringify(data));

    // MiniMax-M2.7 返回格式：data.choices[0].message.content
    const advice = data.choices?.[0]?.message?.content || null;

    if (!advice) {
      console.log('Could not parse advice from response, returning error');
      return res.status(502).json({ error: 'Unexpected response format', detail: JSON.stringify(data) });
    }

    return res.status(200).json({ advice });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
