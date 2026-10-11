const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let settings = {};
let versions = [];
let localVersions = [];
let account = { authenticated: false, profile: null };
let activeLoader = 'forge';
let activeContent = 'mods';

const loaderInfo = {
  optifine: { title: 'OptiFine', icon: 'sparkles', description: 'เพิ่มประสิทธิภาพ กราฟิก และรองรับ Shader Pack ระดับสูง', help: 'ดาวน์โหลด OptiFine Installer จากเว็บไซต์ทางการ จากนั้นเลือกไฟล์ .jar เพื่อติดตั้ง' },
  forge: { title: 'Forge', icon: 'anvil', description: 'Mod loader ยอดนิยมสำหรับม็อด Minecraft ระบบใหญ่และม็อดแพ็ค', help: 'ดาวน์โหลด Forge Installer จากเว็บไซต์ทางการ จากนั้นเลือกไฟล์ .jar เพื่อติดตั้ง' },
  fabric: { title: 'Fabric', icon: 'feather', description: 'Mod loader ที่เบา รวดเร็ว และอัปเดตไวเพื่อ FPS สูงสุด', help: 'ดาวน์โหลด Fabric Installer จากเว็บไซต์ทางการ จากนั้นเลือกไฟล์ .jar เพื่อติดตั้ง' }
};

const contentInfo = {
  mods: { title: 'Mods', description: 'จัดการม็อดเสริมการเล่นนามสกุล .jar', icon: 'puzzle' },
  resourcepacks: { title: 'Resource Packs', description: 'จัดการ Texture และ Resource Pack นามสกุล .zip', icon: 'package-open' },
  shaders: { title: 'Shaders', description: 'จัดการ Shader Pack แสงเงาเสมือนจริงนามสกุล .zip', icon: 'sun-medium' }
};

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

function setSelect(name, items, selected, onChange) {
  const root = document.querySelector(`[data-select="${name}"]`);
  if (!root) return;
  const hidden = root.querySelector('input');
  const trigger = root.querySelector('.select-trigger');
  const value = root.querySelector('.select-value');
  const content = root.querySelector('.select-content');
  const normalized = items.map(item => typeof item === 'string' ? { value: item, label: item } : item);
  const current = normalized.find(item => item.value === selected) || normalized[0];
  if (!current) return;
  hidden.value = current.value;
  value.textContent = current.label;

  // Live badge update for version selector
  if (name === 'version') {
    const typeTag = document.querySelector('#versionTypeTag');
    if (typeTag) {
      const vVal = String(current.value || '').toLowerCase();
      if (vVal.includes('optifine')) typeTag.textContent = 'OPTIFINE';
      else if (vVal.includes('forge')) typeTag.textContent = 'FORGE';
      else if (vVal.includes('fabric')) typeTag.textContent = 'FABRIC';
      else if (vVal.includes('snapshot')) typeTag.textContent = 'SNAPSHOT';
      else typeTag.textContent = 'RELEASE';
    }
  }

  content.innerHTML = normalized.map(item => `
    <button type="button" class="select-option ${item.value === current.value ? 'selected' : ''}" role="option" aria-selected="${item.value === current.value}" data-value="${item.value}">
      <span class="option-label-group">
        <i data-lucide="${item.icon || 'box'}" class="option-icon"></i>
        <span class="option-text">${item.label}</span>
      </span>
      ${item.meta ? `<small class="option-badge ${item.badgeClass || ''}">${item.meta}</small>` : ''}
      ${item.value === current.value ? '<i data-lucide="check" class="option-check"></i>' : ''}
    </button>
  `).join('');

  const close = () => { root.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
  const choose = item => {
    hidden.value = item.value;
    value.textContent = item.label;
    close();
    setSelect(name, normalized, item.value, onChange);
    if (onChange) onChange(item.value);
  };
  trigger.onclick = event => {
    event.stopPropagation();
    const willOpen = !root.classList.contains('open');
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    root.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
  };
  trigger.onkeydown = event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); trigger.click(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const index = Math.max(0, normalized.findIndex(item => item.value === hidden.value));
      const next = event.key === 'ArrowDown' ? Math.min(normalized.length - 1, index + 1) : Math.max(0, index - 1);
      choose(normalized[next]);
    }
  };
  content.querySelectorAll('.select-option').forEach(option => option.onclick = event => {
    event.stopPropagation();
    choose(normalized.find(item => item.value === option.dataset.value));
  });
  refreshIcons();
}

document.addEventListener('click', () => document.querySelectorAll('.custom-select.open').forEach(el => {
  el.classList.remove('open');
  el.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
}));

function toast(message, type, duration) {
  const el = $('#toast');
  if (!el) return;

  const msg = String(message || '');
  if (!type) {
    const text = msg.toLowerCase();
    if (text.includes('error') || text.includes('ไม่สำเร็จ') || text.includes('ผิดพลาด') || text.includes('ล้มเหลว') || text.includes('ไม่ได้') || text.includes('ต้องมี') || text.includes('ไม่ถูกต้อง') || text.includes('ไม่พบ')) {
      type = 'error';
    } else if (text.includes('สำเร็จ') || text.includes('แล้ว') || text.includes('พร้อม') || text.includes('เลือก') || text.includes('บันทึก')) {
      type = 'success';
    } else {
      type = 'info';
    }
  }

  const titles = {
    success: 'สำเร็จ',
    error: 'ข้อผิดพลาด',
    warning: 'แจ้งเตือน',
    info: 'ระบบ'
  };

  const icons = {
    success: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  const time = duration || (type === 'error' ? 5500 : 3400);

  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <div class="toast-icon-badge">
      ${icons[type] || icons.info}
    </div>
    <div class="toast-body">
      <span class="toast-tag">${titles[type] || 'แจ้งเตือน'}</span>
      <span class="toast-message"></span>
    </div>
    <button class="toast-close" type="button" aria-label="ปิดการแจ้งเตือน">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="toast-progress">
      <div class="toast-progress-bar" style="animation-duration: ${time}ms;"></div>
    </div>
  `;
  el.querySelector('.toast-message').textContent = msg;

  const closeBtn = el.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      el.classList.remove('show');
    };
  }

  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');

  clearTimeout(el.timer);
  el.timer = setTimeout(() => el.classList.remove('show'), time);
}

function showAlertModal({ title, message, suggestion, action, actionText }) {
  const modal = $('#errorModal');
  if (!modal) return;

  $('#modalTitle').textContent = title || 'ข้อผิดพลาดในการเปิดเกม';
  $('#modalMessage').textContent = message || '';

  const suggBox = $('#modalSuggestion');
  const suggText = $('#modalSuggestionText');
  if (suggestion) {
    suggText.textContent = suggestion;
    suggBox.hidden = false;
  } else {
    suggBox.hidden = true;
  }

  const actionBtn = $('#modalActionBtn');
  if (action && actionText) {
    actionBtn.textContent = actionText;
    actionBtn.hidden = false;
    actionBtn.onclick = () => {
      closeAlertModal();
      if (action === 'settings') openPage('settings');
      else if (action === 'logs') openPage('logs');
    };
  } else {
    actionBtn.hidden = true;
  }

  modal.hidden = false;
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
  refreshIcons();
}

function closeAlertModal() {
  const modal = $('#errorModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { modal.hidden = true; }, 220);
}

function applyAccount(status) {
  account = status;
  const signedIn = Boolean(status.authenticated && status.profile);
  if ($('#username')) {
    $('#username').disabled = signedIn;
    if (signedIn) {
      $('#username').value = status.profile.name;
    } else {
      $('#username').value = 'Lunia';
    }
  }
  const authBtn = $('#heroAuthBtn');
  const authText = $('#heroAuthText');
  if (authBtn && authText) {
    if (signedIn) {
      authBtn.classList.add('signed-in');
      authBtn.title = `ออกจากระบบ (${status.profile.name})`;
      authText.textContent = status.profile.name;
    } else {
      authBtn.classList.remove('signed-in');
      authBtn.title = 'เข้าสู่ระบบด้วยบัญชี Microsoft';
      authText.textContent = 'เข้าสู่ระบบ MICROSOFT';
    }
  }
}

function openPage(name) {
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === name));

  let pageId = `page-${name}`;
  if (name === 'loader' || loaderInfo[name]) {
    pageId = 'page-loader';
    if (loaderInfo[name]) activeLoader = name;
    showLoader(activeLoader);
  } else if (name === 'content' || contentInfo[name]) {
    pageId = 'page-content';
    if (contentInfo[name]) activeContent = name;
    showContent(activeContent);
  }

  $$('.page').forEach(el => el.classList.toggle('active', el.id === pageId));
  refreshIcons();
}

function showLoader(type) {
  activeLoader = type;
  const info = loaderInfo[type];
  if (!info) return;

  $$('.panel-subtabs [data-loader]').forEach(b => b.classList.toggle('active', b.dataset.loader === type));
  if ($('#loaderTitle')) $('#loaderTitle').textContent = info.title;
  if ($('#loaderDescription')) $('#loaderDescription').textContent = info.description;
  if ($('#loaderHeading')) $('#loaderHeading').textContent = `ติดตั้ง ${info.title}`;
  if ($('#loaderHelp')) $('#loaderHelp').textContent = info.help;
  if ($('#loaderMark')) $('#loaderMark').innerHTML = `<i data-lucide="${info.icon}"></i>`;
  refreshIcons();
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function showContent(type) {
  activeContent = type;
  const info = contentInfo[type];
  if (!info) return;

  $$('.panel-subtabs [data-content]').forEach(b => b.classList.toggle('active', b.dataset.content === type));
  if ($('#contentTitle')) $('#contentTitle').textContent = info.title;
  if ($('#contentDescription')) $('#contentDescription').textContent = info.description;
  if ($('#contentList')) $('#contentList').innerHTML = '<div class="empty-state-card"><div class="empty-icon"><i data-lucide="loader-2"></i></div><b>กำลังตรวจสอบไฟล์…</b></div>';
  if ($('#contentEmpty')) $('#contentEmpty').hidden = true;
  refreshIcons();

  try {
    const files = await window.launcher.listContent(type);
    if ($('#contentCount')) $('#contentCount').textContent = `${files.length} ไฟล์`;
    if ($('#contentSize')) $('#contentSize').textContent = formatSize(files.reduce((sum, file) => sum + file.size, 0));
    
    if ($('#contentList')) {
      $('#contentList').innerHTML = files.map(file => `
        <div class="content-item">
          <span class="file-icon"><i data-lucide="${info.icon}"></i></span>
          <div class="file-info">
            <b title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</b>
            <small>${formatSize(file.size)}</small>
          </div>
          <span class="state-pill ${file.enabled ? '' : 'off'}">${file.enabled ? 'เปิดใช้งาน' : 'ปิดอยู่'}</span>
          <button class="toggle-file" data-file="${encodeURIComponent(file.name)}" title="${file.enabled ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}">
            <i data-lucide="${file.enabled ? 'toggle-right' : 'toggle-left'}"></i>
          </button>
        </div>
      `).join('');
    }

    if ($('#contentEmpty')) $('#contentEmpty').hidden = files.length > 0;
    
    $$('.toggle-file').forEach(button => button.onclick = async () => {
      await window.launcher.toggleContent(activeContent, decodeURIComponent(button.dataset.file));
      await showContent(activeContent);
    });
    refreshIcons();
  } catch (error) {
    toast(error.message || String(error));
  }
}

function collectSettings() {
  return {
    username: ($('#username')?.value || 'Lunia').trim(),
    version: $('#version')?.value || '1.21.1',
    gameDir: ($('#gameDir')?.value || '').trim(),
    javaPath: ($('#javaPath')?.value || '').trim(),
    minMemory: $('#minMemory')?.value || '2G',
    maxMemory: $('#maxMemory')?.value || '4G',
    width: Number($('#gameWidth')?.value || 1280),
    height: Number($('#gameHeight')?.value || 720),
    fullscreen: Boolean($('#fullscreen')?.checked)
  };
}

function applySettings(s) {
  settings = s;
  if ($('#username')) $('#username').value = s.username || 'Lunia';
  if ($('#gameDir')) $('#gameDir').value = s.gameDir;
  if ($('#javaPath')) $('#javaPath').value = s.javaPath;
  if ($('#minMemory')) $('#minMemory').value = s.minMemory;
  if ($('#maxMemory')) $('#maxMemory').value = s.maxMemory;
  if ($('#gameWidth')) $('#gameWidth').value = s.width;
  if ($('#gameHeight')) $('#gameHeight').value = s.height;
  if ($('#fullscreen')) $('#fullscreen').checked = s.fullscreen;
}

function extractVersionParts(v) {
  const s = String(v || '').trim();
  let m;
  if (s.includes('fabric-loader') || s.includes('forge') || s.includes('neoforge')) {
    m = s.match(/-(1\.\d+(?:\.\d+)*)/);
  }
  if (!m) {
    m = s.match(/^(\d+(?:\.\d+)*)/) || s.match(/(\d+(?:\.\d+)+)/);
  }
  if (!m) return [0, 0, 0, 0];
  const parts = m[1].split('.').map(Number);
  while (parts.length < 4) parts.push(0);
  return parts;
}

function compareMinecraftVersions(a, b) {
  const pa = extractVersionParts(a);
  const pb = extractVersionParts(b);
  for (let i = 0; i < 4; i++) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  const aClean = a === (pa[2] ? `${pa[0]}.${pa[1]}.${pa[2]}` : `${pa[0]}.${pa[1]}`);
  const bClean = b === (pb[2] ? `${pb[0]}.${pb[1]}.${pb[2]}` : `${pb[0]}.${pb[1]}`);
  if (aClean && !bClean) return -1;
  if (!aClean && bClean) return 1;
  return String(a).localeCompare(String(b));
}

function renderVersions(selected) {
  versions.sort(compareMinecraftVersions);
  const active = versions.includes(selected) ? selected : (versions[0] || '1.21.1');
  
  const versionItems = versions.map(v => {
    let icon = 'box';
    const vLower = String(v).toLowerCase();
    
    if (vLower.includes('optifine')) {
      icon = 'sparkles';
    } else if (vLower.includes('forge')) {
      icon = 'anvil';
    } else if (vLower.includes('fabric')) {
      icon = 'feather';
    } else if (vLower.includes('snapshot')) {
      icon = 'flask-conical';
    }
    
    return {
      value: v,
      label: `Minecraft ${v}`,
      meta: '',
      badgeClass: '',
      icon: icon
    };
  });

  setSelect('version', versionItems, active, value => renderVersions(value));
  
  const versionGrid = $('#versionGrid');
  if (versionGrid) {
    versionGrid.innerHTML = versions.map(v => `
      <button class="version-card ${localVersions.includes(v) ? 'local' : ''} ${v === active ? 'selected' : ''}" data-version="${v}">
        <b>${v}</b>
      </button>
    `).join('');

    $$('.version-card').forEach(card => card.addEventListener('click', () => {
      renderVersions(card.dataset.version);
      toast(`เลือก Minecraft ${card.dataset.version}`);
    }));
  }
}

// Mode Cards Selection Handler (Misty Style Screen 2)
$$('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    $$('.mode-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    const modeName = card.querySelector('h3')?.textContent || 'CLASSIC';
    const modeDesc = card.querySelector('p')?.textContent || '';
    const targetVer = card.dataset.versionTarget;

    if ($('#heroTitle')) $('#heroTitle').textContent = modeName;
    if ($('#heroDesc')) $('#heroDesc').textContent = modeDesc;

    if (targetVer && versions.includes(targetVer)) {
      renderVersions(targetVer);
    }

    toast(`เลือกโหมดเกม: ${modeName}`);
  });
});

// Hero Microsoft Auth Button
$('#heroAuthBtn')?.addEventListener('click', async () => {
  const authBtn = $('#heroAuthBtn');
  const authText = $('#heroAuthText');

  if (account.authenticated) {
    await window.launcher.logoutMicrosoft();
    applyAccount({ authenticated: false, profile: null });
    toast('ออกจากระบบ Microsoft แล้ว');
    return;
  }

  authBtn.disabled = true;
  if (authText) authText.textContent = 'กำลังเชื่อมต่อ…';

  try {
    const result = await window.launcher.loginMicrosoft();
    authBtn.disabled = false;
    if (result.ok) {
      applyAccount({ authenticated: true, profile: result.profile });
      toast(`เข้าสู่ระบบเป็น ${result.profile.name} สำเร็จ`);
    } else {
      applyAccount({ authenticated: false, profile: null });
      if (!String(result.error).includes('closed')) {
        toast(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    }
  } catch (err) {
    authBtn.disabled = false;
    applyAccount({ authenticated: false, profile: null });
    toast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
  }
});

// Sound toggle
let soundEnabled = true;
$('#dockSoundBtn')?.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  const icon = $('#dockSoundBtn i');
  if (icon) icon.setAttribute('data-lucide', soundEnabled ? 'volume-2' : 'volume-x');
  refreshIcons();
  toast(soundEnabled ? 'เปิดเสียงเอฟเฟกต์แล้ว' : 'ปิดเสียงเอฟเฟกต์แล้ว');
});

// Subtabs Handlers
$$('.panel-subtabs [data-loader]').forEach(btn => {
  btn.addEventListener('click', () => showLoader(btn.dataset.loader));
});
$$('.panel-subtabs [data-content]').forEach(btn => {
  btn.addEventListener('click', () => showContent(btn.dataset.content));
});

// Navigation & Window Controls
$$('.nav-item').forEach(el => el.addEventListener('click', () => openPage(el.dataset.page)));
$('#minimize')?.addEventListener('click', () => window.launcher?.minimize());
$('#maximize')?.addEventListener('click', () => window.launcher?.maximize());
$('#close')?.addEventListener('click', () => window.launcher?.close());

// Settings Handlers
$('#chooseGameDir')?.addEventListener('click', async () => {
  const p = await window.launcher.chooseFolder();
  if (p && $('#gameDir')) $('#gameDir').value = p;
});
$('#chooseJava')?.addEventListener('click', async () => {
  const p = await window.launcher.chooseJava();
  if (p && $('#javaPath')) $('#javaPath').value = p;
});
$('#openGameDir')?.addEventListener('click', () => window.launcher.openFolder($('#gameDir')?.value));
$('#saveSettings')?.addEventListener('click', async () => {
  settings = await window.launcher.saveSettings(collectSettings());
  toast('บันทึกการตั้งค่าไคลเอนต์เรียบร้อย');
});

// Log Handlers
$('#clearLogs')?.addEventListener('click', () => {
  if ($('#logs')) $('#logs').textContent = '[Lumia Client] ล้างบันทึกแล้ว\n';
});

// Installer Handler
$('#runInstaller')?.addEventListener('click', async () => {
  const result = await window.launcher.runInstaller(activeLoader);
  if (result.ok) toast(`เปิด ${loaderInfo[activeLoader].title} Installer แล้ว`);
});

// Content Management
$('#openContentFolder')?.addEventListener('click', () => window.launcher.openContentFolder(activeContent));
$('#importContent')?.addEventListener('click', async () => {
  const result = await window.launcher.importContent(activeContent);
  if (result.imported) {
    toast(`นำเข้าสำเร็จ ${result.imported} ไฟล์`);
    await showContent(activeContent);
  }
});

// Microsoft Auth Handlers
$('#microsoftLogin')?.addEventListener('click', async () => {
  const button = $('#microsoftLogin');
  button.disabled = true;
  const strong = button.querySelector('strong');
  if (strong) strong.textContent = 'กำลังเชื่อมต่อกับ Microsoft…';
  const result = await window.launcher.loginMicrosoft();
  button.disabled = false;
  if (strong) strong.textContent = 'เข้าสู่ระบบ Microsoft';
  if (result.ok) {
    applyAccount({ authenticated: true, profile: result.profile });
    toast(`เข้าสู่ระบบเป็น ${result.profile.name}`);
  } else if (!String(result.error).includes('closed')) {
    toast(result.error);
  }
});

$('#microsoftLogout')?.addEventListener('click', async () => {
  await window.launcher.logoutMicrosoft();
  applyAccount({ authenticated: false, profile: null });
  toast('ออกจากระบบ Microsoft แล้ว');
});

// Modal Event Listeners
$('#modalCloseBtn')?.addEventListener('click', closeAlertModal);
$('#modalXBtn')?.addEventListener('click', closeAlertModal);
$('#modalLogsBtn')?.addEventListener('click', () => {
  closeAlertModal();
  openPage('logs');
});
$('#errorModal')?.addEventListener('click', e => {
  if (e.target.id === 'errorModal') closeAlertModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modal = $('#errorModal');
    if (modal && !modal.hidden) closeAlertModal();
  }
});

// Play Button Launch
$('#playButton')?.addEventListener('click', async () => {
  const button = $('#playButton');
  button.disabled = true;
  
  const result = await window.launcher.launch(collectSettings());
  if (!result.ok) {
    button.disabled = false;
    const err = result.details || {
      title: 'เปิดเกมไม่สำเร็จ',
      message: result.error,
      suggestion: 'กรุณาตรวจสอบการตั้งค่า Java หรือดูรายละเอียดในหน้าบันทึก (Logs)',
      action: 'logs',
      actionText: 'ดูบันทึก (Logs)'
    };
    toast(`${err.title || 'ข้อผิดพลาด'}: ${err.message}`, 'error');
    showAlertModal(err);
  }
});

// Game Launch State Events
window.launcher.onState(({ state, message, error }) => {
  if (message && $('#logStatus')) $('#logStatus').innerHTML = `<i></i> ${message}`;
  if (state === 'running' || state === 'idle' || state === 'error') {
    if ($('#playButton')) $('#playButton').disabled = false;
  }
  if (state === 'error') {
    const err = error || {
      title: 'เกิดข้อผิดพลาดในการเปิดเกม',
      message: message,
      suggestion: 'สามารถตรวจสอบข้อผิดพลาดเพิ่มเติมได้ในแท็บ "บันทึก"',
      action: 'logs',
      actionText: 'ดูบันทึก (Logs)'
    };
    toast(`${err.title || 'ข้อผิดพลาด'}: ${err.message}`, 'error');
    showAlertModal(err);
  }
});

window.launcher.onProgress(value => {
  const total = Number(value.total || value.totalBytes || 0);
  const current = Number(value.task || value.current || value.downloaded || 0);
  if (total > 0 && current >= 0 && $('#progressBar')) {
    $('#progressBar').style.width = `${Math.min(100, Math.round(current / total * 100))}%`;
  }
  if (value.type && $('#progressText')) {
    $('#progressText').textContent = `กำลังดาวน์โหลด ${value.type}…`;
  }
});

window.launcher.onLog(({ type, message }) => {
  const logs = $('#logs');
  if (logs) {
    logs.textContent += `[${type.toUpperCase()}] ${message.replace(/\x1b\[[0-9;]*m/g, '')}\n`;
    logs.scrollTop = logs.scrollHeight;
  }
});

window.launcher.onAuthState(({ state, profile, message }) => {
  if (state === 'authenticated') applyAccount({ authenticated: true, profile });
  if (state === 'local') applyAccount({ authenticated: false, profile: null });
  if (state === 'error') toast(message);
});

// Real-Time System Telemetry
async function updateLiveTelemetry() {
  try {
    const stats = await window.launcher.getSystemStats();
    if (!stats) return;

    const pingVal = $('#tickerPingValue');
    const pingDot = $('#tickerPingDot');
    if (pingVal) {
      if (stats.ping !== null && stats.ping !== undefined) {
        pingVal.textContent = `${stats.ping}ms`;
        if (pingDot) {
          pingDot.className = 'ticker-dot ' + (stats.ping < 80 ? 'green' : stats.ping < 180 ? 'orange' : 'red');
        }
      } else {
        pingVal.textContent = 'ออฟไลน์';
        if (pingDot) pingDot.className = 'ticker-dot red';
      }
    }

    const ramVal = $('#tickerRamValue');
    if (ramVal && stats.ram) {
      ramVal.textContent = `${stats.ram.usedGB} / ${stats.ram.totalGB} GB (${stats.ram.percent}%)`;
    }

    const cpuVal = $('#tickerCpuValue');
    if (cpuVal && stats.cpu) {
      cpuVal.textContent = stats.cpu.text;
    }
  } catch {}
}

// Initialization
async function init() {
  applySettings(await window.launcher.getSettings());
  applyAccount(await window.launcher.getAuthStatus());
  const result = await window.launcher.listVersions();
  versions = result.versions;
  localVersions = result.local;
  renderVersions(settings.version || result.latest);
  setSelect('minMemory', ['1G','2G','3G','4G','6G'].map(v => ({ value: v, label: `${v.replace('G','')} GB`, icon: 'cpu' })), settings.minMemory);
  setSelect('maxMemory', ['2G','4G','6G','8G','12G','16G'].map(v => ({ value: v, label: `${v.replace('G','')} GB`, icon: 'zap' })), settings.maxMemory);
  refreshIcons();
  updateLiveTelemetry();
  setInterval(updateLiveTelemetry, 3500);
}

init().catch(error => toast(`เริ่มต้นไม่สำเร็จ: ${error.message}`));
