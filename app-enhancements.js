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
      <label for="registerRole">注册身份</label><select id="registerRole"><option value="student">普通学生</option><option value="admin">管理老师</option><option value="club">社团官方</option></select><div id="registerInviteWrap" hidden><label for="registerInvite">管理员邀请码</label><input id="registerInvite" type="password" autocomplete="off" placeholder="向管理员获取邀请码"></div>
      <label for="registerUser" id="registerIdLabel">学号</label><input id="registerUser" autocomplete="username" minlength="4" maxlength="20" placeholder="输入学号">
      <div id="registerClubNameWrap" hidden><label for="registerClubName">社团名称</label><input id="registerClubName" maxlength="40" placeholder="填写注册社团的名称"></div>
      <label for="registerName" id="registerNameLabel">校园昵称</label><input id="registerName" maxlength="20" placeholder="例如：小文同学">
      <label for="registerPassword">设置密码</label><input id="registerPassword" type="password" autocomplete="new-password" minlength="10" maxlength="72" placeholder="至少 10 位">
      <small class="register-help" id="registerHelp">学生使用学号注册。请妥善保管密码。</small>
      <button type="button" id="registerSubmit">注册并进入校园</button>
    </div>`);
  if (loginCard) {
    const intro = loginCard.querySelector(':scope > p');
    if (intro) intro.textContent = '学生可直接注册；管理老师需邀请码，社团账号经管理员审核后启用。';
    fetch('/api/health').then(response => response.json()).then(info => { if (!info.demoAccounts) $('.demo-accounts')?.setAttribute('hidden', ''); }).catch(() => {});
  }

  const mobileNav = $('#mobileNav');
  mobileNav?.addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (button) window.go?.(button.dataset.view);
  });

  document.addEventListener('click', async event => {
    const report = event.target.closest('[data-report]');
    if (!report || window.WENLIBAN_STATIC_MODE) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const reason = prompt('请说明举报原因（至少 5 个字）：');
    if (reason === null) return;
    try {
      const response = await fetch('/api/reports', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({postId:report.dataset.report,reason})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '举报提交失败');
      toast('举报已提交，管理老师会查看处理');
    } catch (error) { toast(error.message || '举报提交失败，请稍后再试'); }
  }, true);

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
    $('#registerInviteWrap').hidden = role !== 'admin';
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
      const response = await fetch('/api/register', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username,displayName,password,role,clubName,adminInvite:$('#registerInvite').value})});
      const data = await response.json();
      if (response.status === 202 && data.pending) { error.textContent=data.message||'申请已提交，等待管理员审核。'; return; }
      if (!response.ok) throw new Error(data.error || '注册失败');
      window.activateUser?.(data.user);
    } catch (failure) { error.textContent = failure.message || '注册失败，请稍后重试。'; }
    finally { button.disabled = false; }
  });

  // Give administrators a mobile entry point from the profile page, keeping the tab bar at four items.
  const adminPanel = $('#adminPanel');
  if(adminPanel&&!$('#pendingClubPanel'))adminPanel.insertAdjacentHTML('afterbegin','<section class="card" id="pendingClubPanel" style="margin:12px 0"><div class="section-head"><div><h2>社团账号审核</h2><p>通过后社团账号即可登录并维护公开资料。</p></div><span class="tag">管理老师</span></div><div id="pendingClubList" class="activity"><span class="fineprint">正在读取待审核申请…</span></div></section><section class="card" id="contentReportPanel" style="margin:12px 0"><div class="section-head"><div><h2>内容举报处理</h2><p>查看学生反馈并登记处理结果。</p></div></div><div id="contentReportList" class="activity"><span class="fineprint">正在读取举报…</span></div></section><section class="card" id="auditTrailPanel" style="margin:12px 0"><div class="section-head"><div><h2>管理操作记录</h2><p>记录账号开通、资料修改与审批动作。</p></div></div><div id="auditTrailList" class="activity"><span class="fineprint">正在读取操作记录…</span></div></section>');
  async function refreshAdminGovernance(){
    if(activeUser?.role!=='admin')return;
    const list=$('#pendingClubList'),audit=$('#auditTrailList'),reports=$('#contentReportList');
    try{const response=await fetch('/api/admin/pending-clubs');const data=await response.json();if(!response.ok)throw new Error(data.error);list.innerHTML=(data.users||[]).map(user=>`<div class="activity-item"><div class="activity-dot">✦</div><div style="flex:1"><b>${escText(user.clubName||user.displayName||user.username)}</b><small>${escText(user.username)} · ${escText(user.createdAt||'待审核')}</small></div><button class="btn-primary" data-approve-club="${escText(user.username)}">通过</button></div>`).join('')||'<span class="fineprint">当前没有待审核的社团账号。</span>';}catch{list.innerHTML='<span class="fineprint">当前服务没有返回待审核账号。</span>'}
    try{const response=await fetch('/api/admin/audit');const data=await response.json();audit.innerHTML=(data.entries||[]).slice(0,8).map(item=>`<div class="activity-item"><div class="activity-dot">◷</div><div><b>${escText(item.action)}</b><small>${escText(item.actor)} · ${escText(item.targetType)} ${escText(item.targetId)} · ${escText(item.createdAt||'')}</small></div></div>`).join('')||'<span class="fineprint">暂时没有管理操作记录。</span>';}catch{audit.innerHTML='<span class="fineprint">操作记录暂不可用。</span>'}
    try{const response=await fetch('/api/admin/reports');const data=await response.json();reports.innerHTML=(data.reports||[]).map(item=>`<div class="request-row"><div style="flex:1"><b>${escText(item.post?.title||'帖子已删除')} · ${escText(item.status==='pending'?'待处理':item.status==='resolved'?'已处理':'已驳回')}</b><small>${escText(item.reporter)} · ${escText(item.reason)} · ${escText(item.createdAt||'')}</small></div>${item.status==='pending'?`<div class="request-actions"><button class="btn-primary" data-review-report="${escText(item.id)}" data-report-status="resolved">已处理</button><button class="btn-line" data-review-report="${escText(item.id)}" data-report-status="dismissed">不成立</button></div>`:''}</div>`).join('')||'<span class="fineprint">当前没有举报记录。</span>';}catch{reports.innerHTML='<span class="fineprint">举报处理暂不可用。</span>'}
  }
  adminPanel?.addEventListener('click',async event=>{const approval=event.target.closest('[data-approve-club]'),review=event.target.closest('[data-review-report]');if(!approval&&!review)return;const button=approval||review;button.disabled=true;try{const url=approval?`/api/admin/approve-club/${encodeURIComponent(button.dataset.approveClub)}`:`/api/admin/report/${encodeURIComponent(button.dataset.reviewReport)}`;const response=await fetch(url,{method:'POST',...(review?{headers:{'content-type':'application/json'},body:JSON.stringify({status:button.dataset.reportStatus})}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error||'操作失败');toast(approval?'社团账号已通过审核':'举报处理结果已保存');refreshAdminGovernance();}catch(error){toast(error.message||'操作失败')}finally{button.disabled=false}});
  const originalGo=window.go;
  if(originalGo)window.go=(view,...args)=>{const result=originalGo(view,...args);if(view==='admin')refreshAdminGovernance();return result};
  const originalAdminRenderer=window.renderAdmin;
  if(originalAdminRenderer)window.renderAdmin=(...args)=>{const result=originalAdminRenderer(...args);if(activeUser?.role==='admin')refreshAdminGovernance();return result};
  const profile = $('#view-profile');
  if (profile && !$('#profileAdminShortcut')) profile.insertAdjacentHTML('beforeend', '<div class="profile-admin-shortcut" id="profileAdminShortcut" hidden><button type="button">▣　打开管理端</button></div>');
  $('#profileAdminShortcut button')?.addEventListener('click', () => window.go?.('admin'));
  const updateAdminLink = () => { const link = $('#profileAdminShortcut'); if (link) link.hidden = activeUser?.role !== 'admin'; };
  const originalActivateUser = window.activateUser;
  let sharedCommunityReady = false;
  const seededAccounts = {'迎新志愿者':'club_volunteer','小文':'student01','住宿同学':'student02','文理伴小助手':'student03','摄影社':'club_photo','新同学':'student04','校园管理端':'admin'};
  const seededPeople = {'小文':'student01','住宿同学':'student02','小同学':'student02','周同学':'student02','陈同学':'student03','同学':'student01','林同学':'student01','杨同学':'student04','许同学':'student05','宋同学':'student06','赵同学':'student07','吴同学':'student08','郑同学':'student09','孙同学':'student10'};
  function attachSeedAccounts(data){
    let changed=false;
    for(const post of data?.posts||[]){
      if(!post.authorId&&seededAccounts[post.author]){post.authorId=seededAccounts[post.author];changed=true;}
      for(const comment of post.comments||[])if(!comment.authorId&&seededPeople[comment.author]){comment.authorId=seededPeople[comment.author];changed=true;}
    }
    return changed;
  }
  let accountSaveTimer, profileSaveTimer;
  const saveAccountState = value => {
    clearTimeout(accountSaveTimer);
    const snapshot = JSON.stringify(value || {});
    accountSaveTimer = setTimeout(async () => {
      try {
        const response = await fetch('/api/account-state', {method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({state:JSON.parse(snapshot)})});
        if (response.status === 401) window.logout?.();
      } catch {}
    }, 250);
  };
  if (originalActivateUser) window.activateUser = user => {
    sharedCommunityReady = false;
    originalActivateUser(user);
    updateAdminLink();
    if (!window.WENLIBAN_STATIC_MODE) fetch('/api/account-state').then(response => response.ok ? response.json() : null).then(data => {
      if (!data) return;
      if (data.state && Object.keys(data.state).length) {
        state = data.state;
        key = `wenliban.user.${user.username}`;
        localStorage.setItem(key, JSON.stringify(state));
        prefs = {...(state.prefs || {})}; qaCount = Number(state.qaCount || 0);
        $('#topName').textContent = state.profile?.name || user.displayName;
        $('#metric-qa').innerHTML = `${qaCount} <span>次</span>`;
        $('#metric-match').textContent = state.prefs && Object.keys(state.prefs).length ? '已体验' : '未开始';
        renderProfile(); renderFavorites(); renderActivity(); updateOptions();
      } else saveAccountState(state);
    }).catch(() => {});
    fetch('/api/community').then(response => response.ok ? response.json() : null).then(data => {
      if (!data || !Array.isArray(data.posts)) return;
      const migratedSeedAccounts=attachSeedAccounts(data);
      community = data;
      localStorage.setItem('wenliban.community.v1', JSON.stringify(community));
      sharedCommunityReady = true;
      Object.values(data.clubs||{}).forEach(hydrateClubDirectory);
      renderPosts(); renderAnnouncements(); renderAdmin(); renderFavorites();
      renderClubManager();
      if(migratedSeedAccounts)saveCommunity();
    }).catch(() => { sharedCommunityReady = true; });
  };
  const originalSaveCommunity = window.saveCommunity;
  let communityWriteChain = Promise.resolve();
  if (originalSaveCommunity) window.saveCommunity = (...args) => {
    const result = originalSaveCommunity(...args);
    if (sharedCommunityReady && activeUser && !window.WENLIBAN_STATIC_MODE) {
      const snapshot = JSON.stringify(community);
      communityWriteChain = communityWriteChain.then(async () => {
        const response = await fetch('/api/community', {method:'PUT',headers:{'content-type':'application/json'},body:snapshot});
        if (response.status === 401) { await window.logout?.(); return; }
        if (!response.ok) { const data = await response.json().catch(() => ({})); toast(data.error || '内容未能保存到校园服务，请重试。'); }
      }).catch(() => toast('内容未能保存到校园服务，请检查网络后重试。'));
    }
    return result;
  };
  const originalSave = window.save;
  if (originalSave) window.save = value => {
    const result = originalSave(value);
    if (activeUser && !window.WENLIBAN_STATIC_MODE) {
      saveAccountState(value);
      clearTimeout(profileSaveTimer);
      const profile = JSON.stringify(value?.profile || {});
      profileSaveTimer = setTimeout(() => fetch('/api/profile', {method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({profile:JSON.parse(profile)})}).catch(() => {}), 300);
    }
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
    const organization=clubByAccount?.(username);
    if(organization){openClubProfile(organization.id,args[0]||'post');return;}
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
  if (profileView && !$('#clubManagerCard')) profileView.insertAdjacentHTML('afterbegin', `<section class="card club-manager-card" id="clubManagerCard" hidden><div class="section-head"><div><h2>社团工作台</h2><p>维护社团公开资料、人员、招新条件和活动计划。</p></div><span class="tag">社团官方</span></div><div class="field"><label for="clubManagerAbout">社团介绍</label><textarea id="clubManagerAbout" maxlength="1000" rows="3"></textarea></div><div class="field"><label for="clubManagerRequirements">入社条件与申请材料</label><textarea id="clubManagerRequirements" maxlength="1000" rows="3" placeholder="例如：填写个人兴趣、可参与时间与联系方式"></textarea></div><div class="field"><label for="clubManagerOfficers">社团管理人员（每行：职务 | 账号 | 姓名 | 人员分组）</label><textarea id="clubManagerOfficers" maxlength="3000" rows="4" placeholder="社长 | student01 | 林同学 | 社团负责人"></textarea></div><div class="field"><label for="clubManagerActivities">目前社团活动（每行一项）</label><textarea id="clubManagerActivities" maxlength="3000" rows="3"></textarea></div><div class="field"><label for="clubManagerPlans">社团计划（每行一项）</label><textarea id="clubManagerPlans" maxlength="3000" rows="3"></textarea></div><div class="actions"><button class="btn-primary" id="clubManagerSave" type="button">保存社团资料</button><button class="btn-line" id="clubManagerPost" type="button">发布社团帖子</button></div><div class="club-applications" id="clubApplications"></div></section>`);

  function currentClub() { return activeUser?.clubId ? community?.clubs?.[activeUser.clubId] : null; }
  function hydrateClubDirectory(club) {
    if (!club || !Array.isArray(clubDirectory)) return;
    let entry = clubDirectory.find(item => item.id === club.id);
    if (!entry) { entry = {id:club.id,name:club.name,founded:club.founded||'待补充',about:club.about||'',members:[]}; clubDirectory.push(entry); }
    entry.name = club.name || entry.name; entry.accountUsername=club.owner||entry.accountUsername; entry.founded = club.founded || entry.founded; entry.about = club.about || '';
    const officers = Array.isArray(club.officers) ? club.officers : [];
    if(officers.length){const known=new Map((entry.people||[]).map(person=>[person.username,person]));for(const person of officers)known.set(person.username,{...known.get(person.username),...person,group:person.group||known.get(person.username)?.group||'社团管理人员'});entry.people=[...known.values()];if(!entry.members?.length)entry.members=[['社团管理人员',`${entry.people.length} 人`]];}
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
    $('#clubManagerOfficers').value = (club.officers||[]).map(p => `${p.title||''} | ${p.username||''} | ${p.name||''} | ${p.group||'社团管理人员'}`).join('\n');
    $('#clubManagerActivities').value = (club.activities||[]).join('\n');
    $('#clubManagerPlans').value = (club.plans||[]).join('\n');
    const applications = $('#clubApplications');
    applications.innerHTML = `<h3>入社申请</h3>${(club.applications||[]).map(item=>`<article class="club-application"><b>${escText(item.displayName||item.username)} · ${item.status==='pending'?'待处理':item.status==='accepted'?'已通过':'未通过'}</b><p>${escText(item.content)}</p><small>${escText(new Date(item.createdAt).toLocaleString())}</small>${item.status==='pending'?`<div class="actions"><button type="button" data-review-application="${escText(item.id)}" data-status="accepted">通过</button><button type="button" data-review-application="${escText(item.id)}" data-status="rejected">暂不通过</button><button type="button" data-user-profile="${escText(item.username)}">查看主页</button></div>`:''}</article>`).join('')||'<p class="fineprint">暂时没有待处理的申请。</p>'}`;
  }
  $('#clubManagerSave')?.addEventListener('click', () => {
    const club = currentClub(); if (!club) return;
    const officers = $('#clubManagerOfficers').value.split(/\r?\n/).map(line => line.split('|').map(value=>value.trim())).filter(parts=>parts.some(Boolean)).slice(0,30).map(([title,username,name,group])=>({title:title||'社团成员',username:(username||'').toLowerCase(),name:name||username||'社团成员',group:group||'社团管理人员'}));
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
    const club=community?.clubs?.[selectedClubId]||clubById(selectedClubId);
    const card=$('#clubProfile .club-public-card');
    if(!club||!card)return result;
    const directoryClub=clubById(club.id);
    const officers=(club.officers||[]).map(p=>({group:p.group||'社团管理人员',...p}));
    const people=Array.isArray(club.people)&&club.people.length?club.people:officers.length?officers:(directoryClub?.people||[]);
    const members=Array.isArray(club.members)&&club.members.length?club.members:(directoryClub?.members||[]);
    const memberBox=card.querySelector('.club-members');
    if(memberBox){memberBox.innerHTML=members.map(([role,count])=>`<div class="club-roster-row"><span>${escText(role)}</span><button type="button" data-roster-group="${escText(club.id)}" data-roster-role="${escText(role)}"><b>${escText(count)}</b><small>查看人员 ↗</small></button></div>`).join('');memberBox.insertAdjacentHTML('afterend','<div class="club-roster-details" id="clubRosterDetails" hidden></div>');}
    const namedPeople=people.map(p=>`<button class="club-person" type="button" ${p.username?`data-user-profile="${escText(p.username)}"`:''}><b>${escText(p.title||'社团成员')}</b><span>${escText(p.name||p.username||'')}</span>${p.username?'<small>查看主页 ↗</small>':''}</button>`).join('');
    const applyButton=activeUser?.role==='student'?`<button class="btn-primary" type="button" data-club-apply="${escText(club.id)}">申请加入社团</button>`:'';
    const sections=`<section class="club-live-info"><h2 class="club-section-title">入社条件与申请材料</h2><p>${escText(club.requirements||'社团尚未设置申请资料要求。')}</p><h2 class="club-section-title">社团管理人员</h2><div class="club-people">${namedPeople||'<p class="fineprint">社团管理人员信息待更新。</p>'}</div><h2 class="club-section-title">目前社团活动</h2><ul>${(club.activities||[]).map(x=>`<li>${escText(x)}</li>`).join('')||'<li>近期活动信息待更新</li>'}</ul><h2 class="club-section-title">社团计划</h2><ul>${(club.plans||[]).map(x=>`<li>${escText(x)}</li>`).join('')||'<li>社团计划待更新</li>'}</ul>${applyButton}</section>`;
    card.insertAdjacentHTML('beforeend',sections);
    return result;
  };
  $('#clubProfile')?.addEventListener('click', async event => {
    const rosterButton=event.target.closest('[data-roster-group]');
    if(rosterButton){
      const club=community?.clubs?.[rosterButton.dataset.rosterGroup]||clubById(rosterButton.dataset.rosterGroup);
      const directoryClub=clubById(rosterButton.dataset.rosterGroup);
      const people=[...(directoryClub?.people||[]),...(club?.people||[]),...(club?.officers||[])].reduce((all,person)=>{const i=all.findIndex(item=>item.username&&item.username===person.username);if(i<0)all.push(person);else all[i]={...all[i],...person,group:person.group||all[i].group};return all},[]);
      const group=rosterButton.dataset.rosterRole;
      const list=people.filter(person=>(person.group||'社团管理人员')===group||group==='社团管理人员');
      const details=$('#clubRosterDetails');
      if(details){details.hidden=false;details.innerHTML=list.length?list.map(person=>`<button class="club-person" type="button" ${person.username?`data-user-profile="${escText(person.username)}"`:''}><b>${escText(person.title||group)}</b><span>${escText(person.name||person.username||'')}</span><small>${person.username?'点击查看主页':'社团成员'}</small></button>`).join(''):'<p class="fineprint">该分组暂未登记可查看的成员主页。</p>';}
      return;
    }
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

