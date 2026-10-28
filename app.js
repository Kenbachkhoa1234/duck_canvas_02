'use strict';

const people = [
  { id: 'minh', name: 'Minh', initials: 'M', time: '21:12', preview: 'Mình đang sửa nốt giao diện.', unread: 2, online: true, colors: ['#20232d', '#7d8292'] },
  { id: 'linh', name: 'Linh', initials: 'L', time: '20:33', preview: 'Mai gửi bạn file nhé!', unread: 1, online: true, colors: ['#3a3342', '#a592b1'] },
  { id: 'an', name: 'An', initials: 'A', time: '19:08', preview: 'Ok, mình xem rồi.', unread: 0, online: false, colors: ['#262b35', '#747b89'] },
  { id: 'ha', name: 'Hà', initials: 'H', time: '18:21', preview: 'Có bản mới chưa?', unread: 0, online: true, colors: ['#3d3540', '#a78f9d'] },
  { id: 'tung', name: 'Tùng', initials: 'T', time: '12/10', preview: 'Tuần sau chốt nhé.', unread: 0, online: false, colors: ['#303846', '#778aa2'] },
  { id: 'project', name: 'Nhóm Dự án', initials: 'ND', time: '17:56', preview: 'Tài liệu đã cập nhật.', unread: 0, online: true, colors: ['#282638', '#6952a5'] },
];

const $ = (id) => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';
const strip = $('conversationStrip');
const stage = $('canvasStage');
const savedThreads = $('savedThreads');
const dragThread = $('dragThread');
const dragTip = $('dragTip');

let activeId = 'minh';
let toastTimer = null;
let dragState = null;
let targetedNode = null;
let connectionCounter = 4;

const connections = [
  { id: 'thread-file', from: 'file', to: 'reply-preview' },
  { id: 'thread-interior', from: 'interior', to: 'reply-photo' },
  { id: 'thread-lake', from: 'lake', to: 'reply-lake' },
];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function avatarMarkup(person) {
  return `<span class="avatar avatar--sm ${person.online ? 'avatar--online' : ''}" style="--avatar-a:${person.colors[0]};--avatar-b:${person.colors[1]}"><span>${escapeHtml(person.initials)}</span></span>`;
}

function renderDeck() {
  strip.innerHTML = people.map((person) => `
    <button class="conversation-card ${person.id === activeId ? 'is-active' : ''}" type="button" data-person="${person.id}" aria-pressed="${person.id === activeId}">
      ${avatarMarkup(person)}
      <span>
        <strong>${escapeHtml(person.name)}</strong>
        <small>${escapeHtml(person.preview)}</small>
      </span>
      <span class="conversation-meta">
        <time>${escapeHtml(person.time)}</time>
        ${person.unread ? `<span class="unread">${person.unread}</span>` : ''}
      </span>
    </button>
  `).join('');
}

function selectPerson(id) {
  const person = people.find((item) => item.id === id);
  if (!person) return;

  activeId = id;
  person.unread = 0;
  $('activeName').textContent = person.name;
  $('activeStatus').textContent = person.online ? 'Đang hoạt động' : 'Ngoại tuyến';
  $('activeAvatar').innerHTML = `<span>${escapeHtml(person.initials)}</span>`;
  $('activeAvatar').style.setProperty('--avatar-a', person.colors[0]);
  $('activeAvatar').style.setProperty('--avatar-b', person.colors[1]);
  $('activeAvatar').classList.toggle('avatar--online', person.online);

  renderDeck();
  strip.querySelector('.is-active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  showToast(`Đã mở bản demo cuộc trò chuyện với ${person.name}`);
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
}

function centerOf(element, relativeTo, edge = 'center') {
  const rect = element.getBoundingClientRect();
  const base = relativeTo.getBoundingClientRect();
  let x = rect.left + rect.width / 2 - base.left;
  if (edge === 'left') x = rect.left - base.left;
  if (edge === 'right') x = rect.right - base.left;
  return { x, y: rect.top + rect.height / 2 - base.top };
}

function getAnchor(name) {
  return stage.querySelector(`[data-anchor="${CSS.escape(name)}"]`);
}

function getTarget(name) {
  return stage.querySelector(`[data-target="${CSS.escape(name)}"]`);
}

function targetPoint(target, sourcePoint) {
  const visualTarget = target.querySelector('.bubble') || target;
  const rect = visualTarget.getBoundingClientRect();
  const base = stage.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2 - base.left;
  return centerOf(visualTarget, stage, sourcePoint.x <= centerX ? 'left' : 'right');
}

function pathBetween(start, end) {
  const distance = Math.max(70, Math.abs(end.x - start.x) * 0.46);
  const direction = end.x >= start.x ? 1 : -1;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${(start.x + distance * direction).toFixed(1)} ${start.y.toFixed(1)}, ${(end.x - distance * direction).toFixed(1)} ${end.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function svgElement(name, attributes) {
  const element = document.createElementNS(svgNS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function renderThreads() {
  savedThreads.replaceChildren();

  connections.forEach((connection) => {
    const anchor = getAnchor(connection.from);
    const target = getTarget(connection.to);
    if (!anchor || !target || target.hidden) return;

    const start = centerOf(anchor, stage);
    const end = targetPoint(target, start);
    const path = svgElement('path', { class: 'thread-path', d: pathBetween(start, end), 'data-thread': connection.id });
    const startNode = svgElement('circle', { class: 'thread-node', cx: start.x, cy: start.y, r: 5 });
    const endNode = svgElement('circle', { class: 'thread-node', cx: end.x, cy: end.y, r: 5 });
    savedThreads.append(path, startNode, endNode);
  });
}

function pointerPoint(event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: Math.min(rect.width, Math.max(0, event.clientX - rect.left)),
    y: Math.min(rect.height, Math.max(0, event.clientY - rect.top)),
  };
}

function setTargetedNode(node) {
  if (targetedNode === node) return;
  targetedNode?.classList.remove('is-targeted');
  targetedNode = node;
  targetedNode?.classList.add('is-targeted');
}

function beginThreadDrag(event) {
  const anchor = event.target.closest('[data-anchor]');
  if (!anchor) return;

  event.preventDefault();
  event.stopPropagation();
  dragState = { anchor, name: anchor.dataset.anchor };
  anchor.classList.add('is-dragging');
  dragThread.hidden = false;
  dragTip.classList.add('is-visible');
  updateThreadDrag(event);

  document.addEventListener('pointermove', updateThreadDrag);
  document.addEventListener('pointerup', finishThreadDrag, { once: true });
  document.addEventListener('pointercancel', cancelThreadDrag, { once: true });
}

function updateThreadDrag(event) {
  if (!dragState) return;
  const start = centerOf(dragState.anchor, stage);
  const end = pointerPoint(event);
  dragThread.setAttribute('d', pathBetween(start, end));
  dragTip.style.left = `${end.x + 14}px`;
  dragTip.style.top = `${end.y + 12}px`;

  const beneath = document.elementFromPoint(event.clientX, event.clientY);
  setTargetedNode(beneath?.closest('.thread-target') || null);
}

function cleanupThreadDrag() {
  if (!dragState) return;
  dragState.anchor.classList.remove('is-dragging');
  dragState = null;
  dragThread.hidden = true;
  dragThread.setAttribute('d', '');
  dragTip.classList.remove('is-visible');
  setTargetedNode(null);
  document.removeEventListener('pointermove', updateThreadDrag);
}

function finishThreadDrag() {
  if (!dragState) return;
  const sourceName = dragState.name;
  const targetName = targetedNode?.dataset.target;

  if (targetName) {
    const duplicate = connections.some((item) => item.from === sourceName && item.to === targetName);
    if (!duplicate) {
      const connection = { id: `thread-user-${connectionCounter++}`, from: sourceName, to: targetName };
      connections.push(connection);
      window.dispatchEvent(new CustomEvent('duckmess:thread-created', { detail: connection }));
      showToast('Đã nối ảnh với tin nhắn');
    } else {
      showToast('Hai nội dung này đã được nối');
    }
  } else {
    showToast('Thả vào một tin nhắn để tạo dây nối');
  }

  cleanupThreadDrag();
  requestAnimationFrame(renderThreads);
}

function cancelThreadDrag() {
  cleanupThreadDrag();
  requestAnimationFrame(renderThreads);
}

function openPhoto(photoButton) {
  const label = photoButton.dataset.photo || 'Ảnh tham khảo';
  const sceneClass = [...photoButton.classList].find((name) => name.startsWith('photo-')) || 'photo-house';
  $('photoDialogTitle').textContent = label;
  const art = $('photoDialogArt');
  art.className = `photo-dialog-art ${sceneClass}`;
  art.innerHTML = '<span class="photo-scene" aria-hidden="true"></span>';
  $('photoDialog').showModal();
}

strip.addEventListener('click', (event) => {
  const card = event.target.closest('[data-person]');
  if (card) selectPerson(card.dataset.person);
});

$('deckPrev').addEventListener('click', () => $('deckViewport').scrollBy({ left: -350, behavior: 'smooth' }));
$('deckNext').addEventListener('click', () => $('deckViewport').scrollBy({ left: 350, behavior: 'smooth' }));

stage.addEventListener('pointerdown', beginThreadDrag);
stage.addEventListener('click', (event) => {
  if (event.target.closest('[data-anchor]')) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const photo = event.target.closest('[data-photo]');
  if (photo) openPhoto(photo);
});

$('voiceButton').addEventListener('click', () => {
  const button = $('voiceButton');
  const playing = button.classList.toggle('is-playing');
  button.querySelector('.voice-play').textContent = playing ? 'Ⅱ' : '▶';
  showToast(playing ? 'Đang phát tin thoại demo' : 'Đã tạm dừng');
});

$('plusButton').addEventListener('click', () => {
  const menu = $('quickMenu');
  const open = menu.hidden;
  menu.hidden = !open;
  $('plusButton').setAttribute('aria-expanded', String(open));
});

$('quickMenu').addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  showToast(`Đã chọn ${action.dataset.action}`);
  $('quickMenu').hidden = true;
  $('plusButton').setAttribute('aria-expanded', 'false');
});

$('composerForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('messageInput');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }

  const lastBubble = stage.querySelector('.node--reply-lake .bubble');
  lastBubble.textContent = text;
  stage.querySelector('.node--reply-lake time').innerHTML = 'vừa xong <b>✓✓</b>';
  input.value = '';
  window.dispatchEvent(new CustomEvent('duckmess:send', { detail: { conversationId: activeId, text } }));
  showToast('Đã gửi tin nhắn demo');
  requestAnimationFrame(renderThreads);
});

$('detailsButton').addEventListener('click', () => $('detailsDialog').showModal());

document.querySelectorAll('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => showToast(button.dataset.toast));
});

stage.querySelector('.node--reply-preview button').addEventListener('click', (event) => {
  event.currentTarget.closest('.node--reply-preview').hidden = true;
  const index = connections.findIndex((item) => item.to === 'reply-preview');
  if (index >= 0) connections.splice(index, 1);
  showToast('Đã đóng reply');
  requestAnimationFrame(renderThreads);
});

const resizeObserver = new ResizeObserver(() => requestAnimationFrame(renderThreads));
resizeObserver.observe(stage);
window.addEventListener('resize', () => requestAnimationFrame(renderThreads));

renderDeck();
requestAnimationFrame(() => requestAnimationFrame(renderThreads));
