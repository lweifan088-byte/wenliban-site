(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const escText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Home combines the two most requested first-run tasks without adding bottom tabs.
  const announcements = $('#homeAnnouncements');
  if (announcements && !$('#homeWorkbench')) announcements.insertAdjacentHTML('afterend', `
    <section class="home-workbench" id="homeWorkbench" aria-label="校园助手与舍友测评">
      <div class="home-workbench-head"><div><h2>今天想先解决什么？</h2><p>问校园助手，或者快速填写生活偏好，生成宿舍匹配模拟。</p></div><span class="home-spark">✦</span></div>
      <form class="home-assistant-form" id="homeAskForm"><input id="homeAskInput" maxlength="2000" placeholder="例如：新生入学前要准备些什么？" autocomplete="off"><button>问一下　↗</button></form>
      <div class="home-prompts"><button type="button" data-home-prompt="新生入学前要准备些什么？">新生准备</button><button type="button" data-home-prompt="宿舍生活有哪些沟通建议？">宿舍相处</button><button type="button" data-home-prompt="西安文理学院的校训是什么？">认识文理</button></div>
      <div class="home-answer" id="homeAskAnswer" aria-live="polite"></div>
      <div class="home-match"><div class="home-match-top"><div><b>室友默契小测</b><small>选两项即可查看模拟匹配；也可稍后补充专业与班级。</small></div><button type="button" id="homeMatchButton">生成建议</button></div>
        <div class="home-mini-options" aria-label="生活习惯"><div class="options" data-key="sleep"><button class="option" type="button" data-value="早睡">早睡</button><button class="option" type="button" data-value="适中">作息适中</button><button class="option" type="button" data-value="晚睡">晚睡</button></div><div class="options" data-key="clean"><button class="option" type="button" data-value="整洁">偏爱整洁</button><button class="option" type="button" data-value="适中">基本整洁</button><button class="option" type="button" data-value="随性">比较随性</button></div><div class="options" data-key="social"><button class="option" type="button" data-value="安静">偏安静</button><button class="option" type="button" data-value="适中">有事交流</button><button class="option" type="button" data-value="热闹">喜欢热闹</button></div></div>
        <div class="home-match-result" id="homeMatchResult"></div>
      </div>
    </section>`);

  // A small front-end registration panel uses the server's persistent student account API.
  const loginCard = $('#loginForm');
  if (loginCard && !$('#registerToggle')) loginCard.insertAdjacentHTML('beforeend', `
    <button class="register-toggle" type="button" id="registerToggle">新同学？注册一个学生账号</button>
    <div class="register-fields" id="registerFields"><label for="registerUser">登录账号</label><input id="registerUser" autocomplete="username" minlength="4" maxlength="20" placeholder="4–20 位字母或数字"><label for="registerName">校园昵称</label><input id="registerName" maxlength="20" placeholder="例如：小文同学"><label for="registerPassword">设置密码</label><input id="registerPassword" type="password" autocomplete="new-password" minlength="8" maxlength="72" placeholder="至少 8 位"><button type="button" id="registerSubmit">注册并进入校园</button></div>`);
  if (loginCard) {
    const intro = loginCard.querySelector(':scope > p');
    if (intro) intro.textContent = '登录或创建学生账号，进入校园服务与同学互助社区。';
    fetch('/api/health').then(response => response.json()).then(info => { if (!info.demoAccounts) $('.demo-accounts')?.setAttribute('hidden', ''); }).catch(() => {});
  }

  const mobileNav = $('#mobileNav');
  mobileNav?.addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (button) window.go?.(button.dataset.view);
  });

  $('#homeWorkbench')?.addEventListener('click', event => {
    const miniOption = event.target.closest('.home-mini-options .option');
    if (miniOption) {
      const group = miniOption.closest('.options');
      const matching = document.querySelector(`#view-roommate .options[data-key="${group.dataset.key}"] .option[data-value="${CSS.escape(miniOption.dataset.value)}"]`);
      matching?.click();
      window.updateOptions?.();
    }
    const prompt = event.target.closest('[data-home-prompt]');
    if (prompt) {
      $('#homeAskInput').value = prompt.dataset.homePrompt;
      $('#homeAskForm').requestSubmit();
    }
  });

  async function askFromHome(question) {
    const answer = $('#homeAskAnswer');
    if (!answer || !question.trim()) return;
    answer.classList.add('show');
    answer.textContent = '正在查找可用资料…';
    try {
      const response = await fetch('/api/chat', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:question.trim()})});
      const data = await response.json();
      if (response.status === 401) { answer.textContent = data.error || '请重新登录后继续提问。'; return; }
      if (!response.ok) throw new Error(data.error || '暂时无法回答');
      const sourceLabel = data.sources?.length ? `资料来源：${data.sources.map(item => item.title).join('、')}` : data.mode === 'ai' ? '一般建议 · 尚未找到校内资料' : data.mode === 'no-source' ? '未找到可核验的校内资料' : '体验回答';
      answer.innerHTML = `${escText(data.answer)}<small>${escText(sourceLabel)}</small>`;
      qaCount += 1;
      state.qaCount = qaCount;
      save(state);
      const metric = $('#metric-qa'); if (metric) metric.innerHTML = `${qaCount} <span>次</span>`;
    } catch (error) { answer.textContent = error.message || '暂时连不上问答服务，请稍后重试。'; }
  }

  $('#homeAskForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#homeAskInput');
    const question = input.value.trim();
    if (question) { askFromHome(question); input.value = ''; }
  });

  $('#homeMatchButton')?.addEventListener('click', () => {
    if (typeof window.matchNow !== 'function') return;
    window.matchNow();
    const original = $('#matchResult');
    const summary = $('#homeMatchResult');
    if (original && summary && !original.querySelector('.empty')) summary.innerHTML = original.innerHTML;
  });

  $('#registerToggle')?.addEventListener('click', () => $('#registerFields').classList.toggle('open'));
  $('#registerSubmit')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const error = $('#loginError');
    const username = $('#registerUser').value.trim().toLowerCase();
    const displayName = $('#registerName').value.trim();
    const password = $('#registerPassword').value;
    error.textContent = '正在创建账号…'; button.disabled = true;
    try {
      const response = await fetch('/api/register', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,displayName,password})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '注册失败');
      window.activateUser?.(data.user);
    } catch (failure) { error.textContent = failure.message || '注册失败，请稍后重试。'; }
    finally { button.disabled = false; }
  });

  // Give administrators a mobile entry point from the profile page, keeping the tab bar at four items.
  const profile = $('#view-profile');
  if (profile && !$('#profileAdminShortcut')) profile.insertAdjacentHTML('beforeend', '<div class="profile-admin-shortcut" id="profileAdminShortcut" hidden><button type="button">▣　打开管理端</button></div>');
  $('#profileAdminShortcut button')?.addEventListener('click', () => window.go?.('admin'));
  const updateAdminLink = () => { const link = $('#profileAdminShortcut'); if (link) link.hidden = activeUser?.role !== 'admin'; };
  const originalActivateUser = window.activateUser;
  if (originalActivateUser) window.activateUser = user => { originalActivateUser(user); updateAdminLink(); };
  const originalLogout = window.logout;
  if (originalLogout) window.logout = async (...args) => { await originalLogout(...args); updateAdminLink(); };
  document.addEventListener('click', event => { if (event.target.closest('#logoutBtn')) setTimeout(updateAdminLink, 0); });

  // Installable PWA: on supported browsers the visitor can add it to their home screen.
  let installPrompt;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; showInstallButton(); });
  function showInstallButton() {
    if (!$('#installPwaButton') && $('.welcome')) $('.welcome').insertAdjacentHTML('beforeend', '<button class="install-badge" type="button" id="installPwaButton">▣　安装到桌面</button>');
  }
  document.addEventListener('click', async event => {
    if (!event.target.closest('#installPwaButton')) return;
    if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installPwaButton')?.remove(); }
    else alert('可在浏览器菜单中选择“添加到主屏幕”或“安装应用”。');
  });
  $('#homeSearchForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const query = $('#homeSearchInput')?.value.trim();
    if (!query) return;
    window.go?.('forum');
    const search = $('#postSearch');
    if (search) { search.value = query; search.dispatchEvent(new Event('input', {bubbles:true})); }
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();

