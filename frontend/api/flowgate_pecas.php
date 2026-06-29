<?php

declare(strict_types=1);

use Automax\Auth\AccessControl;

/*
 * Endpoint: GET /api/flowgate/pecas?q=:termo&por_pagina=:n
 *
 * Proxy server-side para a Flowgate (GET /api/pecas). O modal de OS
 * chama essa rota para autocompletar peças do catálogo. A chave de
 * API da Flowgate nunca chega ao browser — fica só aqui no servidor.
 *
 * Respostas:
 *   200  { pecas: [...], total: int, pagina: int, por_pagina: int, paginas: int }
 *   401  { erro: "..." }
 *   405  { erro: "..." }
 *   502  { erro: "..." }  — Flowgate fora do ar ou recusou a chave
 */

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

AccessControl::exigir_permissao('ordem_servico.visualizar');

$termo      = mb_substr(trim($_GET['q'] ?? ''), 0, 100, 'UTF-8');
$por_pagina = min(20, max(1, (int) filter_var($_GET['por_pagina'] ?? 8, FILTER_VALIDATE_INT)));

if ($termo === '') {
    echo json_encode(['pecas' => [], 'total' => 0, 'pagina' => 1, 'por_pagina' => $por_pagina, 'paginas' => 0]);
    exit;
}

$resposta_flowgate = consultar_catalogo_flowgate($termo, $por_pagina);

http_response_code($resposta_flowgate['status']);
echo $resposta_flowgate['corpo'];

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Chama a Flowgate com a chave de API no header e devolve status + corpo
 * já prontos para repassar ao browser. Qualquer falha de rede ou timeout
 * vira um 502, nunca um erro fatal que derrubaria a página.
 */
function consultar_catalogo_flowgate(string $termo, int $por_pagina): array
{
    $url_base = rtrim(getenv('FLOWGATE_URL') ?: 'http://localhost:8081', '/');
    $chave    = getenv('FLOWGATE_KEY') ?: 'automax-dev-key-2026';

    $query_string = http_build_query([
        'q'          => $termo,
        'por_pagina' => $por_pagina,
    ]);

    $contexto = stream_context_create([
        'http' => [
            'method'        => 'GET',
            'header'        => "X-Flowgate-Key: {$chave}\r\n",
            'timeout'       => 5,
            'ignore_errors' => true,
        ],
    ]);

    $corpo = @file_get_contents("{$url_base}/api/pecas?{$query_string}", false, $contexto);

    if ($corpo === false) {
        error_log('[Proxy flowgate/pecas] Falha de conexão com a Flowgate.');
        return [
            'status' => 502,
            'corpo'  => json_encode(['erro' => 'Catálogo da Flowgate indisponível no momento.']),
        ];
    }

    $status_flowgate = extrair_status_http($http_response_header ?? []);

    return ['status' => $status_flowgate, 'corpo' => $corpo];
}

/**
 * Lê o código de status HTTP da primeira linha de $http_response_header
 * (populada automaticamente pelo PHP após file_get_contents sobre HTTP).
 */
function extrair_status_http(array $headers): int
{
    if (isset($headers[0]) && preg_match('/HTTP\/\S+\s+(\d{3})/', $headers[0], $m)) {
        return (int) $m[1];
    }

    return 502;
}