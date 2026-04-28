const STORAGE_KEY = 'tixx_image_generator_v1';
const state = loadState();

const el = {
  productImageInput: document.getElementById('productImageInput'),
  frameImageInput: document.getElementById('frameImageInput'),
  productPreview: document.getElementById('productPreview'),
  framePreview: document.getElementById('framePreview'),
  productName: document.getElementById('productName'),
  brandName: document.getElementById('brandName'),
  productParams: document.getElementById('productParams'),
  sp1: document.getElementById('sp1'),
  sp2: document.getElementById('sp2'),
  sp3: document.getElementById('sp3'),
  targetLang: document.getElementById('targetLang'),
  category: document.getElementById('category'),
  scene: document.getElementById('scene'),
  style: document.getElementById('style'),
  customScene: document.getElementById('customScene'),
  inpaintRequest: document.getElementById('inpaintRequest'),
  output: document.getElementById('output'),
  previewCanvas: document.getElementById('previewCanvas'),
  genPreprocessBtn: document.getElementById('genPreprocessBtn'),
  genPlanBtn: document.getElementById('genPlanBtn'),
  genRenderPromptBtn: document.getElementById('genRenderPromptBtn'),
  genInpaintPromptBtn: document.getElementById('genInpaintPromptBtn'),
  copyPromptBtn: document.getElementById('copyPromptBtn'),
  exportTxtBtn: document.getElementById('exportTxtBtn'),
  exportPngBtn: document.getElementById('exportPngBtn'),
  clearAllBtn: document.getElementById('clearAllBtn')
};

const productImg = new Image();
const frameImg = new Image();
let productLoaded = false;
let frameLoaded = false;

init();

function init() {
  bindInputs();
  restoreForm();
  restoreImages();
  drawPreview();
}

function bindInputs() {
  el.productImageInput.addEventListener('change', e => readImageFile(e.target.files[0], true));
  el.frameImageInput.addEventListener('change', e => readImageFile(e.target.files[0], false));

  [
    'productName', 'brandName', 'productParams', 'sp1', 'sp2', 'sp3', 'targetLang',
    'category', 'scene', 'style', 'customScene', 'inpaintRequest'
  ].forEach(id => {
    el[id].addEventListener('input', () => {
      saveState();
      drawPreview();
    });
  });

  el.genPreprocessBtn.addEventListener('click', () => writeOutput(generatePreprocessPrompt()));
  el.genPlanBtn.addEventListener('click', () => writeOutput(generatePlan()));
  el.genRenderPromptBtn.addEventListener('click', () => writeOutput(generateRenderPrompt()));
  el.genInpaintPromptBtn.addEventListener('click', () => writeOutput(generateInpaintPrompt()));
  el.copyPromptBtn.addEventListener('click', copyPrompt);
  el.exportTxtBtn.addEventListener('click', exportPromptTxt);
  el.exportPngBtn.addEventListener('click', exportPreviewPng);
  el.clearAllBtn.addEventListener('click', clearAll);
}

function readImageFile(file, isProduct) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    if (isProduct) {
      productImg.onload = () => { productLoaded = true; drawPreview(); };
      productImg.src = dataUrl;
      el.productPreview.src = dataUrl;
      el.productPreview.style.display = 'block';
      state.productImage = dataUrl;
    } else {
      frameImg.onload = () => { frameLoaded = true; drawPreview(); };
      frameImg.src = dataUrl;
      el.framePreview.src = dataUrl;
      el.framePreview.style.display = 'block';
      state.frameImage = dataUrl;
    }
    saveState();
  };
  reader.readAsDataURL(file);
}

function drawPreview() {
  const canvas = el.previewCanvas;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#fff6ec');
  grd.addColorStop(1, '#ffe7d1');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  roundRect(ctx, 25, 25, 750, 750, 26, true);

  const title = suggestTitle();
  const subtitle = suggestSubtitle();
  const points = getSellingPoints();

  ctx.fillStyle = '#1d1d1f';
  ctx.font = 'bold 42px -apple-system, sans-serif';
  drawTextBlock(ctx, title, 55, 120, 285, 50);
  ctx.fillStyle = '#4f5b76';
  ctx.font = '500 24px -apple-system, sans-serif';
  drawTextBlock(ctx, subtitle, 55, 220, 285, 34);

  let y = 300;
  points.forEach((p, i) => {
    ctx.fillStyle = '#ff8d3b';
    ctx.beginPath();
    ctx.arc(67, y - 9, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2a44';
    ctx.font = '600 22px -apple-system, sans-serif';
    drawTextBlock(ctx, `${iconHint(i)} ${p}`, 88, y, 250, 30);
    y += 64;
  });

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ctx, 45, 620, 250, 130, 14, true);
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 17px -apple-system, sans-serif';
  drawTextBlock(ctx, sceneSuggestion(), 58, 660, 220, 24);

  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath();
  ctx.ellipse(560, 640, 165, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  if (productLoaded) {
    drawContain(ctx, productImg, 390, 120, 370, 520);
  } else {
    ctx.fillStyle = '#c8d2e4';
    roundRect(ctx, 410, 150, 320, 440, 14, true);
    ctx.fillStyle = '#73819a';
    ctx.font = '600 20px -apple-system, sans-serif';
    ctx.fillText('产品主体预览区', 478, 380);
  }

  if (frameLoaded) {
    ctx.drawImage(frameImg, 0, 0, w, h);
  } else {
    ctx.strokeStyle = '#ffd2ae';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
  }
}

function generatePreprocessPrompt() {
  return `Please enhance this product photo into a high-resolution white-background e-commerce product image.
Fix low light, blur, noise, poor exposure and uneven color.
Remove the messy background and create a clean pure white background.
Keep the product shape, structure, logo, material, color and proportion exactly the same.
Preserve complex edges, transparent parts, metal reflections, glossy surfaces and realistic shadows.
Do not make the product look plastic, fake, cartoonish or over-smoothed.
Do not add extra parts.
Output a clean, sharp, realistic product cutout suitable for TikTok Shop product image generation.`;
}

function generatePlan() {
  const pts = getSellingPoints();
  const lines = pts.map((p, i) => `${i + 1}) ${p}\n   - Icon: ${iconHint(i)}\n   - Visual: ${visualHint(i)}`).join('\n');
  return `【印尼 TikTok 主图方案】
Title: ${suggestTitle()}
Subtitle: ${suggestSubtitle()}

三个核心卖点：
${lines}

使用场景蒙版建议：
- ${sceneSuggestion()}

主图布局（固定）：
- 画布尺寸：800x800
- 右侧：产品主体，占画面55%-65%
- 左侧：主标题、副标题、3个卖点ICON
- 左下角：小场景蒙版
- 底部：用户上传主图框（保持不变）
- 背景：浅橙渐变或温馨家居色调
- 产品底部：柔和接触阴影
- 产品不能贴边；文字必须清晰可读`;
}

function generateRenderPrompt() {
  const categoryFx = categoryEffects(el.category.value, `${el.productName.value} ${el.productParams.value}`);
  const localized = localizeBenefits(getSellingPoints().join('; ') + '; ' + el.productParams.value);
  return `[Role]
You are a senior e-commerce product image designer for TikTok Shop Indonesia.

[Task]
Create a high-conversion 1:1 product main image for Indonesian TikTok Shop.

[Input]
Product name: ${el.productName.value || 'N/A'}
Brand: ${el.brandName.value || 'Tixx'}
Product parameters: ${el.productParams.value || 'N/A'}
Core selling points: ${getSellingPoints().join(' | ')}
Target language: ${el.targetLang.value}
Scene style: ${el.style.value}
Main image frame: uploaded PNG frame, keep unchanged

[Visual Requirements]
- 800x800 square image
- Apple-like clean commercial design
- warm home atmosphere
- realistic product rendering
- no distortion
- keep the product shape, color, logo and material exactly the same
- product placed on the right side, occupying about 60% of the canvas
- left side includes one title, one subtitle, and three selling points with icons
- add one small lifestyle usage scene mask at bottom-left
- use soft orange gradient background suitable for Tixx brand
- add realistic light, shadow, reflection and perspective
- keep the uploaded main image frame unchanged
- PNG output

[Indonesia Localization]
${localized}

[Category Effects]
${categoryFx}

[Prohibitions]
- Do not change the product structure
- Do not change the brand logo
- Do not invent extra buttons or parts
- Do not make the product look cartoonish
- Do not make the edges look like paper cutout
- Do not use messy background
- Do not use unreadable text
- Do not crop the main image frame
- Do not distort the frame`;
}

function generateInpaintPrompt() {
  const req = el.inpaintRequest.value.trim() || 'Refine the selected local area with better commercial details.';
  return `Please only modify the selected area.
Keep all other parts unchanged.
Modification request:
${req}
Maintain the same lighting, perspective, color tone and commercial e-commerce style.
Do not change the product body, logo, frame or existing readable text.`;
}

function suggestTitle() {
  const name = el.productName.value || 'Smart Home Appliance';
  if (el.targetLang.value === '印尼语') return `${name} • Pilihan Keluarga`; 
  if (el.targetLang.value === '印尼语+英文') return `${name} • Hemat Listrik / Energy Saving`;
  return `${name} • Better Everyday Living`;
}

function suggestSubtitle() {
  const p = getSellingPoints()[0] || 'Hemat listrik & nyaman untuk keluarga';
  if (el.targetLang.value === '英文') return `Fast, quiet, and family-friendly performance`;
  if (el.targetLang.value === '印尼语+英文') return `${p} / Fast, quiet, family-safe`;
  return `${p}，适合印尼家庭日常使用`;
}

function getSellingPoints() {
  return [el.sp1.value, el.sp2.value, el.sp3.value].filter(Boolean).length
    ? [el.sp1.value || '节能省电', el.sp2.value || '安静运行', el.sp3.value || '家庭友好']
    : ['节能省电', '安静运行', '家庭友好'];
}

function sceneSuggestion() {
  if (el.scene.value === '自定义') return el.customScene.value || 'Custom lifestyle scene';
  const map = {
    '现代雅加达公寓': 'Modern Jakarta apartment kitchen',
    '印尼家庭厨房': 'Cozy Indonesian family kitchen',
    '小户型卧室': 'Compact boarding house bedroom',
    '客厅': 'Warm Indonesian family living room',
    '洗衣区': 'Laundry corner with clean floor'
  };
  return map[el.scene.value] || 'Indonesian home scene';
}

function localizeBenefits(text) {
  const dict = [
    ['energy saving', 'Hemat listrik'],
    ['quiet operation', 'Tidak berisik'],
    ['fast cooling', 'Cepat dingin'],
    ['large capacity', 'Kapasitas besar'],
    ['safe for family', 'Aman untuk keluarga'],
    ['easy to clean', 'Mudah dibersihkan'],
    ['strong suction', 'Daya hisap kuat'],
    ['hot and cold water', 'Air panas & dingin']
  ];
  const low = (text || '').toLowerCase();
  const matched = dict.filter(([en]) => low.includes(en)).map(([en, id]) => `- ${en} = ${id}`);
  return matched.length ? matched.join('\n') : dict.map(([en, id]) => `- ${en} = ${id}`).join('\n');
}

function categoryEffects(cat, mixedText) {
  const low = (mixedText || '').toLowerCase();
  if (cat === '清洁电器') return '- Add dynamic visual effects of water stains, foam, and dirt being absorbed.';
  if (low.includes('冷风扇')) return '- Add blue airflow lines, cool mist, and icy freshness effects.';
  if (low.includes('除湿机')) return '- Add droplets, dry-air flow, and before/after humidity contrast.';
  if (low.includes('饮水机')) return '- Add hot/cold/normal water symbols and clean hydration cues.';
  if (low.includes('冰箱')) return '- Add metallic reflections, kitchen ambient light, and fresh ingredient feeling.';
  if (low.includes('空气净化器')) return '- Add air flow paths, filtration route visuals, and clean-air glow.';
  return '- Add subtle category-relevant commercial effects without changing product structure.';
}

function iconHint(i) {
  return ['⚡', '🔇', '🏠'][i] || '✔';
}

function visualHint(i) {
  return ['橙色能量符号 + 柔光', '低噪波纹线 + 静谧图标', '家庭剪影 + 温暖背景'][i] || '简洁图标强调利益点';
}

function drawContain(ctx, img, x, y, boxW, boxH) {
  const ratio = Math.min(boxW / img.width, boxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const dx = x + (boxW - w) / 2;
  const dy = y + (boxH - h) / 2;
  ctx.drawImage(img, dx, dy, w, h);
}

function drawTextBlock(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split('');
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i];
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  if (fill) ctx.fill();
}

function writeOutput(text) {
  el.output.value = text;
  state.lastPrompt = text;
  saveState();
}

async function copyPrompt() {
  if (!el.output.value.trim()) return alert('请先生成 Prompt。');
  try {
    await navigator.clipboard.writeText(el.output.value);
    alert('Prompt 已复制');
  } catch {
    el.output.select();
    document.execCommand('copy');
    alert('Prompt 已复制');
  }
}

function exportPromptTxt() {
  if (!el.output.value.trim()) return alert('请先生成 Prompt。');
  const blob = new Blob([el.output.value], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tixx_prompt.txt';
  a.click();
}

function exportPreviewPng() {
  const a = document.createElement('a');
  a.href = el.previewCanvas.toDataURL('image/png');
  a.download = 'tixx_preview.png';
  a.click();
}

function clearAll() {
  if (!confirm('确认清空全部内容？')) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.keys(el).forEach(k => {
    if (['output', 'productName', 'brandName', 'productParams', 'sp1', 'sp2', 'sp3', 'customScene', 'inpaintRequest'].includes(k)) el[k].value = '';
    if (['targetLang', 'category', 'scene', 'style'].includes(k)) el[k].selectedIndex = 0;
  });
  el.brandName.value = 'Tixx';
  el.productPreview.style.display = 'none';
  el.framePreview.style.display = 'none';
  el.productImageInput.value = '';
  el.frameImageInput.value = '';
  productLoaded = false;
  frameLoaded = false;
  state.productImage = '';
  state.frameImage = '';
  state.lastPrompt = '';
  saveState();
  drawPreview();
}

function saveState() {
  state.form = {
    productName: el.productName.value,
    brandName: el.brandName.value,
    productParams: el.productParams.value,
    sp1: el.sp1.value,
    sp2: el.sp2.value,
    sp3: el.sp3.value,
    targetLang: el.targetLang.value,
    category: el.category.value,
    scene: el.scene.value,
    style: el.style.value,
    customScene: el.customScene.value,
    inpaintRequest: el.inpaintRequest.value
  };
  state.lastPrompt = el.output.value || state.lastPrompt || '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreForm() {
  const f = state.form || {};
  Object.keys(f).forEach(k => {
    if (el[k]) el[k].value = f[k] ?? el[k].value;
  });
  el.output.value = state.lastPrompt || '';
}

function restoreImages() {
  if (state.productImage) {
    productImg.onload = () => { productLoaded = true; drawPreview(); };
    productImg.src = state.productImage;
    el.productPreview.src = state.productImage;
    el.productPreview.style.display = 'block';
  }
  if (state.frameImage) {
    frameImg.onload = () => { frameLoaded = true; drawPreview(); };
    frameImg.src = state.frameImage;
    el.framePreview.src = state.frameImage;
    el.framePreview.style.display = 'block';
  }
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { form: {}, productImage: '', frameImage: '', lastPrompt: '' };
  } catch {
    return { form: {}, productImage: '', frameImage: '', lastPrompt: '' };
  }
}
