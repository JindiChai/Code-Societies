// ======================= 全局变量 =======================
let canvas, container, inputBox;

let all = {};     // { word: { embedding: number[], x:number, y:number } }
let anchor = "";  // 当前锚点词
let authToken = ""; // <<< 在此粘贴你的 Auth Token
let isFirstWord = true; // 标记是否为第一个输入
let isFirstDraw = true; // 标记是否为第一次绘制

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

  // 容器：显示提示/错误/排序信息
  container = document.createElement('div');
  container.id = 'container';
  container.style.position = 'absolute';
  container.style.left = '12px';
  container.style.top = '12px';
  container.style.padding = '6px 10px';
  container.style.background = 'rgba(255,255,255,0.85)';
  container.style.font = '14px/1.4 Arial, sans-serif';
  container.style.border = '1px solid #ddd';
  container.style.borderRadius = '8px';
  container.style.maxWidth = '40vw';
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
  inputBox.style.fontFamily = 'Arial';
  inputBox.setAttribute('autocomplete', 'off');
  inputBox.style.padding = '10px 15px';
  inputBox.style.border = '1px solid #bbb';
  inputBox.style.borderRadius = '8px';
  inputBox.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  document.body.appendChild(inputBox);

  // 回车：以当前输入为锚点跑流程
  inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = inputBox.value.trim();
      if (val) startFlow(val);
    }
  });

  // 窗口缩放，重设画布
  window.addEventListener('resize', () => {
    resizeCanvasForDPR();
    // 尺寸变了需要重绘所有内容
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    
    // 清空 hasDrawn 标记，强制重新绘制所有已存在的词
    for (const key in all) {
      if (all[key].hasDrawn) {
        all[key].hasDrawn = false;
      }
    }
    
    // 重新绘制
    if (anchor && all[anchor]) {
      const anchorPos = all[anchor];
      displayEmbeddings(anchorPos.x || null, anchorPos.y || null);
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
}

function handleMouseDown(event) {
  // 检查是否点击在单词上
  const clickedKey = checkWordClick(event.clientX, event.clientY);
  if (clickedKey && clickedKey !== anchor) {
    // 让被点中的词成为新的锚点
    const clickedWord = all[clickedKey];
    if (clickedWord && clickedWord.x !== undefined && clickedWord.y !== undefined) {
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
  ctx.fillStyle = '#fff';
  ctx.fillRect(-5000, -5000, 10000, 10000);
  
  // 先绘制所有连线
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.25;
  
  // 遍历所有词，找出它们的父连接
  for (const key in all) {
    const word = all[key];
    if (!word || !word.x || !word.y || !word.parent) continue;
    
    const parent = all[word.parent];
    if (parent && parent.x !== undefined && parent.y !== undefined) {
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(word.x, word.y);
      ctx.stroke();
    }
  }
  ctx.restore();
  
  // 再绘制所有词
  for (const key in all) {
    const word = all[key];
    if (!word || !word.x || !word.y || !word.hasDrawn) continue;
    
    const isCurrentAnchor = (key === anchor);
    const dotColor = isCurrentAnchor ? '#111' : '#999';
    const textColor = isCurrentAnchor ? '#000' : '#666';
    const fontSize = isCurrentAnchor ? 'bold 20px' : '18px';
    
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

// ======================= 主流程 =======================
async function startFlow(anchorWord, anchorX = null, anchorY = null) {
  anchor = anchorWord;
  
  // 如果是第一次输入，隐藏输入框
  if (isFirstWord) {
    isFirstWord = false;
    inputBox.style.display = 'none';
  }
  
  container.textContent = `Anchor: "${anchor}" — fetching 5 related words (GPT-5) ...`;
  try {
    document.body.style.cursor = "progress";

    // 1) 用 GPT-5 拿 5 个相关词
    const related = await askRelatedWords(anchor);
    if (!related || !related.length) {
      container.textContent = `No related words returned. Try another anchor.`;
      return;
    }

    // 2) 如果是新词，添加到 all 中（不清除旧的）
    if (!all[anchor]) {
      all[anchor] = {};
    }
    related.forEach(w => {
      if (!all[w]) all[w] = {};
    });

    // 3) 请求 embeddings（只请求新词的）
    const newWords = [anchor, ...related].filter(w => !all[w].embedding);
    if (newWords.length > 0) {
      container.textContent = `Anchor: "${anchor}" — getting embeddings for ${newWords.length} words (E5) ...`;
      await getEmbeddings(newWords);
    }

    // 4) 保存锚点位置（如果有传入的话）
    if (anchorX !== null && anchorY !== null) {
      all[anchor].x = anchorX;
      all[anchor].y = anchorY;
    }

    // 5) 绘制（并按相似度排序）
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
  const prompt = `Return exactly a JSON array of 5 English words related to "${word}" in the context of storytelling. The words should evoke emotions, 
  actions, or imagery, not just synonyms.  No extra text. Example: ["a","b","c","d","e"]`;

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
  // 只取 5 个字符串
  arr = (arr || []).map(s => String(s)).filter(Boolean).slice(0, 5);
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

  words.forEach((w, i) => {
    if (!all[w]) all[w] = {};
    all[w].embedding = embeddings[i];
  });
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
    const ctx = canvas.getContext('2d');
  
    // 如果没有指定中心，使用画布中心
    if (cx === null || cy === null) {
      cx = Math.floor(window.innerWidth / 2);
      cy = Math.floor(window.innerHeight / 2);
    }
  
    // 没有锚点或向量就不画
    if (!anchor || !all[anchor] || !all[anchor].embedding) return;
  
    const anchorEmbedding = all[anchor].embedding;
  
    // 找到当前这一轮新生成的词（它们还没有被绘制过）
    const results = [];
    for (const key in all) {
      if (key === anchor) continue;
      const e = all[key]?.embedding;
      if (!e) continue;
      // 只绘制还没有位置的词（新词）或者还没有绘制过的词
      if (!all[key].x || !all[key].y) {
        // 计算相似度用于文本显示（不用于位置）
        const sim = cosineSimilarity(anchorEmbedding, e);
        results.push({ key, similarity: sim });
      }
    }
  
    // 如果没有新词需要绘制，就不继续
    if (!results.length) return;
  
    // 按相似度降序排序（用于文本显示，不影响位置）
    results.sort((a, b) => b.similarity - a.similarity);
  
    // 内外半径：随机距离范围
    const minRadius = 60; // 离中心的最小距离
    const margin = 40;
    const maxPossible = Math.min(window.innerWidth, window.innerHeight) / 2 - margin;
    const maxRadius = Math.max(minRadius + 40, maxPossible); // 防止过小
  
    // ==== 绘制锚点（仅在锚点还没有绘制过时） ====
    if (!all[anchor].hasDrawn) {
      ctx.save();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    
      // 锚点底部画个圆点更醒目
      ctx.beginPath();
      ctx.arc(cx, cy - 18, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
    
      // 锚点文本
      ctx.fillStyle = '#000';
      ctx.fillText(anchor, cx, cy + 6);
      ctx.restore();
      
      // 标记为已绘制
      all[anchor].hasDrawn = true;
    }
    
    // 确保锚点坐标已保存（用于点击检测）
    all[anchor].x = cx;
    all[anchor].y = cy;
  
    // ==== 为每个结果分配角度 ====
    // 均匀分布在 0..2π；你也可以改成基于 key 的 hash 做“稳定角度”
    const N = results.length;
    const TWO_PI = Math.PI * 2;
  
    // 文本样式
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  
    // 先画连线，再画文字，保证文字在上层
    // 计算并缓存每个点的位置
    const placed = [];
  
    for (let i = 0; i < N; i++) {
      const r = results[i];
  
      // 半径：随机分布，视觉上更有趣
      // 在 minRadius 和 maxRadius 之间随机选择
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
  
      // 角度：均匀分布
      const angle = (i / N) * TWO_PI - Math.PI / 2; // 从正上方开始排，更直观
  
      const { x, y } = polarToCartesian(cx, cy, radius, angle);
  
      placed.push({ key: r.key, similarity: r.similarity, x, y, radius, angle });
    }
  
    // ==== 连线 ====
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.25;
    placed.forEach(p => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      // 记录父关系
      if (!all[p.key]) all[p.key] = {};
      all[p.key].parent = anchor;
    });
    ctx.restore();
  
    // ==== 节点与文字 ====
    placed.forEach(p => {
      // 节点小圆
      ctx.beginPath();
      ctx.arc(p.x, p.y - 12, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
  
      // 文本背景（提高可读性）
      const label = p.key;
      const simStr = `(${p.similarity.toFixed(3)})`;
      const fullText = `${label} ${simStr}`;
  
      ctx.save();
      const padX = 6, padY = 3;
      const textW = ctx.measureText(fullText).width;
      const boxW = textW + padX * 2;
      const boxH = 20 + padY * 2;
  
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
  
      // 文字框放在节点下方一点
      const bx = p.x - boxW / 2;
      const by = p.y - boxH / 2 + 10;
  
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeRect(bx, by, boxW, boxH);
  
      ctx.fillStyle = '#000';
      ctx.fillText(fullText, p.x, p.y + 10);
      ctx.restore();
  
      // 存点击用的中心位置（以文本中心为主）
      if (!all[p.key]) all[p.key] = {};
      all[p.key].x = p.x;
      all[p.key].y = p.y + 10; // 文字中心
      all[p.key].hasDrawn = true; // 标记为已绘制
    });
  
    // 容器中也同步展示（按相似度排序）
    const list = results
      .map((r, i) => `${i + 1}. ${r.key} (sim: ${r.similarity.toFixed(3)})`)
      .join('\n');
    container.textContent =
      `Anchor: "${anchor}"\n\nRelated words:\n${list}\n\n` +
      `Layout: radial — random distances for visual variety.`;
    
    // 重新绘制所有内容以应用画布偏移
    redrawAllContent();
  }
  

// 线性映射：把 [inMin, inMax] 的值映射到 [outMin, outMax]
// 这里我们会用到一个“反向映射”（相似度越高半径越小），所以在调用时做反向端点即可
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