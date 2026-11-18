/* ============================================================
   上海初中数学知识图谱 · three.js r187 + WebGL2
   数据：沪教版（五四制）2024 版新教材 33 章 104 节
   ============================================================ */

/* ---------- 1. 从内联文本里加载 three（保持 ESM，不联网） ---------- */
const LITE = location.search.includes('lite');

let coreSrc = document.getElementById('three-core').textContent;
const coreURL = URL.createObjectURL(new Blob([coreSrc], { type: 'text/javascript' }));
let modSrc = document.getElementById('three-module').textContent;
modSrc = modSrc.replaceAll('./three.core.js', coreURL);
const THREE = await import(URL.createObjectURL(new Blob([modSrc], { type: 'text/javascript' })));

// 关键：把 2MB 源码文本节点从 DOM 里清掉并释放引用，否则它一直占着内存、参与每次重排
document.getElementById('three-core').textContent = '';
document.getElementById('three-module').textContent = '';
coreSrc = null; modSrc = null;


/* ---------- 2. 数据 ---------- */
const DATA = JSON.parse(document.getElementById('graph-data').textContent);

const DOMAINS = {
  algebra:  { name: '数与代数',   color: 0x35c7f0, y:  3.4 },
  trig:     { name: '三角',       color: 0xa78bfa, y:  1.5 },
  geometry: { name: '图形与几何', color: 0xf59a26, y: -1.3 },
  stat:     { name: '统计与概率', color: 0x34d399, y: -3.9 },
};

const TERM_SHORT = {
  '一年级上册': '一上', '一年级下册': '一下',
  '二年级上册': '二上', '二年级下册': '二下',
  '三年级上册': '三上', '三年级下册': '三下',
  '四年级上册': '四上', '四年级下册': '四下',
  '五年级上册': '五上', '五年级下册': '五下',
  '六年级上册': '预备·上', '六年级下册': '预备·下',
  '七年级上册': '初一·上', '七年级下册': '初一·下',
  '八年级上册': '初二·上', '八年级下册': '初二·下',
  '九年级上册': '初三·上', '九年级下册': '初三·下',
};

/* ---------- 3. 渲染器 ---------- */
const canvas = document.getElementById('scene');

// 先自己拿 context，顺便查出是不是软件渲染（Chrome 关掉硬件加速时就是 SwiftShader，会非常慢）
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
if (!gl) {
  document.body.innerHTML = '<div style="padding:40px;font:16px/1.7 system-ui;color:#dbe7ff">'
    + '这个浏览器没有拿到 WebGL2 上下文。<br>请在 Chrome 地址栏打开 <code>chrome://gpu</code> 看「WebGL2」是否为 Enabled，'
    + '或换用 Chrome / Edge 打开。</div>';
  throw new Error('WebGL2 unavailable');
}
let SOFT = false;
try {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const rn = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|software|llvmpipe|basic render/i.test(rn)) SOFT = true;
} catch (_) {}
const LOWFX = LITE || SOFT;
const FPS_CAP = LOWFX ? 22 : 60;

const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOWFX ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
document.getElementById('gl-tag').textContent = (isWebGL2 ? 'WebGL2 · three r' + THREE.REVISION : 'WebGL1 · 异常') + (SOFT ? ' · 软件渲染' : '');
if (SOFT) {
  const tip = document.createElement('div');
  tip.id = 'soft-tip';
  tip.textContent = '检测到 Chrome 正在用软件渲染（硬件加速可能是关掉的），已自动降级。到 设置 → 系统 →「使用图形加速」打开后重开本页会流畅很多。';
  document.body.appendChild(tip);
}

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.FogExp2(0x03060e, 0.0055);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 400);
const target = new THREE.Vector3(0, -15.0, 0);

/* ---------- 4. 灯光 ---------- */
scene.add(new THREE.AmbientLight(0x7f9bd6, 0.75));
const key = new THREE.DirectionalLight(0xeaf2ff, 1.5);
key.position.set(12, 22, 18);
scene.add(key);
const rim = new THREE.DirectionalLight(0x2f6bd8, 0.9);
rim.position.set(-18, -8, -16);
scene.add(rim);
if (!LOWFX) {
  const p1 = new THREE.PointLight(0x35c7f0, 90, 60, 2); p1.position.set(-14, 6, 10); scene.add(p1);
  const p2 = new THREE.PointLight(0xf59a26, 70, 60, 2); p2.position.set(16, -5, -8); scene.add(p2);
}

/* ---------- 5. 星空 ---------- */
(function stars() {
  if (LOWFX) return;
  const N = 800, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = 55 + Math.random() * 90;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    c.setHSL(0.55 + Math.random() * 0.12, 0.6, 0.55 + Math.random() * 0.35);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(g, m));
})();

/* ---------- 6. 布局：一列 = 一个学期，从上到下 = 先学 → 后学 ---------- */
const TERM_GAP = 13.2;         // 列间距（留足标签空间，避免标签压到下一列的圆点）
const ROW_GAP = 2.9;           // 同学期内章与章的间距
const TOP_Y = 5.6;             // 每学期第一行的固定高度（列顶对齐）
const positions = new Map();
const orderInTerm = new Map();
const TERM_COLORS = [0x3fa9f5, 0x35c7f0, 0x818cf8, 0xa78bfa, 0xc084fc, 0xf472b6, 0xfb923c, 0xfbbf24];

const PRIMARY_TOP = 8.2;    // 小学第一行高度
const PRIMARY_COLS = 5;     // 小学每行 5 册
const ROW_BLOCK = 19.4;     // 小学两行的高度间隔
const JUNIOR_TOP = -30.0;   // 初中排第一行高度
function stageGroup(stage) { return DATA.terms.filter(x => x.stage === stage); }
function termX(t) {
  if (t.stage === 'primary') return ((t.idx % PRIMARY_COLS) - (PRIMARY_COLS - 1) / 2) * TERM_GAP;
  const g = stageGroup('junior');
  return (t.idx - (g.length - 1) / 2) * TERM_GAP;
}
function termTop(t) {
  return t.stage === 'primary' ? PRIMARY_TOP - Math.floor(t.idx / PRIMARY_COLS) * ROW_BLOCK : JUNIOR_TOP;
}

DATA.terms.forEach((t, ti) => {
  const chs = DATA.chapters.filter(c => c.term === ti).sort((a, b) => a.unit - b.unit);
  const x = termX(t), top = termTop(t);
  chs.forEach((ch, i) => {
    positions.set(ch.no, new THREE.Vector3(x, top - i * ROW_GAP, 0));
    orderInTerm.set(ch.no, i);
  });
});

/* ---------- 7. 标签纹理 ---------- */
const FONT = '"PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif';

// 径向渐变光晕纹理（比透明大球便宜得多）
const glowTex = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.30, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.10)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

function makeTextSprite(lines, opts = {}) {
  const { w = 512, h = 256, fontMain = 64, fontSub = 30, color = '#ffffff', sub = '#93a8c8', align = 'center' } = opts;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (opts.bg) {
    ctx.fillStyle = 'rgba(4,9,18,0.66)';
    const padX = 26, padY = 18, rr = 22;
    ctx.beginPath();
    ctx.roundRect(padX, padY, w - padX * 2, h - padY * 2, rr);
    ctx.fill();
  }
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const cx = align === 'center' ? w / 2 : 24;
  ctx.font = `600 ${fontMain}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 5;
  ctx.fillText(lines[0], cx, h * 0.42);
  if (lines[1]) {
    ctx.font = `500 ${fontSub}px ${FONT}`;
    ctx.fillStyle = sub;
    ctx.fillText(lines[1], cx, h * 0.72);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(w / 256, h / 256, 1);
  return sp;
}

const labelLayer = document.getElementById('label-layer');

/* ---------- 8. 学期列：一列 = 一个学期，竖线就是这学期的学习顺序 ---------- */
const pads = [];
const termLabels = [];
const termLines = [];
DATA.terms.forEach((t, ti) => {
  const x = termX(t);
  const chs = DATA.chapters.filter(c => c.term === ti).sort((a, b) => a.unit - b.unit);
  const t0 = termTop(t);
  const top = t0 + 1.6;
  const bot = t0 - (chs.length - 1) * ROW_GAP - 1.6;

  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, top, 0),
    new THREE.Vector3(x, bot, 0),
  ]);
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({
    color: 0x6fa8d8, transparent: true, opacity: 0.55,
  }));
  scene.add(line);
  termLines.push({ line, stage: t.stage });

  const el = document.createElement('div');
  el.className = 'tlabel';
  el.textContent = TERM_SHORT[t.label] || t.label;
  el.classList.add(t.stage === 'primary' ? 'primary' : 'junior');
  labelLayer.appendChild(el);
  termLabels.push({ el, pos: new THREE.Vector3(x, top + 1.9, 0), stage: t.stage });
  el.style.pointerEvents = 'auto';
  el.style.cursor = 'pointer';
  el.title = `点一下聚焦到 ${t.label}`;
  el.addEventListener('click', ev => { ev.stopPropagation(); selectedHl = null; focusTerm(ti); });

  pads.push({ x, ti });
});

// 小学 / 初中分界提示
(function stageSplit() {
  const el = document.createElement('div');
  el.className = 'tlabel stage-split';
  el.textContent = '小学 ↑　　升初中　　↓ 初中';
  labelLayer.appendChild(el);
  termLabels.push({ el, pos: new THREE.Vector3(0, -25.9, 0) });
})();

/* ---------- 9. 章节节点 ---------- */
const nodes = [];
const nodeMeshes = [];

DATA.chapters.forEach(ch => {
  const pos = positions.get(ch.no);
  const d = DOMAINS[ch.domain];
  const color = new THREE.Color(d.color);
  const r = 0.33 + Math.min(ch.sections.length, 6) * 0.045;

  const group = new THREE.Group();
  group.position.copy(pos);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(r, 1),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.55, metalness: 0.55, roughness: 0.25, flatShading: true,
    })
  );
  core.userData.ch = ch;
  group.add(core);
  nodeMeshes.push(core);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(r * 6.5, r * 6.5, 1);
  if (LOWFX) glow.material.opacity = 0.45;
  group.add(glow);

  // 章名标签用 DOM 文字渲染：由浏览器排版，任何缩放下都清晰（sprite 纹理会发糊）
  const labelEl = document.createElement('div');
  labelEl.className = 'mlabel';
  labelEl.textContent = `${ch.unit}  ${ch.name}`;
  labelLayer.appendChild(labelEl);
  // 点/悬停标签文字，和点圆点一样：连线高亮 + 打开面板
  labelEl.style.pointerEvents = 'auto';
  labelEl.style.cursor = 'pointer';
  labelEl.addEventListener('pointerenter', () => { hovered = ch; setHighlight(ch.no); });
  labelEl.addEventListener('pointerleave', () => {
    if (hovered === ch) { hovered = null; setHighlight(selectedHl); }
  });
  labelEl.addEventListener('click', ev => {
    ev.stopPropagation();
    selectedHl = ch.no;          // 记住选中：鼠标移开也保留连线，直到关掉面板
    setHighlight(ch.no);
    openPanel(ch);
  });

  scene.add(group);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r * 1.32, r * 1.62, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.visible = false;
  group.add(ring);

  nodes.push({ ch, group, core, glow, ring, labelEl, r, color, hidden: false });
});

/* ---------- 10. 关联关系：曲线 + 流动光点 ---------- */
const edgeObjs = [];

DATA.edges.forEach(e => {
  const a = positions.get(e.from), b = positions.get(e.to);
  const ca = new THREE.Color(DOMAINS[DATA.chapters.find(c => c.no === e.from).domain].color);
  const cb = new THREE.Color(DOMAINS[DATA.chapters.find(c => c.no === e.to).domain].color);
  const mixed = ca.clone().lerp(cb, 0.5);

  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dist = a.distanceTo(b);
  mid.y += dist * 0.03;
  mid.z += 0.5;

  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 28, 0.052, 6, false),
    new THREE.MeshBasicMaterial({ color: mixed, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(tube);

  // 每条边放 4 个流动光点，沿曲线均匀分布 —— 方向一眼就能看出来
  const dots = [];
  for (let k = 0; k < 8; k++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.155, 12, 12),
      new THREE.MeshBasicMaterial({ color: mixed.clone().lerp(new THREE.Color(0xffffff), 0.55), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    dot.visible = false;
    scene.add(dot);
    dots.push(dot);
  }

  // 箭头：钉在连线终点，指向「后学的那一章」，方向一目了然
  const tipPos = curve.getPoint(0.90);
  const tan = curve.getTangent(0.90).normalize();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.78, 14),
    new THREE.MeshBasicMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  cone.position.copy(tipPos);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
  cone.visible = false;
  scene.add(cone);

  const tf = DATA.chapters.find(c => c.no === e.from).term;
  const tt = DATA.chapters.find(c => c.no === e.to).term;
  const base = 0;   // 默认不显示：避免“没关联的地方也有淡线”
  tube.material.opacity = base;
  edgeObjs.push({ e, curve, tube, dots, cone, offset: Math.random(), baseOpacity: base });
});


/* ---------- 14. 题目识别：上传题图 → 视觉大模型 → 标注知识点 ---------- */
const quizEl = document.getElementById('quiz');
const quizOut = document.getElementById('quiz-out');
const quizPrev = document.getElementById('quiz-prev');
const quizDropText = document.getElementById('quiz-drop-text');
const quizDrop = document.getElementById('quiz-drop');
const qApi = document.getElementById('quiz-api');
const qKey = document.getElementById('quiz-key');
const qModel = document.getElementById('quiz-model');
let quizImage = null;

try {
  const saved = JSON.parse(localStorage.getItem('shmath.quiz.v1') || '{}');
  qApi.value = saved.api || ''; qKey.value = saved.key || ''; qModel.value = saved.model || '';
} catch (e) {}

const quizLocate = document.getElementById('quiz-locate');
const quizAgain = document.getElementById('quiz-again');
const quizDrill = document.getElementById('quiz-drill');
let quizNos = null;   // 上一次分析标注的章

// 把镜头移到这批章的中心，让它们都进画面
function focusChapters(nos) {
  const ps = nos.map(n => positions.get(n)).filter(Boolean);
  if (!ps.length) return;
  const center = new THREE.Vector3();
  ps.forEach(p => center.add(p));
  center.multiplyScalar(1 / ps.length);
  let far = 0;
  ps.forEach(p => { far = Math.max(far, center.distanceTo(p)); });
  target.copy(center);
  cam.radius = Math.max(34, far * 3.4);
  applyCamera();
}

quizLocate.addEventListener('click', () => {
  if (!quizNos) return;
  quizEl.classList.remove('open');
  selectedHl = quizNos;
  setHighlight(quizNos);
  focusChapters(quizNos);
});

quizAgain.addEventListener('click', () => {
  quizImage = null;
  quizPrev.hidden = true; quizPrev.src = '';
  quizDropText.textContent = '点这里选题目图片，或把图片拖进来';
  quizOut.innerHTML = '';
  quizLocate.hidden = true; quizAgain.hidden = true; quizDrill.hidden = true;
  quizNos = null;
});


function escapeHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 让大模型照这道题出同类型练习
quizDrill.addEventListener('click', async () => {
  if (quizBusy) return;
  if (!quizImage) return quizSay('先上传题目图片、分析一次，再出同类题。');
  const api = qApi.value.trim().replace(/\/+$/, '');
  const key = qKey.value.trim();
  const model = qModel.value.trim();
  if (!api || !model) return quizSay('请先填 API 地址和模型名。');

  quizBusy = true;
  quizSay('正在出题…（大约几秒）');

  const nos = quizNos || [];
  const names = nos.map(n => `${n} ${chapterName(n)}`).join('、') || '数学';
  const prompt = `这是刚发给你的那道题（图片），它考查这些章节：${names}。

请出 2 道同类型、难度相当的练习题。要求：
1. 题目完整：已知条件 + 要求解什么；有图就用文字把图形描述清楚
2. 每题给出答案和简要解题步骤
3. 中文，按「题目一」「题目二」分开，末尾单独列出「答案与思路」；
4. 不要用 markdown 表格，不要用 LaTeX 的反斜杠命令，公式直接写普通字符（如 y = ax² + bx - 4）`;

  const url = api.endsWith('/chat/completions') ? api : api + '/chat/completions';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) },
      body: JSON.stringify({
        model, temperature: 0.6, max_tokens: 1800,
        chat_template_kwargs: { thinking: false },   // 传参关掉思考，模型直接给结果
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: quizImage } },
        ] }],
      }),
    });
  } catch (e) {
    quizBusy = false;
    return quizSay('请求失败：' + e.message);
  }
  quizBusy = false;
  if (!res.ok) {
    const body = await res.text();
    return quizSay(`接口返回 ${res.status}：\n` + body.slice(0, 400));
  }
  const j = await res.json();
  const txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  if (!txt.trim()) return quizSay('模型没有返回内容，可以再点一次。');
  quizOut.querySelectorAll('.drill-block').forEach(el => el.remove());
  quizOut.insertAdjacentHTML('beforeend',
    `<div class="drill-block"><b>同类型练习</b>\n\n${escapeHtml(txt)}</div>`);
});


// 浮层可以拖动：按住标题栏拖到不挡图的位置
const quizHead = quizEl.querySelector('.quiz-head');
let quizDragging = false, quizGrabX = 0, quizGrabY = 0;
quizHead.addEventListener('pointerdown', e => {
  if (e.target.closest('#quiz-close')) return;
  const r = quizEl.getBoundingClientRect();
  quizDragging = true;
  quizGrabX = e.clientX - r.left;
  quizGrabY = e.clientY - r.top;
  quizEl.style.transform = 'none';
  quizEl.style.left = r.left + 'px';
  quizEl.style.top = r.top + 'px';
  quizEl.classList.add('dragging');
  quizHead.setPointerCapture(e.pointerId);
});
quizHead.addEventListener('pointermove', e => {
  if (!quizDragging) return;
  const w = quizEl.offsetWidth, h = quizEl.offsetHeight;
  let x = e.clientX - quizGrabX, y = e.clientY - quizGrabY;
  x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
  y = Math.max(8, Math.min(window.innerHeight - h - 8, y));
  quizEl.style.left = x + 'px';
  quizEl.style.top = y + 'px';
});
const endQuizDrag = () => { if (quizDragging) { quizDragging = false; quizEl.classList.remove('dragging'); } };
quizHead.addEventListener('pointerup', endQuizDrag);
quizHead.addEventListener('pointercancel', endQuizDrag);

// 每次重新打开回到屏幕中央（拖累了就点 × 再开）
function openQuiz() {
  quizEl.style.transform = 'translate(-50%, -50%)';
  quizEl.style.left = '50%';
  quizEl.style.top = '50%';
  quizEl.classList.add('open');
}

document.getElementById('btn-quiz').addEventListener('click', openQuiz);
document.getElementById('quiz-close').addEventListener('click', () => quizEl.classList.remove('open'));

function quizSay(html) { quizOut.innerHTML = html; }

// 大图先缩到 1280 宽，避免几 MB 的 base64 卡住请求
async function shrinkImage(file) {
  const raw = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = rej; i.src = raw;
  });
  const scale = Math.min(1, 1280 / img.width);
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * scale));
  cv.height = Math.max(1, Math.round(img.height * scale));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.86);
}

async function takeFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  quizImage = await shrinkImage(file);
  quizPrev.src = quizImage;
  quizPrev.hidden = false;
  quizDropText.textContent = '已选择：' + file.name + '（点这里可换一张）';
  quizSay('');
}

document.getElementById('quiz-file').addEventListener('change', e => takeFile(e.target.files[0]));
quizDrop.addEventListener('dragover', e => { e.preventDefault(); quizDrop.classList.add('over'); });
quizDrop.addEventListener('dragleave', () => quizDrop.classList.remove('over'));
quizDrop.addEventListener('drop', e => {
  e.preventDefault(); quizDrop.classList.remove('over');
  takeFile(e.dataTransfer.files[0]);
});

// 给模型的章节表：编号 + 年级 + 章名 + 前三个小节的名称
function chapterTable() {
  return DATA.chapters.map(c => {
    const secs = (c.sections || []).slice(0, 3).map(x => x.name).join('／');
    return `${c.no}｜${c.grade || ''}｜${c.name}｜${secs}`;
  }).join('\n');
}

function extractJSON(txt) {
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

let quizBusy = false;
document.getElementById('quiz-run').addEventListener('click', async () => {
  if (quizBusy) return;
  const api = qApi.value.trim().replace(/\/+$/, '');
  const key = qKey.value.trim();
  const model = qModel.value.trim();
  if (!quizImage) return quizSay('先选一张题目图片。');
  if (!api || !model) return quizSay('请先填 API 地址和模型名（只需填一次，会记住）。');
  localStorage.setItem('shmath.quiz.v1', JSON.stringify({ api, key, model }));

  quizBusy = true;
  quizSay('正在分析…（大模型看图需要几秒到十几秒）');

  const prompt = `你是沪教版数学老师。看这道题目图片，判断它用到哪些章节的知识点。

只能从下面的章节表里选（编号｜年级｜章名｜小节）：
${chapterTable()}

只输出 JSON，不要代码块、不要任何解释：
{"chapters":[编号,...],"type":"题型","reason":"一句话说明这道题在考什么"}
最多 5 个编号，按重要性从高到低排序。`;

  const url = api.endsWith('/chat/completions') ? api : api + '/chat/completions';
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        chat_template_kwargs: { thinking: false },   // 传参关掉思考，模型直接给结果
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: quizImage } },
        ] }],
      }),
    });
  } catch (e) {
    quizBusy = false;
    return quizSay('请求失败：' + e.message + '\n（常见原因：地址不对、KEY 没填、或该接口不允许浏览器直连）');
  }
  if (!res.ok) {
    const body = await res.text();
    quizBusy = false;
    return quizSay(`接口返回 ${res.status}：\n` + body.slice(0, 400));
  }
  const j = await res.json();
  quizBusy = false;
  const txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  const obj = extractJSON(txt);
  if (!obj || !Array.isArray(obj.chapters)) {
    return quizSay('模型返回的内容不是预期格式：\n' + txt.slice(0, 400));
  }
  const nos = obj.chapters.map(Number).filter(n => DATA.chapters.some(c => c.no === n));
  if (!nos.length) return quizSay('没匹配到章节。模型说：\n' + txt.slice(0, 400));

  // 在图谱上标注
  selectedHl = nos;          // 数组：鼠标移动后依然整组亮着
  setHighlight(nos);
  openPanel(DATA.chapters.find(c => c.no === nos[0]));

  quizNos = nos;
  quizLocate.hidden = false; quizAgain.hidden = false; quizDrill.hidden = false;
  quizSay(
    `<b>${obj.type || '题目'}</b>\n${obj.reason || ''}\n\n已标注 ${nos.length} 章：` +
    nos.map(n => `\n· ${n} ${chapterName(n)}`).join('') +
    `\n\n（图上这些章已经亮起，点任意一章可看详情）`
  );
});

/* ---------- 11. 相机控制（自写 orbit，不依赖 addons） ---------- */
const cam = { theta: 0, phi: 1.20, radius: 84 };
let dragging = false;
let lastX = 0, lastY = 0;
let autoSpin = location.search.includes('spin');   // 默认不旋转，只有 ?spin=1 才转
let idleTimer = 0;

let panelXShift = 0;      // 面板开着时把镜头中心右移，让画面整体左移，避开面板
function applyCamera() {
  const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
  const lookX = target.x + panelXShift;
  camera.position.set(
    lookX + cam.radius * sp * Math.sin(cam.theta),
    target.y + cam.radius * cp,
    target.z + cam.radius * sp * Math.cos(cam.theta)
  );
  camera.lookAt(lookX, target.y, target.z);
}
// 面板占掉屏幕右侧多少像素 → 换算成世界单位
function panelShiftWorld() {
  const pw = panel.getBoundingClientRect().width || 0;
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  if (!pw || !w) return 0;
  const viewH = 2 * cam.radius * Math.tan(camera.fov * Math.PI / 360);
  const viewW = viewH * (w / h);
  return (pw * 0.5) / w * viewW;   // 让内容左移半个面板宽
}
function setPanelShift(on) {
  // 左移量封顶，避免把最左边那一列推出画面
  panelXShift = on ? Math.min(12, panelShiftWorld()) : 0;
  applyCamera();
}
applyCamera();

canvas.addEventListener('pointerdown', ev => {
  dragging = true; lastX = ev.clientX; lastY = ev.clientY; idleTimer = 0;
  try { canvas.setPointerCapture(ev.pointerId); } catch (_) { /* 合成事件或指针已失效时忽略 */ }
});
canvas.addEventListener('pointermove', ev => {
  const mx = ev.clientX, my = ev.clientY;
  pointer.x = (mx / window.innerWidth) * 2 - 1;
  pointer.y = -(my / window.innerHeight) * 2 + 1;
  if (!dragging) return;
  const dx = mx - lastX, dy = my - lastY;
  lastX = mx; lastY = my;
  cam.theta -= dx * 0.005;
  cam.phi = Math.min(Math.PI - 0.22, Math.max(0.22, cam.phi - dy * 0.005));
  idleTimer = 0;
});
const releaseDrag = () => { if (dragging) { dragging = false; idleTimer = 0; } };
canvas.addEventListener('pointerup', releaseDrag);
canvas.addEventListener('pointercancel', releaseDrag);
canvas.addEventListener('pointerleave', releaseDrag);
window.addEventListener('pointerup', releaseDrag);
window.addEventListener('blur', releaseDrag);
canvas.addEventListener('wheel', ev => {
  ev.preventDefault();
  cam.radius = Math.min(95, Math.max(16, cam.radius * (1 + ev.deltaY * 0.0012)));
  idleTimer = 0;
}, { passive: false });

// 触摸双指缩放
let pinchStart = 0;
canvas.addEventListener('touchstart', ev => {
  if (ev.touches.length === 2) pinchStart = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY);
}, { passive: true });
canvas.addEventListener('touchmove', ev => {
  if (ev.touches.length === 2 && pinchStart) {
    const d = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY);
    cam.radius = Math.min(95, Math.max(16, cam.radius * (pinchStart / d)));
    pinchStart = d;
    ev.preventDefault();
  }
}, { passive: false });

/* ---------- 12. 悬停与点击 ---------- */
const pointer = new THREE.Vector2(-2, -2);
const raycaster = new THREE.Raycaster();
raycaster.params.Line = { threshold: 0.1 };
let hovered = null;

let hlNo = null;
let hlSet = null;        // 当前高亮的章集合（单章或多章）
let selectedHl = null;   // 选中/标注的高亮：单章号或多章数组；鼠标移开时恢复到它
function chapterName(no) { const c = DATA.chapters.find(x => x.no === no); return c ? c.name : ''; }
function setHighlight(chNo) {
  hlNo = Array.isArray(chNo) ? chNo[0] : chNo;
  hlSet = chNo == null ? null : new Set(Array.isArray(chNo) ? chNo : [chNo]);
  const neigh = new Set();
  if (hlSet) {
    DATA.edges.forEach(e => {
      if (hlSet.has(e.from)) neigh.add(e.to);
      if (hlSet.has(e.to)) neigh.add(e.from);
    });
  }
  nodes.forEach(n => {
    const isHover = hlSet ? hlSet.has(n.ch.no) : false;
    const isNeigh = neigh.has(n.ch.no);
    n.core.material.emissiveIntensity = isHover ? 1.6 : isNeigh ? 0.95 : 0.5;
    n.group.scale.setScalar(isHover ? 1.22 : 1);
    n.glow.material.opacity = isHover ? 0.2 : isNeigh ? 0.13 : 0.075;
    n.labelEl.style.opacity = (hlSet == null || isHover || isNeigh) ? '1' : '0.4';
  });
  edgeObjs.forEach(o => {
    const on = hlSet != null && (hlSet.has(o.e.from) || hlSet.has(o.e.to));
    o.tube.material.opacity = hlSet == null ? o.baseOpacity : (on ? 0.95 : 0);
    o.cone.visible = hlSet != null && on;
    o.cone.material.color.copy(o.tube.material.color).lerp(new THREE.Color(0xffffff), 0.65);
    o.cone.material.opacity = hlSet != null && on ? 1 : 0;
  });
}

let lastTap = 0;
canvas.addEventListener('pointerup', ev => {
  const now = performance.now();
  if (now - lastTap < 250) return;   // 防抖：连续 pointerup 只处理一次
  lastTap = now;
  if (ev.button !== undefined && ev.button !== 0 && ev.pointerType === 'mouse') return;
  try {
    if (!hovered) { closePanel(); setHighlight(null); selectedHl = null; return; }
    const ch = hovered;
    selectedHl = ch.no;
    setHighlight(ch.no);
    openPanel(ch);
  } catch (err) {
    console.error('[graph] tap handler error:', err);
    const b = document.getElementById('beat');
    if (b) b.textContent = 'ERR: ' + err.message;
  }
});

/* ---------- 12.8 已掌握标记 ---------- */
const MASTER_KEY = 'shmath.mastered.v1';
let mastered = new Set();
try { mastered = new Set(JSON.parse(localStorage.getItem(MASTER_KEY) || '[]')); } catch (e) { mastered = new Set(); }
function saveMastered() {
  try { localStorage.setItem(MASTER_KEY, JSON.stringify([...mastered])); } catch (e) {}
}
function updateProgress() {
  const el = document.getElementById('progress');
  if (el) {
    el.textContent = `已掌握 ${mastered.size} / ${DATA.chapters.length}`;
    el.classList.toggle('has', mastered.size > 0);
  }
  // 每册在底部按钮上画一条细进度线
  const btns = document.querySelectorAll('#timeline .tl-item');
  DATA.terms.forEach((t, ti) => {
    const chs = DATA.chapters.filter(c => c.term === ti);
    const done = chs.filter(c => mastered.has(c.no)).length;
    const bar = btns[ti] && btns[ti].querySelector('.bar');
    if (bar) {
      bar.style.width = chs.length ? `${Math.round(done / chs.length * 100)}%` : '0%';
      bar.style.opacity = done ? '1' : '0';
    }
    if (btns[ti]) btns[ti].title = `${t.label} · 已掌握 ${done}/${chs.length}`;
  });
}
function applyMastered(no, on) {
  if (on) mastered.add(no); else mastered.delete(no);
  const n = nodes.find(x => x.ch.no === no);
  if (n) {
    n.ring.visible = on;
    n.labelEl.classList.toggle('mastered', on);
  }
  saveMastered();
  updateProgress();
}
function boolMastered(no) { return mastered.has(no); }

/* ---------- 13. 信息面板 ---------- */
const panel = document.getElementById('panel');
const panelBody = document.getElementById('panel-body');
const panelTitle = document.getElementById('panel-title');
const panelMeta = document.getElementById('panel-meta');

function domainLabel(d) { return DOMAINS[d].name; }

let panelSeq = 0;
function openPanel(ch) {
  const seq = ++panelSeq;
  // 下一帧再写 DOM：事件回调里不做大块 DOM 替换，避免主线程被长任务占住
  requestAnimationFrame(() => { if (seq === panelSeq) openPanelNow(ch); });
}

function openPanelNow(ch) {
  const term = DATA.terms[ch.term];
  const badge = ch.stage === 'primary' ? `${ch.grade} · 第 ${ch.unit} 单元` : `第 ${ch.unit} 章`;
  panelTitle.innerHTML = `<span class="cno">${badge}</span> ${ch.name}`;
  panelMeta.innerHTML = `<span class="tag ${ch.domain}">${domainLabel(ch.domain)}</span>
    <span class="chip">${term.label}</span>
    <span class="chip">${ch.stage === 'primary' ? '小学' : '初中'}</span>
    <span class="chip">${ch.sections.length} 节</span>`;

  const pre = DATA.edges.filter(e => e.to === ch.no).map(e => e.from);
  const nxt = DATA.edges.filter(e => e.from === ch.no).map(e => e.to);
  const nameOf = no => { const c = DATA.chapters.find(x => x.no === no); return `${c.unit} ${c.name}`; };

  const isM = boolMastered(ch.no);
  let html = `<button class="mark-btn${isM ? ' on' : ''}" data-no="${ch.no}">${isM ? '✓ 已掌握 · 点一下取消' : '标记为已掌握'}</button><ul class="sections">`;
  ch.sections.forEach(s => {
    html += `<li><div class="shead"><b>${s.no}</b> ${s.name}</div>`;
    if (s.points.length) html += `<div class="pts">${s.points.map(p => `<span>${p}</span>`).join('')}</div>`;
    html += '</li>';
  });
  html += '</ul>';
  if (ch.practice) html += `<div class="practice">综合与实践：${ch.practice}</div>`;
  if (pre.length) html += `<div class="rel"><h4>承接自（先学的）</h4>${pre.map(n => `<span class="relink" data-no="${n}">← ${nameOf(n)}</span>`).join('')}</div>`;
  if (nxt.length) html += `<div class="rel"><h4>通向（接着学的）</h4>${nxt.map(n => `<span class="relink" data-no="${n}">${nameOf(n)} →</span>`).join('')}</div>`;

  panelBody.innerHTML = html;
  panel.classList.add('open');
  setPanelShift(true);

  const mb = panelBody.querySelector('.mark-btn');
  if (mb) mb.addEventListener('click', () => {
    const no = Number(mb.dataset.no);
    const on = !boolMastered(no);
    applyMastered(no, on);
    mb.classList.toggle('on', on);
    mb.textContent = on ? '✓ 已掌握 · 点一下取消' : '标记为已掌握';
  });

  panelBody.querySelectorAll('.relink').forEach(el => {
    el.addEventListener('click', () => {
      const no = Number(el.dataset.no);
      const c = DATA.chapters.find(x => x.no === no);
      if (!c) return;
      selectedHl = no;
      focusOn(c);
      openPanel(c);
      setHighlight(no);
    });
  });
}
function closePanel() {
  // 关掉面板 = 本次查看结束：选中和连线一起清掉
  selectedHl = null;
  setHighlight(null);
  panel.classList.remove('open');
  setPanelShift(false);
  if (cam.radius < 40) fitStage(stageView);   // 之前聚焦过 → 退回全景
}

function focusOn(ch) {
  const p = positions.get(ch.no);
  const right = new THREE.Vector3().subVectors(camera.position, target).cross(camera.up).normalize();
  target.copy(p).addScaledVector(right, -3.2);
  cam.radius = Math.min(cam.radius, 24);
  autoSpin = false;
}

/* ---------- 13.5 深链：#ch=21 ---------- */
(function deepLink() {
  const m = location.hash.match(/ch=([\d,]+)/);
  if (!m) return;
  const nos = m[1].split(',').map(Number).filter(n => DATA.chapters.some(c => c.no === n));
  if (!nos.length) return;
  const c = DATA.chapters.find(x => x.no === nos[0]);
  selectedHl = nos.length > 1 ? nos : nos[0];
  focusOn(c);
  openPanel(c);
  setHighlight(nos.length > 1 ? nos : nos[0]);
})();

document.getElementById('panel-close').addEventListener('click', () => { closePanel(); setHighlight(null); selectedHl = null; });

/* ---------- 14. 动画循环 ---------- */
const clock = new THREE.Clock();
let frame = 0, frames = 0, fpsT = performance.now(), lowFps = 0, degraded = false;

let rafId = 0, scheduled = false;
function tick() {
  scheduled = false;
  try {
    stepFrame();
  } catch (err) {
    if (!window.__errShown) {
      window.__errShown = true;
      const b = document.getElementById('beat');
      if (b) b.textContent = 'ERR ' + String(err.message).slice(0, 26);
      console.error('[graph] frame error:', err);
    }
  }
  if (!scheduled) { scheduled = true; rafId = requestAnimationFrame(tick); }
}

let lastDrawMs = 0;
function stepFrame() {
  const nowMs = performance.now();
  if (nowMs - lastDrawMs < 1000 / FPS_CAP - 1.5) return;   // 超过帧率上限就跳过这一帧
  lastDrawMs = nowMs;

  const t = clock.getElapsedTime();
  frame++;

  // 关联光点流动
  edgeObjs.forEach(o => {
    const on = hlSet != null && (hlSet.has(o.e.from) || hlSet.has(o.e.to));
    if (!on) { for (const d of o.dots) d.visible = false; return; }
    const n = o.dots.length;
    for (let k = 0; k < n; k++) {
      const d = o.dots[k];
      const p = (t * 0.2 + o.offset + k / n) % 1;
      o.curve.getPoint(p, d.position);
      d.visible = on;
      d.material.opacity = on ? (0.2 + 0.8 * Math.sin(p * Math.PI)) : 0;
    }
  });

  // 节点轻浮动
  nodes.forEach((n, i) => {
    n.group.position.y = positions.get(n.ch.no).y + Math.sin(t * 0.9 + i * 0.7) * 0.09;
  });

  // 标签保持恒定屏幕大小
  updateDomLabels();

  // 自动旋转（空闲 2.6 秒后恢复）
  if (!dragging && autoSpin) {
    idleTimer += 1 / 60;
    if (idleTimer > 1.1) cam.theta += 0.0024;
  }
  applyCamera();

  // 悬停检测
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(nodeMeshes, false);
  const newHover = hits.length ? hits[0].object.userData.ch : null;
  if (newHover !== hovered) {
    hovered = newHover;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    if (hovered) {
      const no = hovered.no;
      setHighlight(no);
      const pre = DATA.edges.filter(e => e.to === no).map(e => e.from);
      const nxt = DATA.edges.filter(e => e.from === no).map(e => e.to);
      const nm = n => DATA.chapters.find(c => c.no === n).name;
      const bits = [];
      if (pre.length) bits.push('承接 ' + pre.map(n => n + ' ' + nm(n)).join('、'));
      if (nxt.length) bits.push('通向 ' + nxt.map(n => n + ' ' + nm(n)).join('、'));
      document.getElementById('hint').innerHTML =
        `<b>${no} ${hovered.name}</b> · ${bits.join(' · ') || '独立起点'} · 点击查看详情`;
    } else {
      setHighlight(selectedHl);
      const nos = selectedHl == null ? [] : (Array.isArray(selectedHl) ? selectedHl : [selectedHl]);
      document.getElementById('hint').textContent = nos.length
        ? `已选中 ${nos.length === 1 ? nos[0] + ' ' + chapterName(nos[0]) : nos.length + ' 章（' + nos.map(chapterName).join('、') + '）'} · 点空白处取消`
        : '拖拽旋转 · 滚轮缩放 · 点击节点查看章节与知识点';
    }
  }

  renderer.render(scene, camera);

  if (frame % 10 === 0) {
    const b = document.getElementById('beat');
    if (b) b.textContent = '帧 ' + frame;
  }

  frames++;
  const now = performance.now();
  if (now - fpsT > 1000) {
    const f = frames * 1000 / (now - fpsT);
    const el = document.getElementById('fps');
    if (f >= 1) el.textContent = Math.round(f) + ' fps';
    else if (f > 0) el.textContent = '<1 fps';
    frames = 0; fpsT = now;

    if (f < 16) lowFps++; else lowFps = 0;
    if (lowFps >= 2 && !degraded) {
      degraded = true;
      renderer.setPixelRatio(1);
      nodes.forEach(n => { n.glow.visible = false; });
      edgeObjs.forEach(o => { o.dots.forEach(d => { d.visible = false; }); });
      const b = document.getElementById('beat');
      if (b) b.textContent = '轻量模式';
    }
  }

}



/* ---------- 14.55 自动点击压测（?auto=1，仅调试用） ---------- */
if (location.search.includes('auto')) {
  const seqs = [1, 10, 21, 29, 33, 5, 17, 25];
  let k = 0;
  setInterval(() => {
    if (frame < 20) return;
    const no = seqs[k++ % seqs.length];
    const v = positions.get(no).clone().project(camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const opt = { clientX: x, clientY: y, pointerId: 1, bubbles: true, button: 0, pointerType: 'mouse' };
    pointer.x = (x / window.innerWidth) * 2 - 1;
    pointer.y = -(y / window.innerHeight) * 2 + 1;
    canvas.dispatchEvent(new PointerEvent('pointerdown', opt));
    canvas.dispatchEvent(new PointerEvent('pointerup', opt));
    const b = document.getElementById('beat');
    if (b) b.dataset.taps = String(k);
  }, 600);
}

/* ---------- 14.6 看门狗 ---------- */
let seenFrame = -1, seenAt = performance.now(), restarts = 0;
setInterval(() => {
  if (frame !== seenFrame) { seenFrame = frame; seenAt = performance.now(); return; }
  if (restarts >= 2) return;
  if (performance.now() - seenAt > 5000) {
    restarts++;
    // 帧号 2.5 秒没动：重启渲染循环
    try { cancelAnimationFrame(rafId); } catch (_) {}
    scheduled = false;
    seenAt = performance.now();
    nodes.forEach(n => {
  if (mastered.has(n.ch.no)) { n.ring.visible = true; n.labelEl.classList.add('mastered'); }
});
updateProgress();

tick();
    document.body.dataset.restarts = String(restarts);
  }
}, 800);

/* ---------- 15. 自适应 ---------- */
window.addEventListener('resize', () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOWFX ? 1.5 : 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- 13.55 DOM 标签位置更新 ---------- */
const _lv = new THREE.Vector3();
const placed = [];
function updateDomLabels() {
  const w = window.innerWidth, h = window.innerHeight;
  placed.length = 0;
  nodes.forEach(n => {
    const el = n.labelEl;
    if (n.hidden || (stageView !== 'all' && n.ch.stage !== stageView)) { el.style.display = 'none'; return; }
    _lv.copy(n.group.position);
    _lv.x += n.r + 1.1;
    _lv.project(camera);
    if (_lv.z > 1) { el.style.display = 'none'; return; }
    el.style.display = '';
    const x = (_lv.x * 0.5 + 0.5) * w;
    const y = (-_lv.y * 0.5 + 0.5) * h;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(0, -50%)`;
  });
  termLabels.forEach(t => {
    _lv.copy(t.pos).project(camera);
    if (_lv.z > 1 || (stageView !== 'all' && t.stage !== stageView)) { t.el.style.display = 'none'; return; }
    t.el.style.display = '';
    const x = (_lv.x * 0.5 + 0.5) * w;
    const y = (-_lv.y * 0.5 + 0.5) * h;
    t.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, 0)`;
  });
}

/* ---------- 13.6 标签密度切换 ---------- */
let labelMode = 'full';
const MODE_TEXT = { full: '标签：全名', num: '标签：仅章号', off: '标签：隐藏' };
function applyLabelMode() {
  nodes.forEach(n => {
    n.hidden = labelMode === 'off';
    n.labelEl.textContent = labelMode === 'num' ? String(n.ch.unit) : `${n.ch.unit}  ${n.ch.name}`;
    n.labelEl.classList.toggle('compact', labelMode === 'num');
  });
}
/* ---------- 13.7 底部时间轴（DOM） ---------- */
const tlBox = document.getElementById('timeline');
DATA.terms.forEach((t, ti) => {
  const btn = document.createElement('button');
  btn.className = 'tl-item ' + (t.stage === 'primary' ? 'primary' : 'junior');
  btn.innerHTML = `<b>${TERM_SHORT[t.label] || t.label}</b><span class="bar"></span>`;
  btn.title = t.label;
  btn.addEventListener('click', () => focusTerm(ti));
  tlBox.appendChild(btn);
});

document.getElementById('btn-labels').textContent = MODE_TEXT[labelMode];
document.getElementById('btn-labels').addEventListener('click', ev => {
  labelMode = labelMode === 'full' ? 'num' : labelMode === 'num' ? 'off' : 'full';
  applyLabelMode();
  ev.currentTarget.textContent = MODE_TEXT[labelMode];
});

/* ---------- 13.75 聚焦到某一册 ---------- */
function focusTerm(ti) {
  if (stageView !== 'all' && DATA.terms[ti].stage !== stageView) applyStageView(DATA.terms[ti].stage);
  const chs = DATA.chapters.filter(c => c.term === ti);
  const avg = chs.reduce((a, c) => a.add(positions.get(c.no)), new THREE.Vector3()).divideScalar(chs.length);
  target.copy(avg);
  cam.radius = Math.min(cam.radius, 26);
  autoSpin = false;
  idleTimer = 0;
  applyCamera();
}

/* ---------- 13.8 学段切换：全部 / 小学 / 初中 ---------- */
let stageView = 'all';
// 每个学段的内容包围盒（世界单位）—— 相机按窗口大小自动退到刚好装下的距离
const STAGE_BOX = {
  all:     { w: 108, h: 57, cy: -14.8 },
  primary: { w: 78,  h: 40, cy: -6.4 },
  junior:  { w: 108, h: 19, cy: -34.4 },
};
function fitBox(worldW, worldH, centerY) {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  const tanH = Math.tan(camera.fov * Math.PI / 360);
  const needV = worldH / (2 * tanH);
  const needH = worldW / (2 * tanH * (w / h));
  const need = Math.max(needV, needH) * 1.22;
  const ui = (130 / h) * (2 * need * tanH);   // 底部导航条占掉的世界高度
  cam.radius = need + ui * 0.55;
  target.set(0, centerY - ui * 0.25, 0);
  applyCamera();
}
function fitStage(v) {
  const b = STAGE_BOX[v] || STAGE_BOX.all;
  fitBox(b.w, b.h, b.cy);
}
function applyStageView(v) {
  stageView = v;
  nodes.forEach(n => {
    const show = v === 'all' || n.ch.stage === v;
    n.group.visible = show;
    n.labelEl.style.display = show ? '' : 'none';
  });
  edgeObjs.forEach(o => {
    const cf = DATA.chapters.find(c => c.no === o.e.from);
    const ct = DATA.chapters.find(c => c.no === o.e.to);
    const show = v === 'all' || cf.stage === v || ct.stage === v;
    o.tube.visible = show;
    o.dots.forEach(d => { d.visible = false; });
    if (o.cone) o.cone.visible = false;
  });
  termLines.forEach(o => { o.line.visible = v === 'all' || o.stage === v; });
  termLabels.forEach(o => { o.el.style.display = (v === 'all' || o.stage === v) ? '' : 'none'; });
  document.querySelectorAll('#stage-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  fitStage(v);
}
document.querySelectorAll('#stage-seg button').forEach(b => {
  b.addEventListener('click', () => { applyStageView(b.dataset.v); });
});
const initStage = new URLSearchParams(location.search).get('stage');
if (initStage) applyStageView(initStage);
else if (!/ch=\d+/.test(location.hash)) fitStage('all');   // 有 #ch= 深链时让聚焦生效

document.getElementById('btn-reset').addEventListener('click', () => {
  // 重置视角 = 回到正对着看，且保持不旋转（旋转会破坏从上往下的阅读顺序）
  cam.theta = 0; cam.phi = 1.20;
  fitStage(stageView);
  autoSpin = false;
  idleTimer = 0;
  document.getElementById('btn-spin').classList.remove('on');
  applyCamera();
  closePanel();
  setHighlight(null);
});
document.getElementById('btn-spin').addEventListener('click', (ev) => {
  autoSpin = !autoSpin;
  idleTimer = autoSpin ? 3 : 0;
  ev.currentTarget.classList.toggle('on', autoSpin);
});

nodes.forEach(n => {
  if (mastered.has(n.ch.no)) { n.ring.visible = true; n.labelEl.classList.add('mastered'); }
});
updateProgress();

window.addEventListener('resize', () => {
  clearTimeout(window.__fitTimer);
  window.__fitTimer = setTimeout(() => fitStage(stageView), 120);
});

if (location.search.includes('debug')) document.body.classList.add('debug');

tick();
