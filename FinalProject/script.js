// ======================= 全局变量 =======================
let canvas, container, inputBox, helpButton, helpModal, wordsSliderWrap, wordsSlider, wordsSliderLabel, storyButton, storyModal;
let backgroundGlows = [];
const GLOW_COLORS = ['#F7EFE5', '#C3ACD0', '#7743DB'];

let all = {};     // { word: { embedding: number[], x:number, y:number } }
let anchor = "";  // 当前锚点词
let authToken = ""; // <<< 在此粘贴你的 Auth Token
let isFirstWord = true; // 标记是否为第一个输入
let isFirstDraw = true; // 标记是否为第一次绘制
let hoveredWord = null; // 当前悬停的单词
let isHelpModalOpen = false; // 是否显示帮助弹窗
let relatedCount = 5; // 下一次生成的相关词数量（1-5）
let clickedWords = []; // 保存用户点击过的单词（按时间顺序）

// 画布平移相关
let canvasOffsetX = 0; // 画布X偏移
let canvasOffsetY = 0; // 画布Y偏移
let isDragging = false; // 是否正在拖拽
let dragStartX = 0; // 拖拽起始X
let dragStartY = 0; // 拖拽起始Y
let lastOffsetX = 0; // 拖拽前的偏移X
let lastOffsetY = 0; // 拖拽前的偏移Y

// 代理与模型
const PROXY_URL = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
const E5_VERSION = "beautyyuyanli/multilingual-e5-large:a06276a89f1a902d5fc225a9ca32b6e8e6292b7f3b136518878da97c458e2bad";
const GPT5_MODEL = "openai/gpt-5";

// ======================= 启动 =======================
init();

function init() {
  initInterface();
  // 留空白，等待用户输入
  inputBox.value = "";
  inputBox.placeholder = "Type one word to start";
  animate();
  // 鼠标事件处理
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

// ======================= UI / 动画 =======================
function initInterface() {
  // 画布
  canvas = document.createElement('canvas');
  canvas.id = 'myCanvas';
  canvas.style.position = 'absolute';
  resizeCanvasForDPR(); // 支持高清屏
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  document.body.appendChild(canvas);
  // 初始化背景发光体
  initBackgroundGlows(12);

  // 容器：显示提示/错误/排序信息
  container = document.createElement('div');
  container.id = 'container';
  container.style.position = 'absolute';
  container.style.right = '12px';
  container.style.bottom = '12px';
  container.style.padding = '6px 10px';
  container.style.background = '#F7EFE5';
  container.style.font = '12px/1.4 Arial, sans-serif';
  container.style.border = '1px solid #ddd';
  container.style.borderRadius = '8px';
  container.style.maxWidth = '33vw';
  container.style.zIndex = '10';
  container.textContent = 'Ready.';
  document.body.appendChild(container);

  // 输入框（居中固定）
  inputBox = document.createElement('input');
  inputBox.type = 'text';
  inputBox.id = 'inputBox';
  inputBox.placeholder = 'Type one word to start';
  inputBox.style.position = 'absolute';
  inputBox.style.left = '50%';
  inputBox.style.top = '50%';
  inputBox.style.transform = 'translate(-50%, -50%)';
  inputBox.style.zIndex = '100';
  inputBox.style.fontSize = '24px';
  inputBox.style.fontFamily = 'Inter, Helvetica Neue, Arial, sans-serif';
  inputBox.setAttribute('autocomplete', 'off');
  inputBox.style.padding = '10px 15px';
  inputBox.style.border = '1px solid #bbb';
  inputBox.style.borderRadius = '8px';

  document.body.appendChild(inputBox);

  // 回车：以当前输入为锚点跑流程
  inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = inputBox.value.trim();
      if (val) startFlow(val);
    }
  });

  // 帮助按钮
  helpButton = document.createElement('button');
  helpButton.textContent = 'About Embeddings';
  helpButton.style.position = 'fixed';
  helpButton.style.right = '20px';
  helpButton.style.top = '20px';
  helpButton.style.padding = '8px 12px';
  helpButton.style.borderRadius = '8px';
  helpButton.style.border = '1px solid #C3ACD0';
  helpButton.style.backgroundColor = '#F7EFE5';
  helpButton.style.color = '#000';
  helpButton.style.fontSize = '14px';
  helpButton.style.fontWeight = 'normal';
  helpButton.style.cursor = 'pointer';
  helpButton.style.zIndex = '200';
  helpButton.addEventListener('click', toggleHelpModal);
  document.body.appendChild(helpButton);

  // 帮助弹窗
  helpModal = document.createElement('div');
  helpModal.style.position = 'fixed';
  helpModal.style.right = '40px';
  helpModal.style.top = '40px';
  helpModal.style.width = '400px';
  helpModal.style.maxHeight = '600px';
  helpModal.style.backgroundColor = '#F7EFE5';
  helpModal.style.boxShadow = 'none';
  helpModal.style.border = '#C3ACD0 1px solid';
  helpModal.style.borderRadius = '12px';
  helpModal.style.padding = '20px';
  helpModal.style.zIndex = '201';
  helpModal.style.overflowY = 'auto';
  helpModal.style.display = 'none';
  helpModal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h2 style="margin: 0;">How Embedding AI Works</h2>
      <button id="closeHelp" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
    </div>
    <div style="line-height: 1.6; color: #333;">
      <p><strong>What are Embeddings?</strong></p>
      <p>Embeddings convert words into numerical vectors (arrays of numbers) that capture semantic meaning. Similar words have similar vectors.</p>
      
      <p><strong>How Neural Networks Think:</strong></p>
      <p>1. <strong>Training:</strong> The AI model (E5) learns from millions of texts, finding patterns in how words relate.</p>
      <p>2. <strong>Vectorization:</strong> Each word becomes a point in high-dimensional space (768 dimensions for E5).</p>
      <p>3. <strong>Semantic Relationships:</strong> Words with similar meanings cluster together. For example, "love" and "heart" are closer than "love" and "car".</p>
      
      <p><strong>How We Use It:</strong></p>
      <p>1. GPT-5 finds related words in context.</p>
      <p>2. E5 converts all words to 768-dimensional vectors.</p>
      <p>3. We calculate cosine similarity to find how "close" words are in meaning space.</p>
      <p>4. Words are visualized in 2D based on their relationships.</p>
      
      <p><strong>The Visualization:</strong></p>
      <p>Each word's position shows its relationship to others. Hover to see connections highlight. Click to explore new word relationships.</p>
      
      <p style="margin-top: 20px; font-size: 12px; color: #888;">Distance between words in this visualization represents semantic similarity as measured by neural network embeddings.</p>
    </div>
  `;
  document.body.appendChild(helpModal);
  
  // 关闭按钮事件
  document.getElementById('closeHelp').addEventListener('click', toggleHelpModal);

  // 相关词数量滑杆
  wordsSliderWrap = document.createElement('div');
  wordsSliderWrap.style.position = 'fixed';
  wordsSliderWrap.style.right = '20px';
  wordsSliderWrap.style.top = '70px';
  wordsSliderWrap.style.zIndex = '200';
  wordsSliderWrap.style.padding = '8px 10px';
  wordsSliderWrap.style.background = '#F7EFE5';
  wordsSliderWrap.style.border = '1px solid #C3ACD0';
  wordsSliderWrap.style.borderRadius = '8px';
  wordsSliderWrap.style.font = '14px/1.4 Arial, sans-serif';

  wordsSliderLabel = document.createElement('div');
  wordsSliderLabel.textContent = `Words: ${relatedCount}`;
  wordsSliderLabel.style.marginBottom = '6px';
  wordsSliderWrap.appendChild(wordsSliderLabel);

  wordsSlider = document.createElement('input');
  wordsSlider.type = 'range';
  wordsSlider.min = '1';
  wordsSlider.max = '5';
  wordsSlider.step = '1';
  wordsSlider.value = String(relatedCount);
  wordsSlider.style.width = '140px';
  // 滑杆主色
  wordsSlider.style.accentColor = '#7743DB';
  wordsSlider.addEventListener('input', () => {
    relatedCount = Math.max(1, Math.min(5, parseInt(wordsSlider.value, 10) || 5));
    wordsSliderLabel.textContent = `Words: ${relatedCount}`;
  });
  wordsSliderWrap.appendChild(wordsSlider);
  document.body.appendChild(wordsSliderWrap);

  // 故事生成按钮（位于滑杆下方）
  storyButton = document.createElement('button');
  storyButton.textContent = 'Generate Story';
  storyButton.style.position = 'fixed';
  storyButton.style.right = '20px';
  storyButton.style.top = '160px';
  storyButton.style.zIndex = '200';
  storyButton.style.padding = '8px 12px';
  storyButton.style.border = '1px solid #C3ACD0';
  storyButton.style.borderRadius = '8px';
  storyButton.style.background = '#F7EFE5';
  storyButton.style.color = '#000';
  storyButton.style.cursor = 'pointer';
  storyButton.style.font = '14px/1.4 Arial, sans-serif';
  storyButton.addEventListener('click', handleGenerateStoryClick);
  document.body.appendChild(storyButton);

  // 故事弹窗
  storyModal = document.createElement('div');
  storyModal.style.position = 'fixed';
  storyModal.style.right = '40px';
  storyModal.style.top = '40px';
  storyModal.style.width = '480px';
  storyModal.style.maxHeight = '70vh';
  storyModal.style.backgroundColor = '#F7EFE5';
  storyModal.style.boxShadow = 'none';
  storyModal.style.border = '#C3ACD0 1px solid';
  storyModal.style.borderRadius = '12px';
  storyModal.style.padding = '20px';
  storyModal.style.zIndex = '201';
  storyModal.style.overflowY = 'auto';
  storyModal.style.display = 'none';
  storyModal.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <span id="storyWords" style="font-size:13px;color:#666;line-height:1.2;word-break:break-all;max-width:350px;"></span>
      <button id="closeStory" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
    </div>
    <div id="storyContent" style="line-height: 1.7; color: #222; white-space: pre-wrap;"></div>
  `;
  document.body.appendChild(storyModal);
  document.getElementById('closeStory').addEventListener('click', () => toggleStoryModal(false));

  // 窗口缩放，重设画布
  window.addEventListener('resize', () => {
    resizeCanvasForDPR();
  
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFBF5';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  
    // 不再逐个清 hasDrawn；让点保持
    // 只需要按当前窗口重新把 px/py 映射到像素坐标
    updateLayoutFromProjections();
    redrawAllContent();
  });
}

function animate() {
  // 每帧重绘，确保背景发光体平滑移动
  redrawAllContent();
  requestAnimationFrame(animate);
}

function handleMouseDown(event) {
  // 检查是否点击在单词上
  const clickedKey = checkWordClick(event.clientX, event.clientY);
  if (clickedKey && clickedKey !== anchor) {
    // 让被点中的词成为新的锚点
    const clickedWord = all[clickedKey];
    if (clickedWord && clickedWord.x !== undefined && clickedWord.y !== undefined) {
      // 记录点击的单词并输出到控制台
      clickedWords.push(clickedKey);
      console.log('Clicked words:', clickedWords);
      startFlow(clickedKey, clickedWord.x, clickedWord.y);
    }
    return;
  }
  
  // 开始拖拽画布
  isDragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  lastOffsetX = canvasOffsetX;
  lastOffsetY = canvasOffsetY;
  document.body.style.cursor = 'grabbing';
}

function handleMouseMove(event) {
  if (isDragging) {
    // 计算拖拽偏移
    canvasOffsetX = lastOffsetX + event.clientX - dragStartX;
    canvasOffsetY = lastOffsetY + event.clientY - dragStartY;
    redrawAllContent();
    return;
  }
  
  // 检测鼠标悬停
  const hovered = checkWordClick(event.clientX, event.clientY);
  if (hovered !== hoveredWord) {
    hoveredWord = hovered;
    redrawAllContent();
  }
}

function handleMouseUp(event) {
  if (isDragging) {
    isDragging = false;
    document.body.style.cursor = 'auto';
  }
}

function checkWordClick(x, y) {
  // 考虑画布偏移，将屏幕坐标转换为画布坐标
  const canvasX = x - canvasOffsetX;
  const canvasY = y - canvasOffsetY;
  
  for (const key in all) {
    const w = all[key];
    if (!w || typeof w.x !== 'number' || typeof w.y !== 'number') continue;
    const dx = canvasX - w.x;
    const dy = canvasY - w.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30) { // 30px 点击半径
      return key;
    }
  }
  return null;
}

function resizeCanvasForDPR() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 逻辑像素绘制
}

function redrawAllContent() {
  const ctx = canvas.getContext('2d');
  
  // 清屏
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 保存原始变换
  ctx.save();
  
  // 应用画布偏移
  ctx.translate(canvasOffsetX, canvasOffsetY);
  
  // 绘制白底（扩展到更大的范围以支持平移）
  ctx.fillStyle = '#FFFBF5';
  ctx.fillRect(-5000, -5000, 10000, 10000);

  // 绘制与更新背景发光体
  drawBackgroundGlows(ctx);
  
  // 悬停时：高亮用户此前选择过的所有单词及其连线
  const useSelectedHighlight = !!hoveredWord && clickedWords && clickedWords.length > 0;
  const selectedSet = useSelectedHighlight ? new Set(clickedWords) : new Set();
  
  // 先绘制所有连线
  // 遍历所有词，找出它们的父连接
  for (const key in all) {
    const word = all[key];
    if (!word || !word.x || !word.y || !word.parent) continue;
    
    const parent = all[word.parent];
    if (parent && parent.x !== undefined && parent.y !== undefined) {
      // 线条颜色统一为 #C3ACD0；只有两端都被选择时加粗
      const isHighlighted = useSelectedHighlight && selectedSet.has(key) && selectedSet.has(word.parent);
      ctx.save();
      ctx.strokeStyle = '#C3ACD0';
      ctx.lineWidth = isHighlighted ? 2 : 1.25;
      
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(word.x, word.y);
      ctx.stroke();
      ctx.restore();
    }
  }
  
  // 再绘制所有词
  for (const key in all) {
    const word = all[key];
    if (!word || !word.x || !word.y || !word.hasDrawn) continue;
    
    const isCurrentAnchor = (key === anchor);
    const isSelected = useSelectedHighlight && selectedSet.has(key);
    
    // 根据状态决定颜色
    let dotColor = '#999';
    let textColor = '#666';
    let fontSize = '18px';
    
    if (isSelected) {
      dotColor = '#7743DB';
      textColor = '#7743DB';
      fontSize = 'bold 20px';
    } else if (isCurrentAnchor) {
      dotColor = '#111';
      textColor = '#000';
      fontSize = 'bold 20px';
    } else {
      // 默认样式
      dotColor = '#999';
      textColor = '#666';
      fontSize = '18px';
    }
    
    ctx.save();
    ctx.fillStyle = dotColor;
    ctx.font = `${fontSize} Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.beginPath();
    ctx.arc(word.x, word.y - 18, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = textColor;
    ctx.fillText(key, word.x, word.y + 6);
    ctx.restore();
  }
  
  // 恢复变换
  ctx.restore();
}

// 初始化背景发光体
function initBackgroundGlows(count) {
  backgroundGlows = [];
  for (let i = 0; i < count; i++) {
    const color = GLOW_COLORS[i % GLOW_COLORS.length];
    const radius = randBetween(80, 180);
    backgroundGlows.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: randBetween(-0.12, 0.12),
      vy: randBetween(-0.12, 0.12),
      r: radius,
      color,
      alpha: 0.22 + Math.random() * 0.18,
    });
  }
}

// 绘制背景发光体
function drawBackgroundGlows(ctx) {
  ctx.save();
  // 使用常规混合，避免亮色叠加变白
  ctx.globalCompositeOperation = 'source-over';
  backgroundGlows.forEach(g => {
    // 更新位置（缓慢移动，穿屏循环）
    g.x += g.vx;
    g.y += g.vy;
    if (g.x < -g.r) { g.x = window.innerWidth + g.r; }
    if (g.x > window.innerWidth + g.r) { g.x = -g.r; }
    if (g.y < -g.r) { g.y = window.innerHeight + g.r; }
    if (g.y > window.innerHeight + g.r) { g.y = -g.r; }

    // 根据颜色调整内外透明度，浅色更低透明避免发白
    const innerAlpha = getInnerAlpha(g.color, g.alpha);
    const outerAlpha = 0.0;
    const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
    grad.addColorStop(0, hexToRgba(g.color, innerAlpha));
    grad.addColorStop(1, hexToRgba(g.color, outerAlpha));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

// 根据颜色返回更合适的中心不透明度，避免整体发白
function getInnerAlpha(hex, baseAlpha) {
  // 粗略计算亮度
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b; // 0-255
  // 亮色（高亮度）降低透明度，暗色可以更浓一点
  if (luminance > 220) return Math.min(0.12, baseAlpha * 0.6); // 非常浅：#F7EFE5
  if (luminance > 170) return Math.min(0.18, baseAlpha * 0.8); // 中浅：#C3ACD0
  return Math.min(0.35, Math.max(0.18, baseAlpha)); // 深色：#7743DB
}

// 切换帮助弹窗显示
function toggleHelpModal() {
  isHelpModalOpen = !isHelpModalOpen;
  if (helpModal) {
    helpModal.style.display = isHelpModalOpen ? 'block' : 'none';
  }
}

// 打开/关闭故事弹窗
function toggleStoryModal(show) {
  if (!storyModal) return;
  storyModal.style.display = show ? 'block' : 'none';
}

// 处理“生成故事”点击
async function handleGenerateStoryClick() {
  const span = document.getElementById('storyWords');
  if (span) span.textContent = (clickedWords && clickedWords.length ? clickedWords.join(', ') : '');
  try {
    if (!clickedWords || clickedWords.length === 0) {
      toggleStoryModal(true);
      const content = document.getElementById('storyContent');
      if (content) content.textContent = 'No words yet. Click words on the canvas to build your story path.';
      return;
    }

    // 显示加载中
    toggleStoryModal(true);
    const content = document.getElementById('storyContent');
    if (content) content.textContent = 'Generating story...';

    const story = await askStoryFromWords(clickedWords);
    if (content) content.textContent = story || 'Failed to generate story.';
  } catch (e) {
    const content = document.getElementById('storyContent');
    if (content) content.textContent = 'Error: ' + (e && e.message ? e.message : String(e));
  }
}

// 调用 GPT-5：根据点击过的词生成故事
async function askStoryFromWords(words) {
  const distinct = Array.from(new Set((words || []).map(String).filter(Boolean)));
  const seed = distinct.join(', ');
  const prompt = `You are a storyteller. Write a short story that focus on ALL of these words as the main objective in chronological order, avoid extra context: [${seed}]. The story should avoiding a simple list, include all the words in the story, and the story should be coherent, use simple words. Output only the story text.`;

  const data = {
    model: GPT5_MODEL,
    input: { prompt }
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  };

  const raw = await fetch(PROXY_URL, options);
  const json = await raw.json();
  if (json.error) throw new Error(json.error);
  if (!json.output) throw new Error('No output from GPT-5 proxy.');

  const text = Array.isArray(json.output) ? json.output.join('') : String(json.output);
  return text.trim();
}

// 找到与指定词相连的所有词
function findConnectedWords(wordKey) {
  const connected = new Set();
  if (!wordKey) return connected;
  
  // 添加自己
  connected.add(wordKey);
  
  // 找到所有子词（该词作为父的词）
  for (const key in all) {
    const word = all[key];
    if (word && word.parent === wordKey) {
      connected.add(key);
    }
  }
  
  // 找到父词
  const word = all[wordKey];
  if (word && word.parent) {
    connected.add(word.parent);
    // 也加入父词的其他子词
    for (const key in all) {
      const otherWord = all[key];
      if (otherWord && otherWord.parent === word.parent) {
        connected.add(key);
      }
    }
  }
  
  return connected;
}

// ======================= 主流程 =======================
async function startFlow(anchorWord, anchorX = null, anchorY = null) {
  anchor = anchorWord;
  
  // 如果是第一次输入，隐藏输入框
  if (isFirstWord) {
    if (!clickedWords.includes(anchorWord)) {
      clickedWords.push(anchorWord);
      console.log('Clicked words:', clickedWords);
    }
    isFirstWord = false;
    inputBox.style.display = 'none';
  }
  
  container.textContent = `Anchor: "${anchor}" — fetching ${Math.max(1, Math.min(relatedCount, 5))} related words (GPT-5) ...`;
  try {
    document.body.style.cursor = "progress";

    // 1) 用 GPT-5 拿 N 个相关词
    const related = await askRelatedWords(anchor);
    if (!related || !related.length) {
      container.textContent = `No related words returned. Try another anchor.`;
      return;
    }

    // 2) 如果是新词，添加到 all 中（不清除旧的）
    if (!all[anchor]) { all[anchor] = {}; }
    related.forEach(w => {
      if (!all[w]) all[w] = {};
    });

    // 3) 请求 embeddings
    const newWords = [anchor, ...related].filter(w => !all[w].embedding);
    if (newWords.length > 0) {
      container.textContent = `Anchor: "${anchor}" — getting embeddings for ${newWords.length} words (E5) ...`;
      await getEmbeddings(newWords);
    }

    // 3.5) ⬇️ 新增：把这一轮的相关词与锚点建立关系 + 做一个“来源锚点”标记
    related.forEach(w => {
      all[w].parent = anchor;               // 用于连线
      all[w].__lastFromAnchor = anchor;     // 用于本轮列表展示
    });

    // 4) 如果给了 anchor 位置（点击传入），保留；否则 x/y 由投影布局决定
    if (anchorX !== null && anchorY !== null) {
      all[anchor].x = anchorX;
      all[anchor].y = anchorY;
      all[anchor].hasDrawn = true;
    }

    // 5) 展示（只负责信息和刷新；不再做随机极坐标布局）
    displayEmbeddings(anchorX, anchorY);


  } catch (err) {
    console.error(err);
    container.textContent = `Error: ${err.message || err}`;
  } finally {
    document.body.style.cursor = "auto";
  }
}

// ======================= GPT-5：相关词 =======================
async function askRelatedWords(word) {
  const n = Math.max(1, Math.min(relatedCount, 5));
  const prompt = `Return exactly a JSON array of ${n} English words related to "${word}" with the purpose ofstorytelling. The words should be daily life words, not just synonyms. Output only JSON array, no extra text. Example format: ["a","b","c"]`;

  const data = {
    model: GPT5_MODEL,
    input: { prompt }
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  };

  const raw = await fetch(PROXY_URL, options);
  const json = await raw.json();

  if (json.error) throw new Error(json.error);
  if (!json.output) throw new Error("No output from GPT-5 proxy.");

  // 代理通常把文本分片放在 output 数组里，这里合并后再 parse
  let text = Array.isArray(json.output) ? json.output.join("") : String(json.output);
  let arr;
  try {
    arr = JSON.parse(text);
  } catch (e) {
    throw new Error("Failed to parse GPT-5 output as JSON array. Raw: " + text);
  }
  // 只取 n 个字符串
  arr = (arr || []).map(s => String(s)).filter(Boolean).slice(0, n);
  return arr;
}

// ======================= E5：获取向量 =======================
async function getEmbeddings(words) {
  if (!words || !words.length) return;

  const data = {
    version: E5_VERSION,
    input: { texts: JSON.stringify(words) },
  };

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  };

  const raw = await fetch(PROXY_URL, options);
  const json = await raw.json();

  if (json.error) throw new Error(json.error);

  const embeddings = json.output;
  if (!embeddings || embeddings.length !== words.length) {
    throw new Error("Mismatch between texts and embeddings length.");
  }

  // 在 getEmbeddings(words) 的末尾，forEach 后面继续：
  words.forEach((w, i) => {
    if (!all[w]) all[w] = {};
    all[w].embedding = embeddings[i];

    // ⬇️ 新增：只要还没有 px/py，就生成一次并缓存（确保单词位置稳定）
    if (all[w].px === undefined || all[w].py === undefined) {
      const { px, py } = projectEmbeddingTo2D(all[w].embedding);
      all[w].px = px;
      all[w].py = py;
    }
  });

  // ⬇️ 新增：每次有新点进来后，更新一次画布像素布局
  updateLayoutFromProjections();

}

// ======================= 固定投影到 2D（确保位置稳定） =======================
// 固定随机种子，确保每次页面运行都使用同一个投影矩阵
const PROJ_SEED = 20251030;

// 简单的可重复伪随机数（Mulberry32）
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 生成固定的投影矩阵 R:[dim x 2]
let PROJ_R = null;
function ensureProjectionMatrix(dim) {
  if (PROJ_R && PROJ_R.length === dim) return;
  const rng = mulberry32(PROJ_SEED);
  // 两个单位向量列
  const r1 = new Array(dim).fill(0).map(() => (rng() * 2 - 1));
  const r2 = new Array(dim).fill(0).map(() => (rng() * 2 - 1));
  // 简单单位化
  const n1 = Math.sqrt(r1.reduce((s,v)=>s+v*v,0)) || 1;
  const n2 = Math.sqrt(r2.reduce((s,v)=>s+v*v,0)) || 1;
  for (let i=0;i<dim;i++){ r1[i]/=n1; r2[i]/=n2; }
  PROJ_R = [r1, r2]; // 形状: [2][dim]，访问时用 PROJ_R[0][i], PROJ_R[1][i]
}

// 将 embedding 映射为稳定的 2D 坐标（投影空间坐标，不是画布像素）
function projectEmbeddingTo2D(vec) {
  if (!vec || !vec.length) return {px:0, py:0};
  ensureProjectionMatrix(vec.length);
  let x = 0, y = 0;
  for (let i = 0; i < vec.length; i++) {
    x += vec[i] * PROJ_R[0][i];
    y += vec[i] * PROJ_R[1][i];
  }
  return { px: x, py: y };
}

// 根据所有已知 px/py，把它们映射到画布像素坐标（保持位置稳定，只做线性缩放和平移）
function updateLayoutFromProjections() {
  // 1) 收集所有已有投影点
  const pts = [];
  for (const key in all) {
    const w = all[key];
    if (!w || w.px === undefined || w.py === undefined) continue;
    pts.push({key, px: w.px, py: w.py});
  }
  if (pts.length === 0) return;

  // 2) 计算边界
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.px < minX) minX = p.px;
    if (p.px > maxX) maxX = p.px;
    if (p.py < minY) minY = p.py;
    if (p.py > maxY) maxY = p.py;
  }
  // 避免除以 0
  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }

  const margin = 120; // 画布边距
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 3) 线性映射到画布坐标
  for (const p of pts) {
    const x = mapRange(p.px, minX, maxX, margin, w - margin);
    const y = mapRange(p.py, minY, maxY, margin, h - margin);
    // 保存在 all 中作为最终像素位置
    if (!all[p.key]) all[p.key] = {};
    all[p.key].x = x;
    all[p.key].y = y;
    all[p.key].hasDrawn = true; // 统一标记已可绘制
  }

  // 4) 轻量级碰撞消解，避免单词重叠
  resolveOverlaps(44, 10, margin);
}

// ======================= 碰撞消解（简易力导引） =======================
// minDist: 最小间距（px）；iterations: 迭代次数；margin: 与画布边界保持的安全距离
function resolveOverlaps(minDist = 44, iterations = 10, margin = 80) {
  const keys = Object.keys(all).filter(k => all[k] && typeof all[k].x === 'number' && typeof all[k].y === 'number');
  if (keys.length <= 1) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDistSq = minDist * minDist;

  for (let iter = 0; iter < iterations; iter++) {
    let anyMoved = false;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const ki = keys[i];
        const kj = keys[j];
        const ai = all[ki];
        const aj = all[kj];
        if (!ai || !aj) continue;
        let dx = ai.x - aj.x;
        let dy = ai.y - aj.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1e-6) {
          // 完全重合，随机一个小方向
          dx = (Math.random() - 0.5) * 0.01;
          dy = (Math.random() - 0.5) * 0.01;
          distSq = dx * dx + dy * dy;
        }
        if (distSq < minDistSq) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5; // 两点各让一半
          const nx = dx / dist;
          const ny = dy / dist;
          ai.x += nx * overlap;
          ai.y += ny * overlap;
          aj.x -= nx * overlap;
          aj.y -= ny * overlap;
          anyMoved = true;
        }
      }
    }
    // 约束在画布内边距范围
    if (anyMoved) {
      for (const k of keys) {
        const a = all[k];
        if (!a) continue;
        if (a.x < margin) a.x = margin;
        if (a.x > width - margin) a.x = width - margin;
        if (a.y < margin) a.y = margin;
        if (a.y > height - margin) a.y = height - margin;
      }
    } else {
      break; // 没有移动，提前退出
    }
  }
}


// ======================= 相似度 & 可视化 =======================
function cosineSimilarity(a, b) {
  if (!a || !b) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? (dot / denom) : 0;
}

function displayEmbeddings(cx = null, cy = null) {
  // 必须有锚点 & 向量
  if (!anchor || !all[anchor] || !all[anchor].embedding) return;
  const anchorEmbedding = all[anchor].embedding;

  // 汇总：这次涉及的“可绘制”目标（未必都是新词，但我们会列相似度）
  const results = [];
  for (const key in all) {
    if (key === anchor) continue;
    const e = all[key]?.embedding;
    if (!e) continue;
    // 只统计和锚点有关联的（即这次由 GPT 返回的孩子词或已有的 parent=anchor）
    if (all[key].parent === anchor || all[key].__lastFromAnchor === anchor) {
      const sim = cosineSimilarity(anchorEmbedding, e);
      results.push({ key, similarity: sim });
    }
  }

  // 容器文本：按相似度排序展示
  results.sort((a, b) => b.similarity - a.similarity);
  const list = results
    .map((r, i) => `${i + 1}. ${r.key} (sim: ${r.similarity.toFixed(3)})`)
    .join('\n');
  container.textContent =
    `Anchor: "${anchor}"\n\nRelated words:\n${list}\n\n` +
    `Layout: stable 2D projection (seeded).`;

  // 确保锚点可绘制（x/y 由全局布局决定）
  all[anchor].hasDrawn = true;

  // 刷新像素布局并重绘
  updateLayoutFromProjections();
  redrawAllContent();
}

  

// 检测位置是否与已有词发生冲突
function checkCollision(x, y, placed, all) {
  const minDistance = 80; // 最小间距（像素）
  
  // 检查与当前轮次已放置的词
  for (const item of placed) {
    const dx = x - item.x;
    const dy = y - item.y;
    const dist = Math.hypot(dx, dy);
    if (dist < minDistance) {
      return true;
    }
  }
  
  // 检查与已存在的所有词
  for (const key in all) {
    const word = all[key];
    if (word && word.x !== undefined && word.y !== undefined) {
      const dx = x - word.x;
      const dy = y - word.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDistance) {
        return true;
      }
    }
  }
  
  return false;
}

// 线性映射：把 [inMin, inMax] 的值映射到 [outMin, outMax]
// 这里我们会用到一个"反向映射"（相似度越高半径越小），所以在调用时做反向端点即可
function mapRange(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return (outMin + outMax) / 2;
    const t = (value - inMin) / (inMax - inMin);
    return outMin + t * (outMax - outMin);
  }
  
  // 极坐标转笛卡尔
  function polarToCartesian(cx, cy, r, angleRad) {
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  }