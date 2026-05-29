/**
 * produto.js
 *
 * Responsabilidades:
 *  1. Ler o ID do produto a partir da URL (/produto/:id)
 *  2. Buscar os dados na API (/api/produto?id=:id)
 *  3. Popular o HTML com os dados recebidos
 *  4. Renderizar produtos relacionados
 *  5. Tratar erros com estados de UI adequados
 */

// ── Leitura da URL ────────────────────────────────────────────────────────

function extrair_id_da_url() {
    const segmentos = window.location.pathname.split('/').filter(Boolean);
    const indice_produto = segmentos.indexOf('produto');

    if (indice_produto === -1 || indice_produto + 1 >= segmentos.length) {
        return null;
    }

    const id = parseInt(segmentos[indice_produto + 1], 10);
    return Number.isFinite(id) && id > 0 ? id : null;
}

// ── Formatação ────────────────────────────────────────────────────────────

function formatar_brl(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

// ── Busca na API ──────────────────────────────────────────────────────────

async function buscar_produto(id) {
    const resposta = await fetch(`/api/produto?id=${id}`);
    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro ?? 'Erro desconhecido.');
    }

    return dados;
}

// ── Renderização do produto ───────────────────────────────────────────────

function renderizar_produto(produto) {
    // Título e badge de estoque
    document.getElementById('produto-nome').textContent = produto.nome;
    document.getElementById('produto-categoria').textContent = produto.categoria;

    const badge_estoque = document.getElementById('produto-badge');
    if (produto.stock > 0) {
        badge_estoque.textContent = 'EM ESTOQUE';
        badge_estoque.classList.remove('badge-esgotado');
    } else {
        badge_estoque.textContent = 'ESGOTADO';
        badge_estoque.classList.add('badge-esgotado');
    }

    // Preço
    document.getElementById('produto-preco').textContent = formatar_brl(produto.preco);

    // Detalhes (campo texto livre do banco)
    document.getElementById('produto-detalhes').textContent = produto.detalhes;

    // Imagem principal no carousel
    const img_principal = document.getElementById('produto-imagem-principal');
    img_principal.src = produto.imagem;
    img_principal.alt = produto.nome;

    // Botão de pedido desabilitado se sem estoque
    const btn_pedir = document.getElementById('btn-pedir');
    if (produto.stock <= 0) {
        btn_pedir.disabled = true;
        btn_pedir.textContent = 'Sem estoque';
    }

    // Atualiza title da aba
    document.title = `${produto.nome} — AUTO MAX`;
}

// ── Renderização dos relacionados ─────────────────────────────────────────

function renderizar_relacionados(relacionados) {
    const container = document.getElementById('relacionados-container');
    container.innerHTML = '';

    if (relacionados.length === 0) {
        container.innerHTML = '<p class="text-dim text-center w-100">Nenhum produto relacionado encontrado.</p>';
        return;
    }

    relacionados.forEach(item => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
            <a href="/produto/${item.id_produto}" class="card-relacionado-link">
                <div class="card h-100 text-center">
                    <img
                        src="${item.imagem}"
                        class="card-img-top p-3"
                        alt="${item.nome}"
                        onerror="this.src='https://placehold.co/300x200/1E2126/B0B3B8?text=Sem+Imagem'"
                    >
                    <div class="card-body">
                        <h6>${item.nome}</h6>
                        <p class="preco-relacionado">${formatar_brl(item.preco)}</p>
                    </div>
                </div>
            </a>
        `;
        container.appendChild(col);
    });
}

// ── Estados de UI ─────────────────────────────────────────────────────────

function mostrar_loading() {
    document.getElementById('estado-loading').hidden = false;
    document.getElementById('estado-erro').hidden    = true;
    document.getElementById('conteudo-produto').hidden = true;
}

function mostrar_erro(mensagem) {
    document.getElementById('estado-loading').hidden = true;
    document.getElementById('estado-erro').hidden    = false;
    document.getElementById('conteudo-produto').hidden = true;
    document.getElementById('mensagem-erro').textContent = mensagem;
}

function mostrar_conteudo() {
    document.getElementById('estado-loading').hidden   = true;
    document.getElementById('estado-erro').hidden      = true;
    document.getElementById('conteudo-produto').hidden = false;
}

// ── Inicialização ─────────────────────────────────────────────────────────

async function inicializar() {
    const id = extrair_id_da_url();

    if (id === null) {
        mostrar_erro('ID de produto inválido ou não informado na URL.');
        return;
    }

    mostrar_loading();

    try {
        const { produto, relacionados } = await buscar_produto(id);
        renderizar_produto(produto);
        renderizar_relacionados(relacionados);
        mostrar_conteudo();
    } catch (erro) {
        mostrar_erro(erro.message);
    }
}

document.addEventListener('DOMContentLoaded', inicializar);