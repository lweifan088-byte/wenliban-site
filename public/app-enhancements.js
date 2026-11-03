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

  // Register students, teachers and club accounts through the protected server API.
  const loginCard = $('#loginForm');
  if (loginCard && !$('#registerToggle')) loginCard.insertAdjacentHTML('beforeend', `
    <button class="register-toggle" type="button" id="registerToggle">注册文理伴账号</button>
    <div class="register-fields" id="registerFields">
      <label for="registerRole">注册身份</label><select id="registerRole"><option value="student">普通学生</option><option value="admin">管理老师</option><option value="club">社团官方</option></select>
      <label for="registerUser" id="registerIdLabel">学号</label><input id="registerUser" autocomplete="username" minlength="4" maxlength="20" placeholder="输入学号">
      <div id="registerClubNameWrap" hidden><label for="registerClubName">社团名称</label><input id="registerClubName" maxlength="40" placeholder="填写注册社团的名称"></div>
      <label for="registerName" id="registerNameLabel">校园昵称</label><input id="registerName" maxlength="20" placeholder="例如：小文同学">
      <label for="registerPassword">设置密码</label><input id="registerPassword" type="password" autocomplete="new-password" minlength="8" maxlength="72" placeholder="至少 8 位">
      <small class="register-help" id="registerHelp">学生使用学号注册。请妥善保管密码。</small>
      <button type="button" id="registerSubmit">注册并进入校园</button>
    </div>`);
  if (loginCard) {
    const intro = loginCard.querySelector(':scope > p');
    if (intro) intro.textContent = '学生、管理老师与社团官方可分别注册账号。';
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
  $('#registerRole')?.addEventListener('change', event => {
    const role = event.target.value;
    const labels = {student:['学号','输入学号','校园昵称','学生使用学号注册。请妥善保管密码。'],admin:['工号','输入工号','教师姓名','管理老师使用工号注册。请妥善保管密码。'],club:['社团码','输入社团码','社团名称','社团官方账号由社团负责人管理；社团名称用于公开主页。']};
    const [label, placeholder, name, help] = labels[role];
    $('#registerIdLabel').textContent = label;
    $('#registerUser').placeholder = placeholder;
    $('#registerNameLabel').textContent = name;
    $('#registerClubNameWrap').hidden = role !== 'club';
    $('#registerNameLabel').hidden = role === 'club';
    $('#registerName').hidden = role === 'club';
    $('#registerHelp').textContent = help;
  });
  $('#registerSubmit')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const error = $('#loginError');
    const username = $('#registerUser').value.trim().toLowerCase();
    const role = $('#registerRole').value;
    const clubName = $('#registerClubName').value.trim();
    const displayName = role === 'club' ? clubName : $('#registerName').value.trim();
    const password = $('#registerPassword').value;
    error.textContent = '正在创建账号…'; button.disabled = true;
    try {
      const response = await fetch('/api/register', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,displayName,password,role,clubName})});
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
  let sharedCommunityReady = false;
  if (originalActivateUser) window.activateUser = user => {
    sharedCommunityReady = false;
    originalActivateUser(user);
    updateAdminLink();
    fetch('/api/community').then(response => response.ok ? response.json() : null).then(data => {
      if (!data || !Array.isArray(data.posts)) return;
      community = data;
      localStorage.setItem('wenliban.community.v1', JSON.stringify(community));
      sharedCommunityReady = true;
      Object.values(data.clubs||{}).forEach(hydrateClubDirectory);
      renderPosts(); renderAnnouncements(); renderAdmin(); renderFavorites();
      renderClubManager();
    }).catch(() => { sharedCommunityReady = true; });
  };
  const originalSaveCommunity = window.saveCommunity;
  if (originalSaveCommunity) window.saveCommunity = (...args) => {
    const result = originalSaveCommunity(...args);
    if (sharedCommunityReady && activeUser) fetch('/api/community', {method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(community)}).catch(() => {});
    return result;
  };
  const originalSave = window.save;
  if (originalSave) window.save = value => {
    const result = originalSave(value);
    if (activeUser && value?.profile) fetch('/api/profile', {method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({profile:value.profile})}).catch(() => {});
    return result;
  };
  const originalOpenUserProfile = window.openUserProfile;
  const originalUserProfileRenderer = window.renderUserProfile;
  if (originalUserProfileRenderer) window.renderUserProfile = (...args) => {
    const result=originalUserProfileRenderer(...args);
    const username=typeof selectedProfileUsername==='string'?selectedProfileUsername:'';
    const box=$('#publicProfile');
    let account={}; try { account=JSON.parse(localStorage.getItem(`wenliban.user.${username}`)||'{}'); } catch {}
    const meta=box?.querySelector('.fineprint');
    if(meta && account.role){
      const badge=document.createElement('span'); badge.className='tag account-role';
      badge.textContent=account.role==='admin'?'管理老师':account.role==='club'?'社团官方':'普通学生';
      meta.prepend(badge,document.createTextNode(' '));
    }
    return result;
  };
  if (originalOpenUserProfile) window.openUserProfile = (username, ...args) => {
    const result = originalOpenUserProfile(username, ...args);
    fetch(`/api/profile/${encodeURIComponent(username)}`).then(response => response.ok ? response.json() : null).then(data => {
      if (!data?.profile) return;
      const profileKey = `wenliban.user.${username}`;
      let local = {}; try { local = JSON.parse(localStorage.getItem(profileKey) || '{}'); } catch {}
      local.profile = data.profile; local.displayName = data.user?.displayName || username; local.role = data.user?.role || 'student';
      localStorage.setItem(profileKey, JSON.stringify(local));
      renderUserProfile?.();
    }).catch(() => {});
    return result;
  };
  const profileView = $('#view-profile');
  if (profileView && !$('#clubManagerCard')) profileView.insertAdjacentHTML('afterbegin', `<section class="card club-manager-card" id="clubManagerCard" hidden><div class="section-head"><div><h2>社团工作台</h2><p>维护社团公开资料、人员、招新条件和活动计划。</p></div><span class="tag">社团官方</span></div><div class="field"><label for="clubManagerAbout">社团介绍</label><textarea id="clubManagerAbout" maxlength="1000" rows="3"></textarea></div><div class="field"><label for="clubManagerRequirements">入社条件与申请材料</label><textarea id="clubManagerRequirements" maxlength="1000" rows="3" placeholder="例如：填写个人兴趣、可参与时间与联系方式"></textarea></div><div class="field"><label for="clubManagerOfficers">社团管理人员（每行：职务 | 账号 | 姓名）</label><textarea id="clubManagerOfficers" maxlength="3000" rows="4" placeholder="社长 | student01 | 林同学"></textarea></div><div class="field"><label for="clubManagerActivities">目前社团活动（每行一项）</label><textarea id="clubManagerActivities" maxlength="3000" rows="3"></textarea></div><div class="field"><label for="clubManagerPlans">社团计划（每行一项）</label><textarea id="clubManagerPlans" maxlength="3000" rows="3"></textarea></div><div class="actions"><button class="btn-primary" id="clubManagerSave" type="button">保存社团资料</button><button class="btn-line" id="clubManagerPost" type="button">发布社团帖子</button></div><div class="club-applications" id="clubApplications"></div></section>`);

  function currentClub() { return activeUser?.clubId ? community?.clubs?.[activeUser.clubId] : null; }
  function hydrateClubDirectory(club) {
    if (!club || !Array.isArray(clubDirectory)) return;
    let entry = clubDirectory.find(item => item.id === club.id);
    if (!entry) { entry = {id:club.id,name:club.name,founded:club.founded||'待补充',about:club.about||'',members:[]}; clubDirectory.push(entry); }
    entry.name = club.name || entry.name; entry.founded = club.founded || entry.founded; entry.about = club.about || '';
    const officers = Array.isArray(club.officers) ? club.officers : [];
    entry.members = officers.map(person => [`${person.title||'社团成员'} · ${person.name||person.username||''}`, person.username ? '查看主页' : '社团人员']);
  }
  function renderClubManager() {
    const card = $('#clubManagerCard');
    if (!card) return;
    const isClub = activeUser?.role === 'club';
    card.hidden = !isClub;
    const profileForm = profileView?.querySelector('.profile-form');
    if (profileForm) profileForm.hidden = isClub;
    if (!isClub) return;
    const club = currentClub();
    if (!club) return;
    hydrateClubDirectory(club);
    $('#clubManagerAbout').value = club.about || '';
    $('#clubManagerRequirements').value = club.requirements || '';
    $('#clubManagerOfficers').value = (club.officers||[]).map(p => `${p.title||''} | ${p.username||''} | ${p.name||''}`).join('\n');
    $('#clubManagerActivities').value = (club.activities||[]).join('\n');
    $('#clubManagerPlans').value = (club.plans||[]).join('\n');
    const applications = $('#clubApplications');
    applications.innerHTML = `<h3>入社申请</h3>${(club.applications||[]).map(item=>`<article class="club-application"><b>${escText(item.displayName||item.username)} · ${item.status==='pending'?'待处理':item.status==='accepted'?'已通过':'未通过'}</b><p>${escText(item.content)}</p><small>${escText(new Date(item.createdAt).toLocaleString())}</small>${item.status==='pending'?`<div class="actions"><button type="button" data-review-application="${escText(item.id)}" data-status="accepted">通过</button><button type="button" data-review-application="${escText(item.id)}" data-status="rejected">暂不通过</button><button type="button" data-user-profile="${escText(item.username)}">查看主页</button></div>`:''}</article>`).join('')||'<p class="fineprint">暂时没有待处理的申请。</p>'}`;
  }
  $('#clubManagerSave')?.addEventListener('click', () => {
    const club = currentClub(); if (!club) return;
    const officers = $('#clubManagerOfficers').value.split(/\r?\n/).map(line => line.split('|').map(value=>value.trim())).filter(parts=>parts.some(Boolean)).slice(0,30).map(([title,username,name])=>({title:title||'社团成员',username:(username||'').toLowerCase(),name:name||username||'社团成员'}));
    const list = selector => $(selector).value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean).slice(0,30);
    Object.assign(club,{about:$('#clubManagerAbout').value.trim(),requirements:$('#clubManagerRequirements').value.trim(),officers,activities:list('#clubManagerActivities'),plans:list('#clubManagerPlans')});
    saveCommunity(); hydrateClubDirectory(club); renderClubManager(); toast('社团资料已保存');
  });
  $('#clubApplications')?.addEventListener('click', async event => {
    const button=event.target.closest('[data-review-application]'); if(!button)return;
    try{const response=await fetch(`/api/clubs/application/${encodeURIComponent(button.dataset.reviewApplication)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status:button.dataset.status})});const data=await response.json();if(!response.ok)throw new Error(data.error||'操作失败');const current=community?.clubs?.[activeUser?.clubId];const item=current?.applications?.find(entry=>entry.id===button.dataset.reviewApplication);if(item)item.status=button.dataset.status;saveCommunity();renderClubManager();toast('申请状态已更新')}catch(error){toast(error.message||'操作失败')}
  });
  $('#clubManagerPost')?.addEventListener('click', () => {
    const club=currentClub(); if(!club)return;
    $('#newPost')?.click();
    queueMicrotask(()=>{ $('#postCategory').value='社团招新'; $('#postCategory').disabled=true; $('#postOrg').style.display='block'; $('#postOrg').value=club.name; $('#postOrg').disabled=true; $('#postModal h2').textContent='发布社团动态'; });
  });
  document.addEventListener('click', event => {
    const post = event.target.closest('#newPost');
    if (post && activeUser?.role === 'club') setTimeout(() => { const club=currentClub(); if(club){ $('#postCategory').value='社团招新'; $('#postCategory').disabled=true; $('#postOrg').style.display='block'; $('#postOrg').value=club.name; $('#postOrg').disabled=true; $('#postModal h2').textContent='发布社团动态'; } }, 0);
  }, true);
  const previousClubRenderer = window.renderClubProfile;
  if (previousClubRenderer) window.renderClubProfile = (...args) => {
    const result=previousClubRenderer(...args);
    const club=community?.clubs?.[selectedClubId];
    const card=$('#clubProfile .club-public-card');
    if(!club||!card)return result;
    const officers=(club.officers||[]).map(p=>`<button class="club-person" type="button" ${p.username?`data-user-profile="${escText(p.username)}"`:''}><b>${escText(p.title||'社团成员')}</b><span>${escText(p.name||p.username||'')}</span>${p.username?'<small>查看主页 ↗</small>':''}</button>`).join('');
    const applyButton=activeUser?.role==='student'?`<button class="btn-primary" type="button" data-club-apply="${escText(club.id)}">申请加入社团</button>`:'';
    const sections=`<section class="club-live-info"><h2 class="club-section-title">入社条件与申请材料</h2><p>${escText(club.requirements||'暂未设置申请条件。')}</p><h2 class="club-section-title">社团人员</h2><div class="club-people">${officers||'<p class="fineprint">社团管理人员信息待更新。</p>'}</div><h2 class="club-section-title">目前社团活动</h2><ul>${(club.activities||[]).map(x=>`<li>${escText(x)}</li>`).join('')||'<li>近期活动信息待更新</li>'}</ul><h2 class="club-section-title">社团计划</h2><ul>${(club.plans||[]).map(x=>`<li>${escText(x)}</li>`).join('')||'<li>社团计划待更新</li>'}</ul>${applyButton}</section>`;
    card.insertAdjacentHTML('beforeend',sections);
    return result;
  };
  $('#clubProfile')?.addEventListener('click', async event => {
    const button=event.target.closest('[data-club-apply]'); if(!button)return;
    const clubId=button.dataset.clubApply;
    const content=prompt('请按社团要求填写入社申请资料：'); if(content===null)return;
    try{const response=await fetch('/api/clubs/apply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({clubId,content})});const data=await response.json();if(!response.ok)throw new Error(data.error||'提交失败');toast('入社申请已提交')}catch(error){toast(error.message||'提交申请失败')}
  });
  const originalClubAccept = window.activateUser;
  if (originalClubAccept) window.activateUser = user => { originalClubAccept(user); setTimeout(renderClubManager, 0); };
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
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();

