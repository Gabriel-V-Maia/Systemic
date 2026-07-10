const user        = window.__session_user || {};
const csrf        = user.csrf_token || '';
const pode_editar = (user.permissoes || []).includes('estoque.editar');

let modalPeca, modalProd, modalExc, modalSelecionarPeca;

/* ============================================================
 * Utilitários compartilhados
 * ============================================================ */

function setupSidebar() {
    const av = document.getElementById('sbAv');
    av.textContent = user.iniciais || '?';
    av.className   = 'av av-' + (user.nivel || '');
    document.getElementById('sbName').textContent = user.nome || '';
    const role = document.getElementById('sbRole');
    role.textContent = user.nivel || '';
    role.className   = 'pbadge pb-' + (user.nivel || '');
    document.getElementById('csrfLogout').value = csrf;

    const perms = user.permissoes || [];
    document.querySelectorAll('.rnav.r-g').forEach(el => {
        if (!perms.includes('funcionarios.visualizar')) el.style.display = 'none';
    });
    document.querySelectorAll('.rnav.r-m').forEach(el => {
        if (!perms.includes('estoque.visualizar')) el.style.display = 'none';
    });
    document.querySelectorAll('.rnav.r-c').forEach(el => {
        if (!perms.includes('clientes.gerenciar')) el.style.display = 'none';
    });
}

function toggleSidebar() {
    const sb   = document.getElementById('sidebar');
    const ov   = document.getElementById('overlay');
    const open = sb.classList.toggle('open');
    ov.classList.toggle('show', open);
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

function toast(msg, tipo = 'ok') {
    const c    = document.getElementById('toastC');
    const t    = document.createElement('div');
    t.className = 'tmsg t-' + (tipo === 'ok' ? 'ok' : tipo === 'erro' ? 'er' : 'wn');
    const icon = tipo === 'ok' ? 'check-circle-fill' : tipo === 'erro' ? 'x-circle-fill' : 'exclamation-triangle-fill';
    const cor  = tipo === 'ok' ? 'var(--green)' : tipo === 'erro' ? 'var(--rose)' : 'var(--amber)';
    t.innerHTML = `<i class="bi bi-${icon}" style="color:${cor};font-size:18px;flex-shrink:0"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatar_brl(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function classe_stock(qtd) {
    if (qtd <= 0) return 'stock-zero';
    if (qtd <= 5) return 'stock-baixo';
    return 'stock-ok';
}

function label_cat(cat) {
    return { pecas: 'Peças', fluidos: 'Fluidos', eletrico: 'Elétrico' }[cat] ?? cat;
}

/* Exclusão é compartilhada entre Peças e Produtos: o modal genérico
 * guarda qual endpoint e qual função de recarga usar, definidos por
 * quem chamou confirmarDelete(). */
let exclusao_pendente = null;

function confirmarDelete({ endpoint, nome, tipo_label, recarregar }) {
    exclusao_pendente = { endpoint, recarregar };
    document.getElementById('excNome').textContent = nome;
    document.getElementById('mExcTit').textContent = `Remover ${tipo_label}`;
    modalExc.show();
}

async function executarDelete() {
    if (exclusao_pendente === null) return;
    const btn    = document.getElementById('btnConfirmarDelete');
    btn.disabled = true;

    try {
        const res   = await fetch(exclusao_pendente.endpoint, {
            method:      'DELETE',
            credentials: 'same-origin',
            headers:     { 'X-CSRF-Token': csrf },
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Erro ao remover.');

        toast('Removido com sucesso.');
        modalExc.hide();
        exclusao_pendente.recarregar();

    } catch (err) {
        toast(err.message, 'erro');
    } finally {
        btn.disabled = false;
        exclusao_pendente = null;
    }
}

/* ============================================================
 * Navegação entre abas (Peças / Produtos)
 * ============================================================ */

function ativarAba(nome) {
    const abas = {
        pecas:    { tab: 'tabPecas',    painel: 'painelPecas' },
        produtos: { tab: 'tabProdutos', painel: 'painelProdutos' },
    };

    Object.entries(abas).forEach(([chave, ids]) => {
        const ativa = chave === nome;
        document.getElementById(ids.tab).classList.toggle('ativa', ativa);
        document.getElementById(ids.tab).setAttribute('aria-selected', String(ativa));
        document.getElementById(ids.painel).classList.toggle('ativa', ativa);
    });

    if (nome === 'produtos' && !produtos_carregados_uma_vez) {
        carregarProdutos();
        produtos_carregados_uma_vez = true;
    }
}

/* ============================================================
 * PEÇAS — estoque técnico interno (tabela `pecas`)
 * ============================================================ */

let peca_pagina_atual  = 1;
let peca_busca_atual   = '';
let peca_timeout_busca = null;
let fornecedores_cache = [];

async function carregarFornecedores() {
    try {
        const res = await fetch('/api/fornecedores', { credentials: 'same-origin' });
        fornecedores_cache = res.ok ? await res.json() : [];
    } catch {
        fornecedores_cache = [];
    }

    const select = document.getElementById('selectFornecedorPeca');
    select.innerHTML = '<option value="">Selecione...</option>' +
        fornecedores_cache.map(f => `<option value="${f.id_fornecedor}">${esc(f.nome_fornecedor)}</option>`).join('');
}

async function carregarPecas(pagina = 1) {
    peca_pagina_atual = pagina;
    const params = new URLSearchParams({ pagina, busca: peca_busca_atual });

    try {
        const res   = await fetch(`/api/estoque?${params}`, { credentials: 'same-origin' });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Erro desconhecido');
        renderTabelaPecas(dados.pecas, dados.total);
        renderPaginacao('paginacaoPecas', dados.pagina, dados.paginas, carregarPecas);
    } catch (err) {
        document.getElementById('tbodyPecas').innerHTML = `
            <tr><td colspan="5">
                <div class="empty">
                    <i class="bi bi-exclamation-triangle"></i>
                    <h4>Erro ao carregar</h4>
                    <p>${esc(err.message)}</p>
                </div>
            </td></tr>`;
    }
}

function renderTabelaPecas(pecas, total) {
    document.getElementById('countPecas').textContent = `${total} peça(s)`;
    const tbody = document.getElementById('tbodyPecas');

    if (pecas.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5">
                <div class="empty">
                    <i class="bi bi-nut"></i>
                    <h4>Nenhuma peça encontrada</h4>
                    <p>Tente outra busca ou cadastre uma nova peça.</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = pecas.map(p => {
        const cls_qtd = classe_stock(p.quantidade);

        const controle_qtd = pode_editar ? `
            <div style="display:flex;align-items:center;gap:6px">
                <button class="btn btn-ghost btn-xs btn-delta" onclick="ajustarQuantidadePeca(${p.id}, -1)" aria-label="Remover 1">
                    <i class="bi bi-dash" aria-hidden="true"></i>
                </button>
                <span class="${cls_qtd}" id="qtd-peca-${p.id}" style="font-family:var(--font-mono);min-width:28px;text-align:center">${p.quantidade}</span>
                <button class="btn btn-ghost btn-xs btn-delta" onclick="ajustarQuantidadePeca(${p.id}, 1)" aria-label="Adicionar 1">
                    <i class="bi bi-plus" aria-hidden="true"></i>
                </button>
            </div>
        ` : `<span class="${cls_qtd}" style="font-family:var(--font-mono)">${p.quantidade}</span>`;

        const acoes = pode_editar ? `
            <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="abrirEdicaoPeca(${p.id})" aria-label="Editar">
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="confirmarDelete({
                    endpoint: '/api/estoque/${p.id}',
                    nome: '${esc(p.nome)}',
                    tipo_label: 'Peça',
                    recarregar: () => carregarPecas(peca_pagina_atual),
                })" aria-label="Remover">
                    <i class="bi bi-trash3" aria-hidden="true"></i>
                </button>
            </div>
        ` : '—';

        return `
            <tr>
                <td style="font-weight:500;color:var(--off-white)">${esc(p.nome)}</td>
                <td style="color:var(--chrome-dim)">${esc(p.tipo || '—')}</td>
                <td style="color:var(--chrome-dim)">${esc(p.nome_fornecedor)}</td>
                <td>${controle_qtd}</td>
                <td>${acoes}</td>
            </tr>
        `;
    }).join('');
}

async function ajustarQuantidadePeca(id_peca, delta) {
    try {
        const res   = await fetch(`/api/estoque/${id_peca}/quantidade`, {
            method:      'PATCH',
            credentials: 'same-origin',
            headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body:        JSON.stringify({ delta }),
        });
        const dados = await res.json();
        if (!res.ok) { toast(dados.erro || 'Erro ao ajustar quantidade.', 'erro'); return; }

        const span = document.getElementById(`qtd-peca-${id_peca}`);
        if (span) {
            span.textContent = dados.quantidade;
            span.className   = classe_stock(dados.quantidade);
        }
    } catch {
        toast('Falha de conexão ao ajustar quantidade.', 'erro');
    }
}

function resetarModalPeca() {
    document.getElementById('pecaId').value               = '';
    document.getElementById('inputNomePeca').value         = '';
    document.getElementById('inputTipoPeca').value         = '';
    document.getElementById('inputQuantidadePeca').value   = '0';
    document.getElementById('selectFornecedorPeca').value  = '';
    document.getElementById('vMsgPeca').classList.remove('show');
}

function abrirNovaPeca() {
    document.getElementById('mPecaTit').textContent = 'Nova Peça';
    resetarModalPeca();
    modalPeca.show();
}

async function abrirEdicaoPeca(id_peca) {
    document.getElementById('mPecaTit').textContent = 'Editar Peça';
    resetarModalPeca();
    document.getElementById('pecaId').value = id_peca;
    modalPeca.show();

    try {
        const res   = await fetch(`/api/estoque/${id_peca}`, { credentials: 'same-origin' });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Erro ao carregar peça.');

        document.getElementById('inputNomePeca').value        = dados.nome        ?? '';
        document.getElementById('inputTipoPeca').value        = dados.tipo        ?? '';
        document.getElementById('inputQuantidadePeca').value  = dados.quantidade  ?? '0';
        document.getElementById('selectFornecedorPeca').value = dados.id_fornecedor ?? '';

    } catch (err) {
        document.getElementById('vTxtPeca').textContent = err.message;
        document.getElementById('vMsgPeca').classList.add('show');
    }
}

async function salvarPeca() {
    const id  = document.getElementById('pecaId').value;
    const btn = document.getElementById('btnSalvarPeca');
    btn.disabled = true;

    try {
        const payload = {
            nome_peca:     document.getElementById('inputNomePeca').value.trim(),
            tipo:          document.getElementById('inputTipoPeca').value.trim(),
            quantidade:    Math.max(0, parseInt(document.getElementById('inputQuantidadePeca').value, 10) || 0),
            id_fornecedor: parseInt(document.getElementById('selectFornecedorPeca').value, 10) || null,
        };

        const res   = await fetch(id ? `/api/estoque/${id}` : '/api/estoque', {
            method:      id ? 'PATCH' : 'POST',
            credentials: 'same-origin',
            headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body:        JSON.stringify(payload),
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Erro ao salvar.');

        toast(id ? 'Peça atualizada.' : 'Peça cadastrada.');
        modalPeca.hide();
        carregarPecas(peca_pagina_atual);

    } catch (err) {
        document.getElementById('vTxtPeca').textContent = err.message;
        document.getElementById('vMsgPeca').classList.add('show');
    } finally {
        btn.disabled = false;
    }
}

/* ============================================================
 * PRODUTOS — vitrine pública (tabela `produtos`)
 * ============================================================ */

let produtos_carregados_uma_vez = false;
let prod_pagina_atual    = 1;
let prod_categoria_atual = '';
let prod_busca_atual     = '';
let prod_timeout_busca   = null;

async function carregarProdutos(pagina = 1) {
    prod_pagina_atual = pagina;
    const params = new URLSearchParams({ pagina, categoria: prod_categoria_atual, busca: prod_busca_atual });

    try {
        const res   = await fetch(`/api/produtos-gerencia?${params}`, { credentials: 'same-origin' });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Erro desconhecido');
        renderTabelaProdutos(dados.produtos, dados.total);
        renderPaginacao('paginacaoProdutos', dados.pagina, dados.paginas, carregarProdutos);
    } catch (err) {
        document.getElementById('tbodyProdutos').innerHTML = `
            <tr><td colspan="6">
                <div class="empty">
                    <i class="bi bi-exclamation-triangle"></i>
                    <h4>Erro ao carregar</h4>
                    <p>${esc(err.message)}</p>
                </div>
            </td></tr>`;
    }
}

function renderTabelaProdutos(produtos, total) {
    document.getElementById('countProdutos').textContent = `${total} produto(s)`;
    const tbody = document.getElementById('tbodyProdutos');

    if (produtos.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty">
                    <i class="bi bi-shop"></i>
                    <h4>Nenhum produto encontrado</h4>
                    <p>Tente outro filtro ou cadastre um novo produto.</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = produtos.map(p => {
        const cls_stock = classe_stock(p.stock);

        const controle_stock = pode_editar ? `
            <div style="display:flex;align-items:center;gap:6px">
                <button class="btn btn-ghost btn-xs btn-delta" onclick="ajustarStockProduto(${p.id}, -1)" aria-label="Remover 1">
                    <i class="bi bi-dash" aria-hidden="true"></i>
                </button>
                <span class="${cls_stock}" id="stock-${p.id}" style="font-family:var(--font-mono);min-width:28px;text-align:center">${p.stock}</span>
                <button class="btn btn-ghost btn-xs btn-delta" onclick="ajustarStockProduto(${p.id}, 1)" aria-label="Adicionar 1">
                    <i class="bi bi-plus" aria-hidden="true"></i>
                </button>
            </div>
        ` : `<span class="${cls_stock}" style="font-family:var(--font-mono)">${p.stock}</span>`;

        const acoes = pode_editar ? `
            <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="abrirEdicaoProduto(${p.id})" aria-label="Editar">
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="confirmarDelete({
                    endpoint: '/api/produtos-gerencia/${p.id}',
                    nome: '${esc(p.nome)}',
                    tipo_label: 'Produto',
                    recarregar: () => carregarProdutos(prod_pagina_atual),
                })" aria-label="Remover">
                    <i class="bi bi-trash3" aria-hidden="true"></i>
                </button>
            </div>
        ` : '—';

        return `
            <tr>
                <td>
                    <img src="${esc(p.imagem)}" alt="${esc(p.nome)}" class="prod-thumb"
                         onerror="this.src='https://placehold.co/36x36/14161A/454952?text=?'">
                </td>
                <td style="font-weight:500;color:var(--off-white)">${esc(p.nome)}</td>
                <td><span class="cat-badge cat-${esc(p.categoria)}">${esc(label_cat(p.categoria))}</span></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--chrome-dim)">${formatar_brl(p.preco)}</td>
                <td>${controle_stock}</td>
                <td>${acoes}</td>
            </tr>
        `;
    }).join('');
}

function renderPaginacao(container_id, pagina, total, fn_pagina) {
    const container = document.getElementById(container_id);
    container.innerHTML = '';
    if (total <= 1) return;

    const btn_ant = document.createElement('button');
    btn_ant.className = 'btn btn-ghost btn-sm';
    btn_ant.innerHTML = '<i class="bi bi-chevron-left"></i>';
    btn_ant.disabled  = pagina <= 1;
    btn_ant.addEventListener('click', () => fn_pagina(pagina - 1));
    container.appendChild(btn_ant);

    const info = document.createElement('span');
    info.style.cssText = 'font-family:var(--font-mono);font-size:11px;color:var(--text-faint);align-self:center;padding:0 4px';
    info.textContent   = `${pagina} / ${total}`;
    container.appendChild(info);

    const btn_prox = document.createElement('button');
    btn_prox.className = 'btn btn-ghost btn-sm';
    btn_prox.innerHTML = '<i class="bi bi-chevron-right"></i>';
    btn_prox.disabled  = pagina >= total;
    btn_prox.addEventListener('click', () => fn_pagina(pagina + 1));
    container.appendChild(btn_prox);
}

async function ajustarStockProduto(id_produto, delta) {
    try {
        const res   = await fetch(`/api/produtos-gerencia/${id_produto}/stock`, {
            method:      'PATCH',
            credentials: 'same-origin',
            headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body:        JSON.stringify({ delta }),
        });
        const dados = await res.json();
        if (!res.ok) { toast(dados.erro || 'Erro ao ajustar estoque.', 'erro'); return; }

        const span = document.getElementById(`stock-${id_produto}`);
        if (span) {
            span.textContent = dados.stock;
            span.className   = classe_stock(dados.stock);
        }
    } catch {
        toast('Falha de conexão ao ajustar estoque.', 'erro');
    }
}

function mostrar_preview(src) {
    const preview       = document.getElementById('previewImagem');
    preview.src         = src;
    preview.style.display = '';
}

function esconder_preview() {
    const preview       = document.getElementById('previewImagem');
    preview.src         = '';
    preview.style.display = 'none';
}

function resetarModalProduto() {
    document.getElementById('produtoId').value      = '';
    document.getElementById('pecaOrigemId').value    = '';
    document.getElementById('inputNome').value      = '';
    document.getElementById('inputCategoria').value = '';
    document.getElementById('inputPreco').value     = '';
    document.getElementById('inputStock').value     = '0';
    document.getElementById('inputDetalhes').value  = '';
    document.getElementById('imagemUrl').value      = '';
    document.getElementById('inputImagem').value    = '';
    document.getElementById('vMsg').classList.remove('show');
    document.getElementById('blocoOrigemPeca').style.display = 'none';
    esconder_preview();
}

function abrirNovoProduto() {
    document.getElementById('mTit').textContent = 'Novo Produto';
    resetarModalProduto();
    modalProd.show();
}

async function abrirEdicaoProduto(id_produto) {
    document.getElementById('mTit').textContent = 'Editar Produto';
    resetarModalProduto();
    document.getElementById('produtoId').value = id_produto;
    modalProd.show();

    try {
        const res   = await fetch(`/api/produtos-gerencia/${id_produto}`, { credentials: 'same-origin' });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Erro ao carregar produto.');

        document.getElementById('inputNome').value      = dados.nome      ?? '';
        document.getElementById('inputCategoria').value = dados.categoria  ?? '';
        document.getElementById('inputPreco').value     = dados.preco      ?? '';
        document.getElementById('inputStock').value     = dados.stock      ?? '0';
        document.getElementById('inputDetalhes').value  = dados.detalhes   ?? '';
        document.getElementById('imagemUrl').value      = dados.imagem     ?? '';

        if (dados.imagem) mostrar_preview(dados.imagem);

    } catch (err) {
        document.getElementById('vTxt').textContent = err.message;
        document.getElementById('vMsg').classList.add('show');
    }
}

/* Abre o modal de Produto já pré-preenchido a partir de uma peça
 * selecionada no modal "Publicar da Peça". Preço/imagem/descrição
 * ficam em branco propositalmente — são definidos agora, na publicação,
 * podendo ser diferentes do custo interno da peça. */
function abrirNovoProdutoDePeca(peca) {
    document.getElementById('mTit').textContent = 'Publicar Produto';
    resetarModalProduto();
    document.getElementById('pecaOrigemId').value = peca.id;
    document.getElementById('inputNome').value     = peca.nome;

    document.getElementById('nomeOrigemPeca').textContent = peca.nome;
    document.getElementById('blocoOrigemPeca').style.display = '';

    modalProd.show();
}

async function fazer_upload_imagem(arquivo) {
    const form_data = new FormData();
    form_data.append('imagem', arquivo);

    const res   = await fetch('/api/produtos-gerencia/imagem', {
        method:      'POST',
        credentials: 'same-origin',
        headers:     { 'X-CSRF-Token': csrf },
        body:        form_data,
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Falha no upload da imagem.');
    return dados.imagem_url;
}

async function salvarProduto() {
    const id            = document.getElementById('produtoId').value;
    const id_peca_origem = document.getElementById('pecaOrigemId').value;
    const arquivo        = document.getElementById('inputImagem').files[0];
    let imagem_url        = document.getElementById('imagemUrl').value.trim();

    const btn = document.getElementById('btnSalvar');
    btn.disabled = true;

    try {
        if (arquivo) {
            imagem_url = await fazer_upload_imagem(arquivo);
            document.getElementById('imagemUrl').value = imagem_url;
        }

        if (!imagem_url) {
            document.getElementById('vTxt').textContent = 'Selecione uma imagem para o produto.';
            document.getElementById('vMsg').classList.add('show');
            return;
        }

        const payload = {
            nome:      document.getElementById('inputNome').value.trim(),
            categoria: document.getElementById('inputCategoria').value,
            preco:     Math.max(0, parseFloat(document.getElementById('inputPreco').value) || 0),
            stock:     Math.max(0, parseInt(document.getElementById('inputStock').value, 10) || 0),
            imagem:    imagem_url,
            detalhes:  document.getElementById('inputDetalhes').value.trim(),
        };

        if (!id && id_peca_origem) {
            payload.id_peca_origem = parseInt(id_peca_origem, 10);
        }

        const res   = await fetch(id ? `/api/produtos-gerencia/${id}` : '/api/produtos-gerencia', {
            method:      id ? 'PATCH' : 'POST',
            credentials: 'same-origin',
            headers:     { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body:        JSON.stringify(payload),
        });
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.erro || 'Erro ao salvar.');

        toast(id ? 'Produto atualizado.' : 'Produto cadastrado.');
        modalProd.hide();
        carregarProdutos(prod_pagina_atual);

    } catch (err) {
        document.getElementById('vTxt').textContent = err.message;
        document.getElementById('vMsg').classList.add('show');
    } finally {
        btn.disabled = false;
    }
}

/* ============================================================
 * Publicar da Peça — busca peças do estoque interno para virar produto
 * ============================================================ */

let publicar_timeout_busca = null;

async function buscarPecasParaPublicar(termo) {
    const lista = document.getElementById('resultadoPecaPublicar');

    if (termo.trim().length < 2) {
        lista.innerHTML = '';
        return;
    }

    lista.innerHTML = '<li style="padding:8px 4px;font-size:12px;color:var(--text-faint)">Buscando…</li>';

    try {
        const res   = await fetch(`/api/estoque/busca?q=${encodeURIComponent(termo.trim())}`, { credentials: 'same-origin' });
        const dados = await res.json();
        const pecas = dados.pecas || [];

        if (pecas.length === 0) {
            lista.innerHTML = '<li style="padding:8px 4px;font-size:12px;color:var(--text-faint)">Nenhuma peça encontrada.</li>';
            return;
        }

        lista.innerHTML = pecas.map(p => `
            <li style="padding:10px 8px;cursor:pointer;border-bottom:1px solid var(--border-subtle)"
                onclick='selecionarPecaParaPublicar(${JSON.stringify(p)})'>
                <div style="font-weight:500;color:var(--off-white);font-size:13px">${esc(p.nome)}</div>
                <div style="font-size:11px;color:var(--text-faint);font-family:var(--font-mono);margin-top:2px">
                    ${esc(p.tipo || 'sem tipo')} · ${p.quantidade} em estoque · ${esc(p.nome_fornecedor)}
                </div>
            </li>
        `).join('');
    } catch {
        lista.innerHTML = '<li style="padding:8px 4px;font-size:12px;color:var(--rose)">Erro ao buscar peças.</li>';
    }
}

function selecionarPecaParaPublicar(peca) {
    modalSelecionarPeca.hide();
    document.getElementById('buscaPecaPublicar').value = '';
    document.getElementById('resultadoPecaPublicar').innerHTML = '';
    abrirNovoProdutoDePeca(peca);
}

/* ============================================================
 * Inicialização
 * ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    setupSidebar();

    modalPeca            = new bootstrap.Modal(document.getElementById('mPeca'));
    modalProd            = new bootstrap.Modal(document.getElementById('mProd'));
    modalExc             = new bootstrap.Modal(document.getElementById('mExc'));
    modalSelecionarPeca  = new bootstrap.Modal(document.getElementById('mSelecionarPeca'));

    document.getElementById('tabPecas').addEventListener('click', () => ativarAba('pecas'));
    document.getElementById('tabProdutos').addEventListener('click', () => ativarAba('produtos'));

    document.getElementById('btnConfirmarDelete').addEventListener('click', executarDelete);

    if (pode_editar) {
        document.getElementById('btnNovaPeca').style.display = '';
        document.getElementById('btnNovaPeca').addEventListener('click', abrirNovaPeca);
        document.getElementById('btnSalvarPeca').addEventListener('click', salvarPeca);

        document.getElementById('acoesProdutos').style.display = '';
        document.getElementById('btnNovoProduto').addEventListener('click', abrirNovoProduto);
        document.getElementById('btnPublicarPeca').addEventListener('click', () => modalSelecionarPeca.show());

        document.getElementById('btnRemoverOrigemPeca').addEventListener('click', () => {
            document.getElementById('pecaOrigemId').value = '';
            document.getElementById('blocoOrigemPeca').style.display = 'none';
        });

        carregarFornecedores();
    }

    document.getElementById('inputImagem').addEventListener('change', function () {
        const arquivo = this.files[0];
        if (!arquivo) return;
        mostrar_preview(URL.createObjectURL(arquivo));
    });

    document.getElementById('searchPecas').addEventListener('input', e => {
        clearTimeout(peca_timeout_busca);
        peca_timeout_busca = setTimeout(() => {
            peca_busca_atual = e.target.value.trim();
            carregarPecas(1);
        }, 350);
    });

    document.getElementById('searchProdutos').addEventListener('input', e => {
        clearTimeout(prod_timeout_busca);
        prod_timeout_busca = setTimeout(() => {
            prod_busca_atual = e.target.value.trim();
            carregarProdutos(1);
        }, 350);
    });

    document.getElementById('buscaPecaPublicar').addEventListener('input', e => {
        clearTimeout(publicar_timeout_busca);
        publicar_timeout_busca = setTimeout(() => buscarPecasParaPublicar(e.target.value), 300);
    });

    document.querySelectorAll('#painelProdutos .chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#painelProdutos .chip').forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');
            prod_categoria_atual = btn.dataset.cat;
            carregarProdutos(1);
        });
    });

    carregarPecas();
});
