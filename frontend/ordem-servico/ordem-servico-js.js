/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
let role   = 'gerente';
let view   = 'table';
let editId = null;
let delId  = null;
let srtF   = 'id_ordem';
let srtD   = 'desc';
let pg     = 1;
const PG   = 8;

/* ── Mapas de dados (mock) ─────────────────── */
const veicMap = {
  '1': [{ id:1, label:'Honda Civic 2018 — ABC3D45' }, { id:2, label:'Jeep Compass 2022 — KLM7N89' }],
  '2': [{ id:3, label:'Toyota Corolla 2020 — XYZ9E12' }],
  '3': [{ id:4, label:'Volkswagen Gol 2017 — DEF1H23' }],
  '4': [{ id:5, label:'Ford Ka 2019 — GHI4J56' }],
};

const funcMap = {
  '1': 'Jonas Pereira',
  '2': 'Antônio Lima',
  '3': 'Luciana Ribeiro',
};

const cliMap = {
  '1': { nome:'Flávio Cunha', vip:true },
  '2': { nome:'Maria Silva',  vip:false },
  '3': { nome:'Carlos Mota',  vip:false },
  '4': { nome:'Ana Paula',    vip:true },
};

const tipoLabel = {
  revisao:   'Revisão Geral',
  pecas:     'Troca de Peças',
  emergencia:'Emergencial',
  vip:       'Agend. VIP',
};

const statMap = {
  aberta:    { bdg:'b-blue',   ico:'circle',              lbl:'Aberta' },
  andamento: { bdg:'b-amber',  ico:'tools',               lbl:'Em andamento' },
  aguardando:{ bdg:'b-cyan',   ico:'hourglass-split',     lbl:'Aguard. peça' },
  concluida: { bdg:'b-green',  ico:'check2-circle',       lbl:'Concluída' },
  atrasada:  { bdg:'b-red',    ico:'exclamation-circle',  lbl:'Atrasada' },
  cancelada: { bdg:'b-steel',  ico:'x-circle',            lbl:'Cancelada' },
};

const tipoBdg = {
  revisao:   'b-blue',
  pecas:     'b-amber',
  emergencia:'b-red',
  vip:       'b-purple',
};

/* ── Ordens (mock inicial) ──────────────────── */
let ordens = [
  { id_ordem:1, id_funcionario:'1', id_cliente:'1', id_veiculo:1, tipo_ordem:'revisao',
    diagnostico:'Veículo apresenta barulho ao frear e óleo abaixo do nível.',
    abertura:'2025-03-18', prazo:'2025-03-20', fechamento:null, conclusao_ordem:null,
    mao_de_obra:350, orcamento:780, status:'andamento',
    pecas:[{nome:'Filtro de Óleo',qtd:1,valor:45},{nome:'Vela de Ignição',qtd:4,valor:28},{nome:'Pastilha de Freio',qtd:1,valor:120}] },

  { id_ordem:2, id_funcionario:'3', id_cliente:'2', id_veiculo:3, tipo_ordem:'pecas',
    diagnostico:'Correia dentada próxima do limite — troca preventiva.',
    abertura:'2025-03-17', prazo:'2025-03-18', fechamento:'2025-03-18',
    conclusao_ordem:'Correia e tensor substituídos.',
    mao_de_obra:200, orcamento:480, status:'concluida',
    pecas:[{nome:'Correia Dentada',qtd:1,valor:210},{nome:'Tensor',qtd:1,valor:70}] },

  { id_ordem:3, id_funcionario:'1', id_cliente:'3', id_veiculo:4, tipo_ordem:'emergencia',
    diagnostico:'Alternador com falha — sem carga na bateria.',
    abertura:'2025-03-19', prazo:'2025-03-20', fechamento:null, conclusao_ordem:null,
    mao_de_obra:280, orcamento:680, status:'aguardando',
    pecas:[{nome:'Alternador Remanufaturado',qtd:1,valor:400}] },

  { id_ordem:4, id_funcionario:'2', id_cliente:'4', id_veiculo:5, tipo_ordem:'vip',
    diagnostico:'Revisão dos 50.000 km conforme contrato VIP.',
    abertura:'2025-03-20', prazo:'2025-03-21', fechamento:null, conclusao_ordem:null,
    mao_de_obra:500, orcamento:1200, status:'aberta',
    pecas:[{nome:'Filtro de Ar',qtd:1,valor:65},{nome:'Óleo Motor 5W30 4L',qtd:2,valor:120},{nome:'Filtro de Combustível',qtd:1,valor:55},{nome:'Vela NGK Iridium',qtd:4,valor:85}] },

  { id_ordem:5, id_funcionario:'1', id_cliente:'1', id_veiculo:2, tipo_ordem:'pecas',
    diagnostico:'Amortecedor dianteiro esquerdo com vazamento.',
    abertura:'2025-03-15', prazo:'2025-03-16', fechamento:null, conclusao_ordem:null,
    mao_de_obra:180, orcamento:620, status:'atrasada',
    pecas:[{nome:'Amortecedor Dianteiro',qtd:2,valor:220}] },

  { id_ordem:6, id_funcionario:'3', id_cliente:'2', id_veiculo:3, tipo_ordem:'revisao',
    diagnostico:'Revisão semestral completa.',
    abertura:'2025-03-10', prazo:'2025-03-12', fechamento:'2025-03-12',
    conclusao_ordem:'Revisão concluída sem anomalias.',
    mao_de_obra:320, orcamento:520, status:'concluida',
    pecas:[{nome:'Filtro de Óleo',qtd:1,valor:45},{nome:'Óleo Motor',qtd:4,valor:155}] },
];

let pecasT = [];

/* ═══════════════════════════════════════════════
   PERFIL (ROLE SWITCH)
═══════════════════════════════════════════════ */
function switchRole(r, btn) {
  role = r;
  document.querySelectorAll('.rbtn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed','true');

  const profiles = {
    gerente:  { n:'Antônio Lima',    i:'AL', pb:'pb-gerente',  l:'Gerente',        av:'av-gerente' },
    recepcao: { n:'Luciana Ribeiro', i:'LR', pb:'pb-recepcao', l:'Recepcionista',  av:'av-recepcao' },
    mecanico: { n:'Jonas Pereira',   i:'JP', pb:'pb-mecanico', l:'Mecânico Chefe', av:'av-mecanico' },
  };

  const d = profiles[r];
  document.getElementById('sbAv').textContent  = d.i;
  document.getElementById('sbAv').className    = 'av ' + d.av;
  document.getElementById('sbName').textContent = d.n;
  const rb = document.getElementById('sbRole');
  rb.textContent = d.l;
  rb.className   = 'pbadge ' + d.pb;

  // Botão Nova OS: gerente e recepção
  document.getElementById('btnNova').style.display =
    (r === 'gerente' || r === 'recepcao') ? 'inline-flex' : 'none';

  // Itens de nav por perfil
  document.querySelectorAll('.rnav').forEach(el => {
    const show = el.classList.contains('r-' + r) ||
                 (el.classList.contains('r-g') && r === 'gerente');
    el.style.display = show ? 'flex' : 'none';
  });

  renderTbl();
}

/* ═══════════════════════════════════════════════
   VIEW (TABLE / KANBAN)
═══════════════════════════════════════════════ */
function setView(v, btn) {
  view = v;
  document.querySelectorAll('.vb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tvw').style.display = v === 'table'  ? 'block' : 'none';
  document.getElementById('kvw').style.display = v === 'kanban' ? 'block' : 'none';
  if (v === 'kanban') renderKanban();
}

/* ═══════════════════════════════════════════════
   FILTRO
═══════════════════════════════════════════════ */
function getFilt() {
  const q  = (document.getElementById('qInput').value || '').toLowerCase();
  const st = document.getElementById('fStat').value;
  const ti = document.getElementById('fTipo').value;

  return ordens.filter(o => {
    const cli = cliMap[o.id_cliente]?.nome || '';
    const vei = veicMap[o.id_cliente]?.find(v => v.id === o.id_veiculo)?.label || '';
    const hay = `#${String(o.id_ordem).padStart(4,'0')} ${cli} ${vei} ${o.tipo_ordem} ${o.diagnostico||''}`.toLowerCase();
    return (!q || hay.includes(q)) && (!st || o.status === st) && (!ti || o.tipo_ordem === ti);
  });
}

function filtrar() { pg = 1; renderTbl(); if (view === 'kanban') renderKanban(); }

function srtBy(f, th) {
  srtD = srtF === f ? (srtD === 'asc' ? 'desc' : 'asc') : 'asc';
  srtF = f;
  document.querySelectorAll('.tbl th.srt').forEach(t => t.classList.remove('sa','sd'));
  th?.classList.add(srtD === 'asc' ? 'sa' : 'sd');
  filtrar();
}

/* ═══════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════ */
function updStats() {
  document.getElementById('sA').textContent  = ordens.filter(o => o.status === 'aberta').length;
  document.getElementById('sE').textContent  = ordens.filter(o => o.status === 'andamento').length;
  document.getElementById('sC').textContent  = ordens.filter(o => o.status === 'concluida').length;
  document.getElementById('sAt').textContent = ordens.filter(o => o.status === 'atrasada').length;
  const vips = new Set(ordens.filter(o => cliMap[o.id_cliente]?.vip).map(o => o.id_cliente));
  document.getElementById('sV').textContent  = vips.size;
  document.getElementById('navBdg').textContent =
    ordens.filter(o => ['aberta','andamento','atrasada'].includes(o.status)).length;
}

/* ═══════════════════════════════════════════════
   RENDERIZAR TABELA
═══════════════════════════════════════════════ */
function renderTbl() {
  updStats();

  let data = getFilt();
  data.sort((a, b) => {
    let av = a[srtF] ?? '', bv = b[srtF] ?? '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    return av < bv ? (srtD === 'asc' ? -1 : 1) : av > bv ? (srtD === 'asc' ? 1 : -1) : 0;
  });

  const tot = data.length;
  const tp  = Math.max(1, Math.ceil(tot / PG));
  pg = Math.min(pg, tp);
  const s     = (pg - 1) * PG;
  const pdata = data.slice(s, s + PG);

  document.getElementById('totLbl').textContent =
    `${tot} registro${tot !== 1 ? 's' : ''}`;
  document.getElementById('pagInfo').textContent =
    tot ? `Exibindo ${s + 1}–${Math.min(s + PG, tot)} de ${tot}` : 'Nenhum registro';

  const tbody = document.getElementById('tbOS');

  if (!pdata.length) {
    tbody.innerHTML = `<tr><td colspan="11">
      <div class="empty">
        <i class="bi bi-clipboard2" aria-hidden="true"></i>
        <h4>Nenhuma ordem encontrada</h4>
        <p>Crie uma nova OS ou ajuste os filtros</p>
      </div></td></tr>`;
    document.getElementById('pagBtns').innerHTML = '';
    return;
  }

  tbody.innerHTML = pdata.map(o => {
    const cli   = cliMap[o.id_cliente]?.nome || '—';
    const isVip = cliMap[o.id_cliente]?.vip;
    const veic  = veicMap[o.id_cliente]?.find(v => v.id === o.id_veiculo)?.label || '—';
    const placa = veic.split('—')[1]?.trim() || '—';
    const vnome = veic.split('—')[0]?.trim() || '—';
    const fn    = funcMap[o.id_funcionario] || '—';
    const st    = statMap[o.status] || statMap.aberta;
    const tb2   = tipoBdg[o.tipo_ordem] || 'b-steel';
    const tl    = tipoLabel[o.tipo_ordem] || o.tipo_ordem;
    const venc  = o.prazo && !o.fechamento && new Date(o.prazo) < new Date()
      ? '<i class="bi bi-exclamation-triangle-fill" style="color:var(--rose);font-size:12px;margin-left:4px" title="Prazo vencido" aria-label="Prazo vencido"></i>'
      : '';
    const canEd  = role === 'gerente';
    const canDel = role === 'gerente' && o.status !== 'concluida';

    return `<tr>
      <td>
        <div class="osn">#${String(o.id_ordem).padStart(4,'0')}</div>
        ${isVip ? '<span class="bdg b-purple" style="margin-top:3px"><i class="bi bi-star-fill" aria-hidden="true"></i>VIP</span>' : ''}
      </td>
      <td><div style="font-size:12px">${fd(o.abertura)}</div></td>
      <td><div style="font-size:13px;font-weight:500">${fn}</div></td>
      <td><div style="font-weight:600;font-size:13px">${cli}</div></td>
      <td>
        <div style="font-size:12px;color:var(--chrome-dim)">${vnome}</div>
        <span class="bdg b-steel" style="margin-top:3px">${placa}</span>
      </td>
      <td><span class="bdg ${tb2}">${tl}</span></td>
      <td><div style="font-size:12px">${fd(o.prazo)}${venc}</div></td>
      <td>
        <div style="display:flex;gap:5px;align-items:center">
          <i class="bi bi-box-seam" style="font-size:13px;color:${(o.pecas||[]).length?'var(--green)':'var(--text-faint)'}" title="Peças" aria-hidden="true"></i>
          <i class="bi bi-wrench"   style="font-size:13px;color:${o.mao_de_obra>0?'var(--green)':'var(--text-faint)'}" title="Mão de obra" aria-hidden="true"></i>
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-faint);margin-top:3px">${(o.pecas||[]).length} peça(s)</div>
      </td>
      <td>
        <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--green)">${fc(o.orcamento)}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-faint)">M.O: ${fc(o.mao_de_obra)}</div>
      </td>
      <td><span class="bdg ${st.bdg}"><i class="bi bi-${st.ico}" aria-hidden="true"></i>${st.lbl}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-xs" onclick="verDet(${o.id_ordem})" title="Ver detalhes" aria-label="Ver OS ${o.id_ordem}">
            <i class="bi bi-eye" aria-hidden="true"></i>
          </button>
          ${canEd ? `<button class="btn btn-ghost btn-xs" onclick="editarOS(${o.id_ordem})" title="Editar" aria-label="Editar OS ${o.id_ordem}">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>` : ''}
          ${canDel ? `<button class="btn btn-ghost btn-xs" style="color:var(--rose)" onclick="askDel(${o.id_ordem})" title="Excluir" aria-label="Excluir OS ${o.id_ordem}">
            <i class="bi bi-trash3" aria-hidden="true"></i>
          </button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPag(tp);
}

function renderPag(tp) {
  const el = document.getElementById('pagBtns');
  if (tp <= 1) { el.innerHTML = ''; return; }
  let h = `<button class="pb" onclick="goP(${pg-1})" ${pg===1?'disabled':''} aria-label="Página anterior">&lsaquo;</button>`;
  for (let i = 1; i <= tp; i++)
    h += `<button class="pb ${i===pg?'active':''}" onclick="goP(${i})" aria-label="Página ${i}" ${i===pg?'aria-current="page"':''}>${i}</button>`;
  h += `<button class="pb" onclick="goP(${pg+1})" ${pg===tp?'disabled':''} aria-label="Próxima página">&rsaquo;</button>`;
  el.innerHTML = h;
}

function goP(p) {
  const d  = getFilt();
  const mx = Math.ceil(d.length / PG);
  if (p < 1 || p > mx) return;
  pg = p;
  renderTbl();
}

/* ═══════════════════════════════════════════════
   KANBAN
═══════════════════════════════════════════════ */
function renderKanban() {
  const data = getFilt();
  const cols = [
    { key:'aberta',    lbl:'Abertas',       c:'var(--blue)',   ic:'bi-circle' },
    { key:'andamento', lbl:'Em Andamento',  c:'var(--amber)',  ic:'bi-tools' },
    { key:'aguardando',lbl:'Aguard. Peça',  c:'var(--cyan)',   ic:'bi-hourglass-split' },
    { key:'concluida', lbl:'Concluídas',    c:'var(--green)',  ic:'bi-check2-circle' },
    { key:'atrasada',  lbl:'Atrasadas',     c:'var(--rose)',   ic:'bi-exclamation-circle' },
  ];

  document.getElementById('kbBoard').innerHTML = cols.map(col => {
    const items = data.filter(o => o.status === col.key);

    const cards = items.map(o => {
      const cli   = cliMap[o.id_cliente]?.nome || '—';
      const isVip = cliMap[o.id_cliente]?.vip;
      const veic  = veicMap[o.id_cliente]?.find(v => v.id === o.id_veiculo)?.label || '—';
      const placa = veic.split('—')[1]?.trim() || '—';
      const cc    = isVip ? 'vip' : (o.tipo_ordem === 'emergencia' ? 'urg' : 'normal');

      return `<article class="os-card ${cc}"
        onclick="verDet(${o.id_ordem})"
        role="button" tabindex="0"
        aria-label="Abrir detalhes da OS ${o.id_ordem}"
        onkeydown="if(event.key==='Enter')verDet(${o.id_ordem})">
        <div class="osc-num">#${String(o.id_ordem).padStart(4,'0')}</div>
        <div class="osc-cli">${cli}${isVip ? ' ⭐' : ''}</div>
        <div class="osc-pla"><i class="bi bi-car-front" aria-hidden="true" style="margin-right:4px"></i>${placa}</div>
        <div class="osc-typ"><i class="bi bi-wrench" aria-hidden="true" style="margin-right:5px"></i>${tipoLabel[o.tipo_ordem]||o.tipo_ordem}</div>
        <div class="osc-dt"><i class="bi bi-calendar3" aria-hidden="true" style="margin-right:5px"></i>Prazo: ${fd(o.prazo)}</div>
        <div class="osc-foot">
          <div class="osc-val">${fc(o.orcamento)}</div>
          <div style="display:flex;gap:5px">
            <i class="bi bi-box-seam" style="color:${(o.pecas||[]).length?'var(--green)':'var(--text-faint)'};font-size:13px" aria-hidden="true"></i>
            <i class="bi bi-currency-dollar" style="color:${o.mao_de_obra>0?'var(--green)':'var(--text-faint)'};font-size:13px" aria-hidden="true"></i>
          </div>
        </div>
      </article>`;
    }).join('') || `<div style="text-align:center;padding:20px;color:var(--text-faint);font-size:12px">
      <i class="bi bi-inbox" aria-hidden="true" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
      Nenhuma OS
    </div>`;

    return `<div class="kb-col">
      <div class="kb-head">
        <i class="bi ${col.ic}" style="color:${col.c};font-size:15px" aria-hidden="true"></i>
        <span class="kb-title" style="color:${col.c}">${col.lbl}</span>
        <span class="kb-count">${items.length}</span>
      </div>
      <div class="kb-body">${cards}</div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   MODAL NOVA OS
═══════════════════════════════════════════════ */
function abrirNova() {
  editId = null; pecasT = [];
  document.getElementById('mTit').textContent    = 'Nova Ordem de Serviço';
  document.getElementById('btnTxt').textContent  = 'Criar OS';
  document.getElementById('btnFech').style.display = 'none';
  document.getElementById('secFech').style.display = 'none';
  document.getElementById('vMsg').classList.remove('show');
  ['oFunc','oCli','oVeic','oTipo','oDiag','oMO','oConc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('oOrc').value = '';
  document.getElementById('oAb').value  = new Date().toISOString().split('T')[0];
  document.getElementById('oPr').value  = '';
  document.getElementById('oFech').value = '';
  document.getElementById('oVeic').innerHTML = '<option value="">Selecione um cliente primeiro</option>';
  renderPecas();
  new bootstrap.Modal(document.getElementById('mOS')).show();
}

/* ═══════════════════════════════════════════════
   MODAL EDITAR OS
═══════════════════════════════════════════════ */
function editarOS(id) {
  const o = ordens.find(x => x.id_ordem === id);
  if (!o) return;
  editId = id;
  pecasT = JSON.parse(JSON.stringify(o.pecas || []));

  document.getElementById('mTit').textContent   = `Editar OS #${String(id).padStart(4,'0')}`;
  document.getElementById('btnTxt').textContent = 'Salvar Alterações';
  document.getElementById('vMsg').classList.remove('show');

  const canC = !['concluida','cancelada'].includes(o.status);
  document.getElementById('btnFech').style.display = canC ? 'inline-flex' : 'none';
  document.getElementById('secFech').style.display = 'block';

  document.getElementById('oFunc').value = o.id_funcionario;
  document.getElementById('oCli').value  = o.id_cliente;
  popVeic(o.id_veiculo);
  document.getElementById('oTipo').value  = o.tipo_ordem;
  document.getElementById('oAb').value    = o.abertura || '';
  document.getElementById('oPr').value    = o.prazo    || '';
  document.getElementById('oDiag').value  = o.diagnostico || '';
  document.getElementById('oMO').value    = o.mao_de_obra  || '';
  document.getElementById('oOrc').value   = o.orcamento    || '';
  document.getElementById('oFech').value  = o.fechamento   || '';
  document.getElementById('oConc').value  = o.conclusao_ordem || '';
  renderPecas();
  new bootstrap.Modal(document.getElementById('mOS')).show();
}

function editFromDet() {
  bootstrap.Modal.getInstance(document.getElementById('mDet'))?.hide();
  setTimeout(() => { if (editId) editarOS(editId); }, 300);
}

/* ═══════════════════════════════════════════════
   SALVAR OS
═══════════════════════════════════════════════ */
function salvarOS() {
  const fn = document.getElementById('oFunc').value;
  const cl = document.getElementById('oCli').value;
  const ve = document.getElementById('oVeic').value;
  const ti = document.getElementById('oTipo').value;
  const ab = document.getElementById('oAb').value;
  const pr = document.getElementById('oPr').value;
  const errs = [];
  if (!fn) errs.push('funcionário');
  if (!cl) errs.push('cliente');
  if (!ve) errs.push('veículo');
  if (!ti) errs.push('tipo');
  if (!ab) errs.push('data de abertura');
  if (!pr) errs.push('prazo');
  if (errs.length) { showVali(`Preencha: ${errs.join(', ')}.`); return; }

  document.getElementById('vMsg').classList.remove('show');

  const obj = {
    id_funcionario: fn,
    id_cliente:     cl,
    id_veiculo:     parseInt(ve),
    tipo_ordem:     ti,
    diagnostico:    document.getElementById('oDiag').value,
    abertura:       ab,
    prazo:          pr,
    fechamento:     document.getElementById('oFech').value || null,
    conclusao_ordem:document.getElementById('oConc').value || null,
    mao_de_obra:    parseFloat(document.getElementById('oMO').value)  || 0,
    orcamento:      parseFloat(document.getElementById('oOrc').value) || 0,
    pecas:          pecasT,
  };

  if (editId) {
    const idx = ordens.findIndex(x => x.id_ordem === editId);
    ordens[idx] = { ...ordens[idx], ...obj };
    toast('OS atualizada com sucesso!', 'ok');
  } else {
    obj.id_ordem = Math.max(0, ...ordens.map(x => x.id_ordem)) + 1;
    obj.status   = 'aberta';
    ordens.unshift(obj);
    toast('Nova OS criada!', 'ok');
  }

  bootstrap.Modal.getInstance(document.getElementById('mOS'))?.hide();
  renderTbl();
  if (view === 'kanban') renderKanban();
}

/* ═══════════════════════════════════════════════
   FECHAR OS
═══════════════════════════════════════════════ */
function fecharOS() {
  if (!editId) return;
  const mo = parseFloat(document.getElementById('oMO').value) || 0;
  if (!pecasT.length && !mo) { showVali('⚠️ Não é possível fechar sem peças e mão de obra.'); return; }
  if (!pecasT.length)        { showVali('⚠️ Adicione ao menos uma peça substituída.'); return; }
  if (!mo)                   { showVali('⚠️ Informe o valor da mão de obra.'); return; }

  const fech = document.getElementById('oFech').value || new Date().toISOString().split('T')[0];
  document.getElementById('oFech').value = fech;

  const idx = ordens.findIndex(x => x.id_ordem === editId);
  Object.assign(ordens[idx], {
    status:          'concluida',
    fechamento:      fech,
    conclusao_ordem: document.getElementById('oConc').value,
    mao_de_obra:     mo,
    orcamento:       parseFloat(document.getElementById('oOrc').value) || 0,
    pecas:           pecasT,
  });

  bootstrap.Modal.getInstance(document.getElementById('mOS'))?.hide();
  toast('OS fechada e concluída!', 'ok');
  renderTbl();
  if (view === 'kanban') renderKanban();
}

function showVali(msg) {
  const el = document.getElementById('vMsg');
  document.getElementById('vTxt').textContent = msg;
  el.classList.add('show');
  el.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

/* ═══════════════════════════════════════════════
   EXCLUIR
═══════════════════════════════════════════════ */
function askDel(id) {
  delId = id;
  document.getElementById('excNum').textContent = `#${String(id).padStart(4,'0')}`;
  new bootstrap.Modal(document.getElementById('mExc')).show();
}

function confirmDel() {
  ordens = ordens.filter(x => x.id_ordem !== delId);
  bootstrap.Modal.getInstance(document.getElementById('mExc'))?.hide();
  toast('OS excluída.', 'wn');
  renderTbl();
  if (view === 'kanban') renderKanban();
}

/* ═══════════════════════════════════════════════
   DETALHE DA OS
═══════════════════════════════════════════════ */
function verDet(id) {
  const o = ordens.find(x => x.id_ordem === id);
  if (!o) return;
  editId = id;

  document.getElementById('detNum').textContent = `#${String(id).padStart(4,'0')}`;

  const cli   = cliMap[o.id_cliente]?.nome || '—';
  const isVip = cliMap[o.id_cliente]?.vip;
  const veic  = veicMap[o.id_cliente]?.find(v => v.id === o.id_veiculo)?.label || '—';
  const fn    = funcMap[o.id_funcionario] || '—';
  const st    = statMap[o.status] || statMap.aberta;

  const pecasH = (o.pecas || []).length
    ? `<table class="pmt">
        <thead><tr>
          <th>Peça</th><th>Qtd</th><th>Unit.</th><th>Total</th>
        </tr></thead>
        <tbody>
          ${(o.pecas || []).map(p =>
            `<tr>
              <td>${p.nome}</td>
              <td>${p.qtd}</td>
              <td>${fc(p.valor)}</td>
              <td style="font-family:var(--font-mono);color:var(--green)">${fc(p.valor * p.qtd)}</td>
            </tr>`
          ).join('')}
          <tr style="background:rgba(0,0,0,.2);font-weight:600">
            <td colspan="3" style="text-align:right;font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase">
              Subtotal Peças
            </td>
            <td style="font-family:var(--font-mono);color:var(--green)">
              ${fc((o.pecas || []).reduce((s, p) => s + p.valor * p.qtd, 0))}
            </td>
          </tr>
        </tbody>
      </table>`
    : '<p style="color:var(--text-faint);font-size:12px;padding:8px 0">Nenhuma peça lançada.</p>';

  const prazoVenc = o.prazo && !o.fechamento && new Date(o.prazo) < new Date();

  document.getElementById('mDetBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <span class="bdg ${st.bdg}" style="font-size:12px;padding:6px 14px">
        <i class="bi bi-${st.ico}" aria-hidden="true"></i>${st.lbl}
      </span>
      ${isVip ? '<span class="bdg b-purple"><i class="bi bi-star-fill" aria-hidden="true"></i>VIP</span>' : ''}
      <span class="bdg b-steel">${tipoLabel[o.tipo_ordem]||o.tipo_ordem}</span>
    </div>

    <div class="row g-0">
      <div class="col-md-6">
        <div class="dr"><span class="dl">Funcionário</span>   <span class="dv">${fn}</span></div>
        <div class="dr"><span class="dl">Cliente</span>       <span class="dv">${cli}${isVip?' ⭐':''}</span></div>
        <div class="dr"><span class="dl">Veículo / Placa</span><span class="dv">${veic}</span></div>
        <div class="dr"><span class="dl">Abertura</span>      <span class="dv">${fd(o.abertura)}</span></div>
        <div class="dr">
          <span class="dl">Prazo Previsto</span>
          <span class="dv" style="color:${prazoVenc?'var(--rose)':'inherit'}">
            ${fd(o.prazo)}${prazoVenc?' ⚠️':''}
          </span>
        </div>
        <div class="dr">
          <span class="dl">Fechamento</span>
          <span class="dv">${o.fechamento ? fd(o.fechamento) : '<span style="color:var(--text-faint)">—</span>'}</span>
        </div>
      </div>
      <div class="col-md-6" style="padding-left:20px">
        <div class="dr">
          <span class="dl">Mão de Obra</span>
          <span class="dv" style="font-family:var(--font-mono);color:var(--red-vivid)">${fc(o.mao_de_obra)}</span>
        </div>
        <div class="dr">
          <span class="dl">Orçamento Total</span>
          <span class="dv" style="font-family:var(--font-mono);color:var(--green);font-size:18px;font-weight:700">${fc(o.orcamento)}</span>
        </div>
        <div class="dr">
          <span class="dl">Diagnóstico</span>
          <span class="dv" style="line-height:1.6">${o.diagnostico || '<span style="color:var(--text-faint)">Não informado</span>'}</span>
        </div>
        <div class="dr">
          <span class="dl">Conclusão</span>
          <span class="dv" style="line-height:1.6">${o.conclusao_ordem || '<span style="color:var(--text-faint)">OS ainda não fechada</span>'}</span>
        </div>
      </div>
    </div>

    <div style="margin-top:20px">
      <div class="fsec" style="margin-top:0">
        <i class="bi bi-box-seam" aria-hidden="true" style="margin-right:6px"></i>Peças Substituídas
      </div>
      ${pecasH}
    </div>

    <div style="margin-top:20px">
      <div class="fsec" style="margin-top:0">
        <i class="bi bi-clock-history" aria-hidden="true" style="margin-right:6px"></i>Histórico
      </div>
      <div class="tl">
        <div class="tl-item">
          <div class="tl-dot" style="border-color:var(--blue);color:var(--blue)">
            <i class="bi bi-circle-fill" style="font-size:7px" aria-hidden="true"></i>
          </div>
          <div class="tl-con">
            <div class="tl-tit">OS Aberta</div>
            <div class="tl-tm">${fd(o.abertura)} — ${fn}</div>
          </div>
        </div>
        ${(o.pecas||[]).length ? `
        <div class="tl-item">
          <div class="tl-dot" style="border-color:var(--red-vivid);color:var(--red-vivid)">
            <i class="bi bi-box-seam" style="font-size:10px" aria-hidden="true"></i>
          </div>
          <div class="tl-con">
            <div class="tl-tit">Peças Lançadas (${(o.pecas||[]).length})</div>
            <div class="tl-tm">Estoque atualizado automaticamente</div>
          </div>
        </div>` : ''}
        ${o.fechamento ? `
        <div class="tl-item">
          <div class="tl-dot" style="border-color:var(--green);color:var(--green)">
            <i class="bi bi-check-lg" style="font-size:10px" aria-hidden="true"></i>
          </div>
          <div class="tl-con">
            <div class="tl-tit">OS Fechada &amp; Concluída</div>
            <div class="tl-tm">${fd(o.fechamento)}</div>
          </div>
        </div>` : ''}
      </div>
    </div>`;

  document.getElementById('btnEditDet').style.display = role === 'gerente' ? 'inline-flex' : 'none';
  new bootstrap.Modal(document.getElementById('mDet')).show();
}

/* ═══════════════════════════════════════════════
   PEÇAS (formulário)
═══════════════════════════════════════════════ */
function renderPecas() {
  const c = document.getElementById('pecasCont');
  if (!c) return;

  if (!pecasT.length) {
    c.innerHTML = '<div style="font-size:12px;color:var(--text-faint);padding:8px 0">Nenhuma peça. Clique em "+ Adicionar Peça".</div>';
    return;
  }

  c.innerHTML = `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:rgba(0,0,0,.3)">
        <th style="padding:7px 10px;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-faint);font-weight:400;text-align:left">Peça</th>
        <th style="padding:7px 10px;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-faint);font-weight:400;text-align:left;width:80px">Qtd</th>
        <th style="padding:7px 10px;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-faint);font-weight:400;text-align:left;width:120px">Unit. R$</th>
        <th style="padding:7px 10px;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-faint);font-weight:400;text-align:left;width:120px">Total</th>
        <th style="width:40px"></th>
      </tr></thead>
      <tbody>
        ${pecasT.map((p, i) => `
        <tr style="border-top:1px solid var(--border-subtle)">
          <td style="padding:6px 8px">
            <input class="inp" style="padding:6px 10px;font-size:12px" type="text"
              value="${p.nome}" placeholder="Nome da peça..."
              oninput="pecasT[${i}].nome=this.value"
              aria-label="Nome da peça ${i+1}" />
          </td>
          <td style="padding:6px 8px">
            <input class="inp" style="padding:6px 10px;font-size:12px;width:70px" type="number"
              value="${p.qtd}" min="1"
              oninput="pecasT[${i}].qtd=parseInt(this.value)||1;calcOrc()"
              aria-label="Quantidade da peça ${i+1}" />
          </td>
          <td style="padding:6px 8px">
            <input class="inp" style="padding:6px 10px;font-size:12px;width:110px" type="number"
              value="${p.valor}" min="0" step="0.01"
              oninput="pecasT[${i}].valor=parseFloat(this.value)||0;calcOrc()"
              aria-label="Valor unitário da peça ${i+1}" />
          </td>
          <td style="padding:6px 10px;font-family:var(--font-mono);font-size:12px;color:var(--green)">${fc(p.valor * p.qtd)}</td>
          <td style="padding:6px 4px">
            <button type="button" class="btn btn-ghost btn-xs" style="color:var(--rose)"
              onclick="removePeca(${i})" aria-label="Remover peça ${i+1}">
              <i class="bi bi-trash3" aria-hidden="true"></i>
            </button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
  calcOrc();
}

function addPeca()      { pecasT.push({ nome:'', qtd:1, valor:0 }); renderPecas(); }
function removePeca(i)  { pecasT.splice(i, 1); renderPecas(); }

function calcOrc() {
  const tp  = pecasT.reduce((s, p) => s + (p.valor || 0) * (p.qtd || 1), 0);
  const mo  = parseFloat(document.getElementById('oMO')?.value) || 0;
  const el  = document.getElementById('oOrc');
  if (el) el.value = (tp + mo).toFixed(2);
}

/* ═══════════════════════════════════════════════
   VEÍCULOS (select dependente)
═══════════════════════════════════════════════ */
function popVeic(sel = null) {
  const ci = document.getElementById('oCli').value;
  const vs = veicMap[ci] || [];
  const s  = document.getElementById('oVeic');
  s.innerHTML = vs.length
    ? '<option value="">Selecione...</option>' +
      vs.map(v => `<option value="${v.id}"${sel === v.id ? ' selected' : ''}>${v.label}</option>`).join('')
    : '<option value="">Selecione um cliente primeiro</option>';
}

/* ═══════════════════════════════════════════════
   EXPORTAR CSV
═══════════════════════════════════════════════ */
function exportarCSV() {
  const data = getFilt();
  let csv = '#OS,Cliente,Veículo,Tipo,Abertura,Prazo,Fechamento,Mão de Obra,Orçamento,Status\n';
  data.forEach(o => {
    const c = cliMap[o.id_cliente]?.nome || '';
    const v = veicMap[o.id_cliente]?.find(x => x.id === o.id_veiculo)?.label || '';
    csv += `${o.id_ordem},"${c}","${v}",${o.tipo_ordem},${o.abertura||''},${o.prazo||''},${o.fechamento||''},${o.mao_de_obra},${o.orcamento},${o.status}\n`;
  });
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  a.download = `automax_os_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast('Relatório exportado!', 'ok');
}

/* ═══════════════════════════════════════════════
   SIDEBAR (mobile)
═══════════════════════════════════════════════ */
function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('overlay');
  const btn = document.querySelector('.sb-toggle');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('show', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.querySelector('.sb-toggle')?.setAttribute('aria-expanded', 'false');
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function toast(msg, type = 'ok') {
  const ico = { ok:'check-circle-fill', er:'x-circle-fill', wn:'exclamation-triangle-fill' };
  const col = { ok:'var(--green)',      er:'var(--rose)',    wn:'var(--amber)' };
  const el  = document.createElement('div');
  el.className = `tmsg t-${type}`;
  el.innerHTML = `<i class="bi bi-${ico[type]}" style="color:${col[type]};font-size:18px;flex-shrink:0" aria-hidden="true"></i>${msg}`;
  document.getElementById('toastC').appendChild(el);
  setTimeout(() => {
    el.style.opacity    = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function fd(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function fc(v) {
  if (v == null || v === '') return '—';
  return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v);
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('oAb').value = new Date().toISOString().split('T')[0];
  // Itens de nav: visibilidade inicial (gerente)
  document.querySelectorAll('.rnav').forEach(el =>
    el.style.display = el.classList.contains('r-g') ? 'flex' : 'none'
  );
  renderTbl();
});