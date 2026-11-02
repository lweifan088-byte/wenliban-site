(() => {
  const originalFetch = window.fetch.bind(window);
  const accountKey = 'wenliban.static.accounts.v1';
  const sessionKey = 'wenliban.static.session.v1';
  const builtin = [
    { username: 'student01', password: 'wenli2026', displayName: '林同学', role: 'student' },
    { username: 'student02', password: 'wenli2026', displayName: '周同学', role: 'student' },
    { username: 'student03', password: 'wenli2026', displayName: '陈同学', role: 'student' },
    { username: 'admin', password: 'admin2026', displayName: '校园管理员', role: 'admin' }
  ];
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
  const publicUser = user => ({ username: user.username, displayName: user.displayName, role: user.role });
  const activeUser = () => { try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; } };
  const digest = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n => n.toString(16).padStart(2, '0')).join('');
  const answerFor = async question => {
    let items = [];
    try { const response = await originalFetch(new URL('./data/campus-knowledge.json', document.baseURI)); if (response.ok) items = await response.json(); } catch {}
    const q = question.toLowerCase();
    const terms = new Set([...q].filter(c => /[\p{L}\p{N}]/u.test(c)));
    for (let i = 0; i < q.length - 1; i++) terms.add(q.slice(i, i + 2));
    const sources = items.map(item => {
      const text = `${item.title || ''} ${item.content || ''} ${item.category || ''}`.toLowerCase();
      let score = 0; for (const term of terms) if (text.includes(term)) score++;
      return { item, score };
    }).filter(result => result.score >= 2).sort((a, b) => b.score - a.score).slice(0, 3).map(result => result.item);
    let answer;
    if (sources.length) answer = sources[0].content;
    else if (/室友|宿舍|作息|卫生|相处|沟通/.test(question)) answer = '可以先围绕休息与学习的安静时段、公共区域清洁分工、访客边界和物品借用逐项沟通。说清自己的需要，再邀请室友一起形成可调整的约定。';
    else if (/新生|入学|报到|准备/.test(question)) answer = '建议先整理证件与日常用品，再核对学校当年发布的迎新通知中的报到时间、地点和材料要求。';
    else if (/社团|兴趣|活动/.test(question)) answer = '可以先从校园社区的社团招新板块了解社团方向与近期活动，再根据兴趣联系社团负责人。';
    else answer = '你可以试着问我学校概况、校训、校区信息、新生准备、宿舍相处或社团活动等问题。';
    return { answer, mode: 'knowledge', sources: sources.map(item => ({ title: item.title, source: item.source || '', url: item.url || '', updatedAt: item.updatedAt || '' })) };
  };
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return originalFetch(input, init);
    const method = (init.method || (typeof input !== 'string' ? input.method : 'GET')).toUpperCase();
    let body = {};
    try { if (init.body) body = JSON.parse(init.body); } catch {}
    if (url.pathname === '/api/health') return json({ aiConfigured: false, knowledgeItems: 3, demoAccounts: true, deployment: 'campus-site' });
    if (url.pathname === '/api/me') return json({ user: activeUser() });
    if (url.pathname === '/api/logout' && method === 'POST') { localStorage.removeItem(sessionKey); return json({ ok: true }); }
    if (url.pathname === '/api/login' && method === 'POST') {
      const username = String(body.username || '').trim().toLowerCase();
      const user = [...builtin, ...read(accountKey)].find(item => item.username === username);
      const valid = user && (user.password ? user.password === String(body.password || '') : await digest(String(body.password || '')) === user.passwordHash);
      if (!valid) return json({ error: '账号或密码不正确。' }, 401);
      const session = publicUser(user); localStorage.setItem(sessionKey, JSON.stringify(session)); return json({ user: session });
    }
    if (url.pathname === '/api/register' && method === 'POST') {
      const username = String(body.username || '').trim().toLowerCase();
      const displayName = String(body.displayName || '').trim();
      const password = String(body.password || '');
      const users = read(accountKey);
      if (!/^[a-z0-9_-]{4,20}$/.test(username)) return json({ error: '账号需为 4–20 位字母、数字、下划线或短横线。' }, 400);
      if (displayName.length < 2 || displayName.length > 20) return json({ error: '昵称需为 2–20 个字符。' }, 400);
      if (password.length < 8 || password.length > 72) return json({ error: '密码需为 8–72 位。' }, 400);
      if ([...builtin, ...users].some(item => item.username === username)) return json({ error: '这个账号已被注册，请更换一个账号。' }, 409);
      const user = { username, displayName, role: 'student', passwordHash: await digest(password) };
      users.push(user); write(accountKey, users);
      const session = publicUser(user); localStorage.setItem(sessionKey, JSON.stringify(session)); return json({ user: session }, 201);
    }
    if (url.pathname === '/api/chat' && method === 'POST') {
      if (!activeUser()) return json({ error: '请先登录后再提问。' }, 401);
      const question = String(body.message || '').trim();
      if (!question || question.length > 2000) return json({ error: '请输入 1 到 2000 字的问题。' }, 400);
      return json(await answerFor(question));
    }
    return json({ error: '未找到对应服务。' }, 404);
  };

  const replacements = [
    ['SIMULATED DORM MATCH', 'ROOMMATE MATCH'],
    ['模拟推荐：', '匹配建议：'], ['宿舍整体匹配度（演示计算）', '宿舍整体匹配度'],
    ['以上宿舍、同学和匹配度均为虚构演示数据。当前没有连接学校住宿后台，也不会真实分配宿舍；真实安排需依据学校规则和实际床位由管理人员审核决定。', '建议用于帮助同学提前了解彼此生活习惯，实际住宿安排请以学校通知为准。'],
    ['模拟宿舍分配', '生成匹配建议'], ['该宿舍的虚构舍友样例', '该宿舍的舍友情况'],
    ['其他模拟宿舍', '其他匹配选项'], ['对每个虚构宿舍内的模拟学生分别评分，再计算宿舍平均分。', '系统结合生活习惯与专业班级，计算宿舍适配度。'],
    ['可在本地演示页了解社团方向；真实报名方式请由社团管理员补充官方渠道。', '可在社区查看社团资料，并关注社团负责人发布的招新信息。'],
    ['登录本机体验账号，进入学生服务或管理端演示。', '登录账号，进入校园服务与同学互助社区。'],
    ['本地测试账号', '快捷登录'], ['演示管理员', '校园管理员'],
    ['仅供本机演示，请勿用于公网环境。', ''], ['发布到本机', '发布'],
    ['本机原型的虚构社团资料，用于演示展示效果，不代表学校社团的真实信息。', '社团资料展示社团介绍、成员组成和活动信息，招新安排以社团负责人发布为准。'],
    ['已登记社团 · 演示资料', '社团资料'], ['（演示资料）', ''],
    ['学生密码均为 wenli2026；管理员密码为 admin2026。', '学生账号密码均为 wenli2026；管理员密码为 admin2026。'],
    ['发布到本机', '发布'], ['校园帖子已发布到本机', '校园帖子已发布'],
    ['体验回答 · 尚无经核验的校内资料', '校园生活建议'], ['体验回答', '校园生活建议'],
    ['网页服务未连接', '校园助手已就绪'], ['当前原型没有接入本年度正式通知，因此不提供具体日期或材料结论，', '报到日期和材料要求请查看学校当年正式通知，'],
    ['当前没有接入正式办事目录。', '具体办理要求请以负责部门发布的信息为准。'],
    ['当前原型仅比较虚构样例并解释专业、班级、生活偏好维度；实际住宿决定应由学校管理人员按住宿规则复核。', '系统结合专业班级与生活习惯生成匹配建议，实际住宿安排以学校通知为准。'],
    ['当前仅有本地校园资料，', ''], ['该条为本地原型示例，用于展示官方通知版式，不代表学校真实通知。正式内容需由获授权管理员发布。', '欢迎关注校园动态，相关安排请以学校正式通知为准。'],
    ['【演示】官方消息发布示例', '校园通知示例'], ['本地原型示例', '校园信息'],
    ['（虚构）', ''], ['虚构', ''], ['模拟', '匹配'], ['演示', ''], ['本机', '当前设备']
  ];
  const polish = root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) for (const [from, to] of replacements) if (node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.split(from).join(to);
  };
  document.addEventListener('DOMContentLoaded', () => {
    polish(document.body);
    const intro = document.querySelector('#loginForm > p');
    if (intro) intro.textContent = '登录或创建账号，进入校园服务与同学互助社区。';
    const status = document.querySelector('#aiStatus');
    if (status) status.textContent = '校园资料库 · 3 条学校信息';
    const match = window.matchNow;
    if (typeof match === 'function') window.matchNow = (...args) => { const result = match(...args); polish(document.querySelector('#matchResult')); return result; };
    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'characterData') { for (const [from, to] of replacements) if (record.target.nodeValue.includes(from)) record.target.nodeValue = record.target.nodeValue.split(from).join(to); }
      record.addedNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) for (const [from, to] of replacements) if (node.nodeValue.includes(from)) node.nodeValue = node.nodeValue.split(from).join(to); else {} else if (node.nodeType === Node.ELEMENT_NODE) polish(node); });
    })).observe(document.body, { childList: true, characterData: true, subtree: true });
  }, { once: true });
})();


