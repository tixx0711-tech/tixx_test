const STORAGE_KEY = 'tixx_data_v1';
const HISTORY_KEY = 'tixx_history_v1';
const STATUS_MAP = { '已发货': 1, '运输中': 2, '清关中': 3, '已入仓': 4 };
const DATASETS = [
  { key: 'orders', name: '订单表格' },
  { key: 'transit', name: '库存周转/在途表格' },
  { key: 'inventory', name: '库存表格' },
  { key: 'sales', name: '销售表格' },
  { key: 'overdue', name: '超期表格' },
  { key: 'afterSales', name: '售后表格' }
];
const F = {
  orderNo: ['订单编号', '订单号'], date: ['日期', '下单日期'], manager: ['店长'], shop: ['店铺名', '店铺名称'],
  sku: ['SKU', 'sku'], product: ['产品名称', '产品中文名', '品名'], category: ['产品类目', '类目'],
  orderQty: ['订单数量', '数量'], salesQty: ['销售数量', '销量'], amount: ['销售金额', '金额'],
  bizType: ['业务类型'], transitQty: ['在途库存量', '在途量'], transitStatus: ['在途状态'], eta: ['预计到货时间'],
  warehouseQty: ['仓位库存'], availableQty: ['可用库存量'], days: ['当前可售天数'], overdueQty: ['超期库存量'],
  overdueAmount: ['超期金额'], afterType: ['售后类型'], isCod: ['是否COD', 'COD'], refundAmount: ['退款金额']
};
let db = load(STORAGE_KEY, {});
let history = load(HISTORY_KEY, []);
let charts = {};
let tableSort = {};

init();
function init() {
  for (let m = 1; m <= 12; m++) document.getElementById('monthFilter').insertAdjacentHTML('beforeend', `<option value="${m}">${m}月</option>`);
  renderUploadCards();
  renderClearButtons();
  bindNav(); bindFilters(); bindExporters();
  refreshAll();
}
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.onclick = () => {
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(btn.dataset.target).classList.add('active');
  });
}
function bindFilters() {
  ['orderSearch', 'productSearch', 'bizType', 'managerFilter', 'shopFilter', 'monthFilter', 'categoryFilter'].forEach(id => document.getElementById(id).oninput = refreshAll);
  document.getElementById('clearFilter').onclick = () => {
    ['orderSearch', 'productSearch', 'bizType', 'managerFilter', 'shopFilter', 'monthFilter', 'categoryFilter'].forEach(id => document.getElementById(id).value = '');
    refreshAll();
  };
  document.getElementById('exportFiltered').onclick = () => exportCSV('filtered_sales.csv', getFiltered().sales);
}
function bindExporters() {
  document.querySelectorAll('.table-export').forEach(btn => btn.onclick = () => exportTableCSV(btn.dataset.table));
}
function renderUploadCards() {
  const box = document.getElementById('uploadGrid');
  box.innerHTML = DATASETS.map(d => `<article class="card"><h3>${d.name}</h3><input type="file" accept=".xlsx,.xls,.csv" data-key="${d.key}" /></article>`).join('');
  box.querySelectorAll('input[type=file]').forEach(input => input.onchange = e => handleUpload(e.target.dataset.key, e.target.files[0]));
}
function renderClearButtons() {
  const box = document.getElementById('clearButtons');
  box.innerHTML = DATASETS.map(d => `<button data-key="${d.key}">清空${d.name}</button>`).join('') + `<button id="clearAll">清空全部数据</button>`;
  box.querySelectorAll('button[data-key]').forEach(btn => btn.onclick = () => { delete db[btn.dataset.key]; persist(); refreshAll(); });
  document.getElementById('clearAll').onclick = () => { db = {}; history = []; persist(); refreshAll(); };
}
function handleUpload(key, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const wb = XLSX.read(ev.target.result, { type: 'binary' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    db[key] = rows.map(r => normalizeRow(r));
    history.unshift({ key, file: file.name, rows: rows.length, time: new Date().toISOString() });
    history = history.slice(0, 100);
    persist();
    document.getElementById('uploadMsg').textContent = '上传成功，数据已保存';
    refreshAll();
  };
  reader.readAsBinaryString(file);
}
function normalizeRow(r) {
  const row = {};
  row.orderNo = pick(r, F.orderNo); row.date = toDate(pick(r, F.date)); row.manager = pick(r, F.manager);
  row.shop = pick(r, F.shop); row.sku = pick(r, F.sku); row.product = pick(r, F.product); row.category = pick(r, F.category);
  row.orderQty = num(pick(r, F.orderQty)); row.salesQty = num(pick(r, F.salesQty)); row.amount = num(pick(r, F.amount)); row.bizType = pick(r, F.bizType);
  row.transitQty = num(pick(r, F.transitQty)); row.transitStatus = pick(r, F.transitStatus); row.transitStatusNum = STATUS_MAP[row.transitStatus] || num(row.transitStatus);
  row.eta = pick(r, F.eta); row.warehouseQty = num(pick(r, F.warehouseQty)); row.availableQty = num(pick(r, F.availableQty)); row.days = num(pick(r, F.days));
  row.overdueQty = num(pick(r, F.overdueQty)); row.overdueAmount = num(pick(r, F.overdueAmount));
  row.afterType = pick(r, F.afterType); row.isCod = String(pick(r, F.isCod)).toLowerCase().includes('y') || String(pick(r, F.isCod)).includes('是');
  row.refundAmount = num(pick(r, F.refundAmount));
  return row;
}
function pick(obj, keys) {
  const map = Object.fromEntries(Object.keys(obj).map(k => [clean(k), obj[k]]));
  for (const k of keys) if (map[clean(k)] !== undefined) return String(map[clean(k)]).trim();
  return '';
}
function clean(s) { return String(s).replace(/\s+/g, '').toLowerCase(); }
function num(v) { const n = Number(String(v).replace(/[,%￥,]/g, '')); return Number.isFinite(n) ? n : 0; }
function toDate(v) {
  if (!v) return '';
  if (typeof v === 'number') return XLSX.SSF.format('yyyy-mm-dd', v);
  const d = new Date(v); if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
function getFiltered() {
  const fs = {
    orderSearch: document.getElementById('orderSearch').value.trim(), productSearch: document.getElementById('productSearch').value.trim(),
    bizType: document.getElementById('bizType').value, manager: document.getElementById('managerFilter').value, shop: document.getElementById('shopFilter').value,
    month: document.getElementById('monthFilter').value, category: document.getElementById('categoryFilter').value
  };
  const pass = row => {
    if (fs.orderSearch && ![row.orderNo, row.manager, row.shop].join('|').includes(fs.orderSearch)) return false;
    if (fs.productSearch && ![row.sku, row.product].join('|').includes(fs.productSearch)) return false;
    if (fs.bizType && row.bizType && row.bizType !== fs.bizType) return false;
    if (fs.manager && row.manager !== fs.manager) return false;
    if (fs.shop && row.shop !== fs.shop) return false;
    if (fs.category && row.category !== fs.category) return false;
    if (fs.month && row.date) { if ((new Date(row.date).getMonth() + 1) !== Number(fs.month)) return false; }
    return true;
  };
  return {
    orders: (db.orders || []).filter(pass), transit: (db.transit || []).filter(pass), inventory: (db.inventory || []).filter(pass),
    sales: (db.sales || []).filter(pass), overdue: (db.overdue || []).filter(pass), afterSales: (db.afterSales || []).filter(pass)
  };
}
function refreshAll() {
  const d = getFiltered();
  renderKPIs(d); renderCharts(d);
  const warnings = computeWarnings(d.inventory, d.transit);
  renderWarningTable(warnings); renderAfterSales(d); renderWeeklyTable(d.sales); renderHistory();
}
function renderKPIs(d) {
  const warnings = computeWarnings(d.inventory, d.transit);
  const totalOrders = sum(d.orders, 'orderQty') || d.orders.length;
  const totalAmount = sum(d.sales, 'amount');
  const totalQty = sum(d.sales, 'salesQty');
  const invQty = sum(d.inventory, 'availableQty');
  const outWarn = warnings.filter(w => w.type === '断货预警').length;
  const overWarn = warnings.filter(w => w.type !== '断货预警').length;
  const afterRate = totalOrders ? (d.afterSales.length / totalOrders) : 0;
  const totalRefund = d.afterSales.filter(x => x.afterType.includes('退款')).length;
  const codRefund = d.afterSales.filter(x => x.afterType.includes('退款') && x.isCod).length;
  const codRate = totalRefund ? codRefund / totalRefund : 0;
  const cards = [
    ['总订单数', fmt(totalOrders)], ['总销售额', money(totalAmount)], ['总销量', fmt(totalQty)], ['可用库存总量', fmt(invQty)],
    ['断货预警数量', fmt(outWarn)], ['超期预警数量', fmt(overWarn)], ['售后率', pct(afterRate)], ['COD退款占比', pct(codRate)]
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map(c => `<div class="kpi"><div class="label">${c[0]}</div><div class="value">${c[1]}</div></div>`).join('');
}
function renderCharts(d) {
  line('orderTrendChart', groupByDate(d.orders, 'orderQty', true), '订单数量', '上周对比');
  line('salesTrendChart', groupByDate(d.sales, 'amount'), '销售额', '上周对比');
  comboByCategory('categorySalesChart', d.sales, 'salesQty', 'amount', '销售数量', '销售金额');
  inventoryChart(d); transitChart(d.transit); overdueChart(d.overdue);
  pieBar('managerPieChart', 'managerBarChart', d.sales, 'manager');
  pieBar('shopPieChart', 'shopBarChart', d.sales, 'shop');
  dailyTrackChart(d.sales);
}
function groupByDate(rows, key, defaultOne = false) {
  const m = {};
  rows.forEach(r => { if (!r.date) return; m[r.date] = (m[r.date] || 0) + (defaultOne ? (r[key] || 1) : r[key]); });
  return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
}
function line(id, series, label, compareLabel) {
  if (!series.length) return emptyChart(id);
  const labels = series.map(x => x[0]), data = series.map(x => x[1]);
  const prev = data.map((_, i) => data[Math.max(0, i - 7)] || 0);
  chart(id, 'line', {
    labels,
    datasets: [{ label, data, borderColor: '#0071e3' }, { label: compareLabel, data: prev, borderColor: '#8e8e93' }]
  });
}
function comboByCategory(id, rows, qtyKey, amountKey, ql, al) {
  const cates = ['厨房电器','大型电器','个护电器','净水饮水','清洁电器','生活电器'];
  const qty = cates.map(c => sum(rows.filter(r=>r.category===c), qtyKey));
  const amt = cates.map(c => sum(rows.filter(r=>r.category===c), amountKey));
  chart(id, 'bar', { labels: cates, datasets: [{ label: ql, data: qty, backgroundColor: '#5ac8fa' }, { label: al, type: 'line', data: amt, borderColor: '#0071e3', yAxisID:'y1' }] }, { scales: { y1: { position: 'right' } } });
}
function inventoryChart(d) {
  const cates = ['厨房电器','大型电器','个护电器','净水饮水','清洁电器','生活电器'];
  const warnings = computeWarnings(d.inventory, d.transit);
  const warningSku = new Set(warnings.map(w=>w.sku));
  const val = cates.map(c => sum(d.inventory.filter(r => r.category===c), 'availableQty'));
  const color = cates.map(c => d.inventory.some(x=>x.category===c && warningSku.has(x.sku)) ? '#ff9f0a' : '#34c759');
  chart('inventoryChart', 'bar', { labels: cates, datasets: [{ label:'可用库存量', data: val, backgroundColor: color }] });
}
function transitChart(rows) {
  const top = aggregate(rows, 'product', ['transitQty','transitStatusNum']).slice(0,12);
  chart('transitChart','bar',{ labels: top.map(x=>x.k), datasets:[{label:'在途库存量',data:top.map(x=>x.transitQty),backgroundColor:'#64d2ff'},{label:'在途状态',type:'line',data:top.map(x=>x.transitStatusNum),borderColor:'#5856d6',yAxisID:'y1'}]}, { scales: { y1: { position:'right', min:0, max:4 } } });
}
function overdueChart(rows) {
  const top = aggregate(rows, 'product', ['overdueQty','overdueAmount']).slice(0,12);
  chart('overdueChart','bar',{ labels: top.map(x=>x.k), datasets:[{label:'超期库存量',data:top.map(x=>x.overdueQty),backgroundColor:'#ff9f0a'},{label:'超期金额',type:'line',data:top.map(x=>x.overdueAmount),borderColor:'#ff3b30',yAxisID:'y1'}]}, { scales: { y1: { position:'right' } } });
}
function pieBar(pieId, barId, rows, dim) {
  const ag = aggregate(rows, dim, ['amount','salesQty']).filter(x=>x.k).slice(0,10);
  chart(pieId, 'pie', { labels: ag.map(x=>x.k), datasets:[{ data: ag.map(x=>x.amount) }] });
  chart(barId, 'bar', { labels: ag.map(x=>x.k), datasets:[{ label:'订单量', data: ag.map(x=>x.salesQty), backgroundColor:'#30b0c7' }] });
}
function dailyTrackChart(rows) {
  const daily = groupByDate(rows, 'salesQty').map(x=>({date:x[0], qty:x[1], amount:sum(rows.filter(r=>r.date===x[0]),'amount')}));
  chart('dailyTrackChart','line',{ labels: daily.map(x=>x.date), datasets:[{label:'日销量',data:daily.map(x=>x.qty),borderColor:'#34c759'},{label:'日销售额',data:daily.map(x=>x.amount),borderColor:'#0071e3'}]});
}
function renderWeeklyTable(rows) {
  const latest = maxDate(rows); const prev = shiftDate(latest, -7);
  const thisWeek = rows.filter(r => r.date >= prev && r.date <= latest);
  const lastWeek = rows.filter(r => r.date < prev && r.date >= shiftDate(prev, -7));
  const a = aggregate(thisWeek, 'sku', ['salesQty','amount']);
  const b = Object.fromEntries(aggregate(lastWeek, 'sku', ['salesQty','amount']).map(x=>[x.k,x]));
  const table = a.map(x => {
    const y = b[x.k] || { salesQty: 0, amount: 0 };
    const rate = y.salesQty ? (x.salesQty - y.salesQty) / y.salesQty : 1;
    return { SKU: x.k, 产品名称: thisWeek.find(r=>r.sku===x.k)?.product||'', 本周销量: x.salesQty, 上周销量: y.salesQty, 涨跌幅: pct(rate), 销售额变化: money(x.amount - y.amount) };
  }).sort((m,n)=>num(n.本周销量)-num(m.本周销量));
  renderTable('weeklyChangeTable', table);
}
function renderWarningTable(warnings) {
  const rows = warnings.map(w => ({ SKU:w.sku, 产品名称:w.product, 产品类目:w.category, 可用库存量:w.availableQty, 当前可售天数:w.days, 在途库存量:w.transitQty, 预警类型:`<span class="tag ${w.type}">${w.type}</span>`, 建议动作:w.action }));
  renderTable('warningTable', rows, true);
}
function computeWarnings(inventory, transit) {
  const t = Object.fromEntries(aggregate(transit, 'sku', ['transitQty']).map(x=>[x.k,x.transitQty]));
  const list = [];
  inventory.forEach(r => {
    const tq = t[r.sku] || 0; const noTransit = !tq;
    let type = '正常', action = '保持当前节奏';
    if ((r.availableQty < 50 && noTransit) || (r.days < 10 && noTransit)) { type = '断货预警'; action = '建议尽快补货或调整推广节奏'; }
    else if (r.days > 80) { type = '超期预警'; action = '建议加大促销、达人带货、直播间主推'; }
    else if (r.days > 50 && tq > 100) { type = '超期风险预警'; action = '建议暂停补货，优先清理库存'; }
    if (type !== '正常') list.push({ ...r, type, action, transitQty:tq });
  });
  return list;
}
function renderAfterSales(d) {
  const totalOrders = sum(d.orders, 'orderQty') || d.orders.length || 1;
  const byProduct = aggregate(d.afterSales, 'product', ['refundAmount']).map(x => ({ k: x.k, count: d.afterSales.filter(r=>r.product===x.k).length }));
  chart('afterRateChart','bar',{ labels: byProduct.slice(0,12).map(x=>x.k), datasets:[{label:'售后率',data:byProduct.slice(0,12).map(x=>x.count/totalOrders*100),backgroundColor:'#ff375f'}]});
  const typeMap = {}; d.afterSales.forEach(r=> typeMap[r.afterType||'未知']=(typeMap[r.afterType||'未知']||0)+1);
  chart('afterTypeChart','pie',{ labels:Object.keys(typeMap), datasets:[{ data:Object.values(typeMap) }]});
  const rows = d.afterSales.map(r=>({ 订单编号:r.orderNo, 日期:r.date, 店长:r.manager, 店铺:r.shop, SKU:r.sku, 产品名称:r.product, 售后类型:r.afterType, 是否COD:r.isCod?'是':'否', 退款金额:money(r.refundAmount) }));
  renderTable('afterTable', rows);
}
function renderHistory() {
  document.getElementById('historyList').innerHTML = history.length ? history.map(h => `<div class="item">${h.time.slice(0,19).replace('T',' ')} ｜ ${nameOf(h.key)} ｜ ${h.file} ｜ ${h.rows} 行</div>`).join('') : '暂无历史上传记录';
}
function renderTable(id, rows, rawHtml = false) {
  const el = document.getElementById(id);
  if (!rows.length) return el.innerHTML = '<tr><td>请先上传数据</td></tr>';
  const cols = Object.keys(rows[0]);
  const st = tableSort[id] || { col: cols[0], asc: true };
  rows.sort((a,b)=> String(a[st.col]).localeCompare(String(b[st.col]), 'zh-Hans-CN', { numeric:true }) * (st.asc?1:-1));
  el.innerHTML = `<thead><tr>${cols.map(c => `<th data-t="${id}" data-c="${c}">${c}${st.col===c?(st.asc?'↑':'↓'):''}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${rawHtml?r[c]:escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  el.querySelectorAll('th').forEach(th => th.onclick = () => { const t = th.dataset.t, c = th.dataset.c; tableSort[t] = { col:c, asc: tableSort[t]?.col===c ? !tableSort[t].asc : true }; renderTable(t, rows, rawHtml); });
}
function exportCSV(filename, rows) {
  if (!rows.length) return alert('没有可导出的数据');
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
function exportTableCSV(tableId) {
  const table = document.getElementById(tableId); if (!table || !table.rows.length) return;
  const rows = [...table.rows].map(r => [...r.cells].map(c => `"${c.innerText.replace(/"/g, '""')}"`).join(','));
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${tableId}.csv`; a.click();
}
function chart(id, type, data, options = {}) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), { type, data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, ...options } });
}
function emptyChart(id) {
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id).getContext('2d');
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height); ctx.font='16px sans-serif'; ctx.fillStyle='#8e8e93'; ctx.fillText('请先上传数据', 20, 40);
}
function aggregate(rows, key, fields) {
  const m = {};
  rows.forEach(r => { const k = r[key] || '未知'; m[k] = m[k] || { k }; fields.forEach(f => m[k][f] = (m[k][f] || 0) + num(r[f])); });
  return Object.values(m);
}
function maxDate(rows) { return rows.map(r=>r.date).filter(Boolean).sort().pop() || new Date().toISOString().slice(0,10); }
function shiftDate(date, d) { const t = new Date(date); t.setDate(t.getDate() + d); return t.toISOString().slice(0,10); }
function sum(rows, field) { return rows.reduce((s, r) => s + num(r[field]), 0); }
function nameOf(key) { return DATASETS.find(d => d.key===key)?.name || key; }
function fmt(n) { return Number(n || 0).toLocaleString('zh-CN'); }
function money(n) { return '¥' + Number(n || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 }); }
function pct(n) { return (Number(n || 0) * 100).toFixed(2) + '%'; }
function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }
