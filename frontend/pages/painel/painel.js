/* ═══════════════════════════════════════════════
   PAINEL DO CLIENTE
   Gerencia veículos próprios e lista agendamentos.
═══════════════════════════════════════════════ */

let editandoVeiculoId = null;
let excluindoVeiculoId = null;

const STATUS_LABELS = {
    pendente:   { texto: 'Pendente',   classe: '' },
    confirmado: { texto: 'Confirmado', classe: 'confirmado' },
    concluido:  { texto: 'Concluído',  classe: 'concluido' },
};

document.addEventListener('DOMContentLoaded', function () {
    inject_csrf_logout();
    init_boas_vindas();
    carregar_veiculos();
    carregar_agendamentos();

    document.getElementById('btnNovoVeiculo').addEventListener('click', abrir_modal_novo_veiculo);
    document.getElementById('btnSalvarVeiculo').addEventListener('click', salvar_veiculo);
    document.getElementById('btnConfirmarExcluir').addEventListener('click', confirmar_exclusao_veiculo);

    document.getElementById('veiculoPlaca').addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });
});

function inject_csrf_logout() {
    const token = window.__session_user?.csrf_token ?? '';
    const input = document.getElementById('csrfLogout');
    if (input) input.value = token;
}

function init_boas_vindas() {
    const nome = window.__session_user?.nome ?? '';
    const el = document.getElementById('boasVindas');
    if (el && nome) {
        el.textContent = `Bem-vindo(a) de volta, ${nome.split(' ')[0]}.`;
    }
}

function csrf_headers() {
    return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': window.__session_user?.csrf_token ?? '',
    };
}

function escape_html(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

/* ═══════════════════════════════════════════════
   VEÍCULOS
═══════════════════════════════════════════════ */

async function carregar_veiculos() {
    const container = document.getElementById('listaVeiculos');

    try {
        const resposta = await fetch('/api/veiculos', { credentials: 'same-origin' });
        if (!resposta.ok) throw new Error('Falha ao carregar veículos.');

        const veiculos = await resposta.json();
        renderizar_veiculos(veiculos);
    } catch (erro) {
        container.innerHTML = `<p class="estado-vazio text-danger">Não foi possível carregar seus veículos.</p>`;
    }
}

function renderizar_veiculos(veiculos) {
    const container = document.getElementById('listaVeiculos');

    if (!veiculos.length) {
        container.innerHTML = `<p class="estado-vazio">Você ainda não cadastrou nenhum veículo.</p>`;
        return;
    }

    container.innerHTML = veiculos.map(function (v) {
        return `
            <div class="veiculo-item" data-id="${v.id_veiculo}">
                <div class="veiculo-info">
                    <strong>${escape_html(v.marca)} ${escape_html(v.modelo)}</strong>
                    <div>${escape_html(v.cor)} · ${escape_html(v.ano)}</div>
                    <span class="placa">${escape_html(v.placa)}</span>
                </div>
                <div class="veiculo-acoes">
                    <button type="button" class="editar" title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button type="button" class="excluir" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.veiculo-item').forEach(function (item) {
        const id = item.dataset.id;
        item.querySelector('.editar').addEventListener('click', function () {
            abrir_modal_editar_veiculo(id, veiculos.find(v => String(v.id_veiculo) === id));
        });
        item.querySelector('.excluir').addEventListener('click', function () {
            excluindoVeiculoId = id;
            new bootstrap.Modal(document.getElementById('modalExcluir')).show();
        });
    });
}

function abrir_modal_novo_veiculo() {
    editandoVeiculoId = null;
    document.getElementById('modalVeiculoTitulo').textContent = 'Adicionar veículo';
    limpar_form_veiculo();
    esconder_erro_veiculo();
    new bootstrap.Modal(document.getElementById('modalVeiculo')).show();
}

function abrir_modal_editar_veiculo(id, veiculo) {
    editandoVeiculoId = id;
    document.getElementById('modalVeiculoTitulo').textContent = 'Editar veículo';
    esconder_erro_veiculo();

    document.getElementById('veiculoId').value     = id;
    document.getElementById('veiculoMarca').value  = veiculo?.marca  ?? '';
    document.getElementById('veiculoModelo').value = veiculo?.modelo ?? '';
    document.getElementById('veiculoAno').value    = veiculo?.ano    ?? '';
    document.getElementById('veiculoCor').value    = veiculo?.cor    ?? '';
    document.getElementById('veiculoPlaca').value  = veiculo?.placa  ?? '';

    new bootstrap.Modal(document.getElementById('modalVeiculo')).show();
}

function limpar_form_veiculo() {
    ['veiculoId', 'veiculoMarca', 'veiculoModelo', 'veiculoAno', 'veiculoCor', 'veiculoPlaca']
        .forEach(id => document.getElementById(id).value = '');
}

function mostrar_erro_veiculo(mensagem) {
    const erro = document.getElementById('erroVeiculo');
    erro.textContent = mensagem;
    erro.classList.remove('d-none');
}

function esconder_erro_veiculo() {
    document.getElementById('erroVeiculo').classList.add('d-none');
}

async function salvar_veiculo() {
    const payload = {
        marca:  document.getElementById('veiculoMarca').value.trim(),
        modelo: document.getElementById('veiculoModelo').value.trim(),
        ano:    document.getElementById('veiculoAno').value.trim(),
        cor:    document.getElementById('veiculoCor').value.trim(),
        placa:  document.getElementById('veiculoPlaca').value.trim(),
    };

    const url    = editandoVeiculoId ? `/api/veiculos/${editandoVeiculoId}` : '/api/veiculos';
    const metodo = editandoVeiculoId ? 'PATCH' : 'POST';

    const btn = document.getElementById('btnSalvarVeiculo');
    btn.disabled = true;

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: csrf_headers(),
            credentials: 'same-origin',
            body: JSON.stringify(payload),
        });

        const json = await resposta.json();

        if (!resposta.ok) {
            mostrar_erro_veiculo(json.erro || 'Não foi possível salvar o veículo.');
            return;
        }

        bootstrap.Modal.getInstance(document.getElementById('modalVeiculo')).hide();
        carregar_veiculos();
    } catch (erro) {
        mostrar_erro_veiculo('Falha na conexão. Tente novamente.');
    } finally {
        btn.disabled = false;
    }
}

async function confirmar_exclusao_veiculo() {
    if (!excluindoVeiculoId) return;

    const btn = document.getElementById('btnConfirmarExcluir');
    btn.disabled = true;

    try {
        const resposta = await fetch(`/api/veiculos/${excluindoVeiculoId}`, {
            method: 'DELETE',
            headers: csrf_headers(),
            credentials: 'same-origin',
        });

        if (!resposta.ok) throw new Error('Falha ao remover.');

        bootstrap.Modal.getInstance(document.getElementById('modalExcluir')).hide();
        excluindoVeiculoId = null;
        carregar_veiculos();
    } catch (erro) {
        alert('Não foi possível remover o veículo. Tente novamente.');
    } finally {
        btn.disabled = false;
    }
}

/* ═══════════════════════════════════════════════
   AGENDAMENTOS
═══════════════════════════════════════════════ */

async function carregar_agendamentos() {
    const container = document.getElementById('listaAgendamentos');

    try {
        const resposta = await fetch('/api/agendamentos', { credentials: 'same-origin' });
        if (!resposta.ok) throw new Error('Falha ao carregar agendamentos.');

        const agendamentos = await resposta.json();
        renderizar_agendamentos(agendamentos);
    } catch (erro) {
        container.innerHTML = `<p class="estado-vazio text-danger">Não foi possível carregar seus agendamentos.</p>`;
    }
}

function renderizar_agendamentos(agendamentos) {
    const container = document.getElementById('listaAgendamentos');

    if (!agendamentos.length) {
        container.innerHTML = `<p class="estado-vazio">Você ainda não tem agendamentos.</p>`;
        return;
    }

    container.innerHTML = agendamentos.map(function (a) {
        const status = STATUS_LABELS[a.status] ?? { texto: a.status, classe: '' };
        const data = formatar_data(a.data_preferida);

        return `
            <div class="agendamento-item">
                <div class="d-flex justify-content-between align-items-start">
                    <span class="servico">${escape_html(a.servico)}</span>
                    <span class="status-badge ${status.classe}">${escape_html(status.texto)}</span>
                </div>
                <div class="meta">
                    ${escape_html(a.marca)} ${escape_html(a.modelo)}${a.placa ? ' · ' + escape_html(a.placa) : ''}
                </div>
                <div class="meta">
                    ${data}${a.turno ? ' · ' + (a.turno === 'manha' ? 'Manhã' : 'Tarde') : ''}
                </div>
            </div>
        `;
    }).join('');
}

function formatar_data(data_iso) {
    if (!data_iso) return '';
    const [ano, mes, dia] = data_iso.split('-');
    return `${dia}/${mes}/${ano}`;
}