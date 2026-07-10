<?php

declare(strict_types=1);

/*
 * Endpoint: GET /api/pecas
 *
 * Retorna o catálogo de peças da Flowgate com busca, filtros e paginação.
 * Requer autenticação via X-Flowgate-Key.
 *
 * Query params:
 *   q          string   Termo de busca (nome, SKU, descrição) — opcional
 *   categoria  string   Slug da categoria (ex: "filtros") — opcional
 *   fornecedora int     ID da fornecedora — opcional
 *   pagina     int      Página (default: 1)
 *   por_pagina int      Itens por página (default: 20, máx: 50)
 *
 * Respostas:
 *   200  { pecas: [...], total: int, pagina: int, por_pagina: int, paginas: int }
 *   400  { erro: "..." }
 *   401  { erro: "..." }
 *   405  { erro: "..." }
 *   500  { erro: "..." }
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../libs/ApiAuth.php';

json_headers();
somente_get();
ApiAuth::exigir();

// ── Validação e sanitização dos parâmetros ────────────────────────────────

$termo = mb_substr(trim(strip_tags($_GET['q'] ?? '')), 0, 100, 'UTF-8');

$id_fornecedora = filter_var($_GET['fornecedora'] ?? '', FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);

$pagina = max(1, (int) filter_var($_GET['pagina'] ?? 1, FILTER_VALIDATE_INT));

$por_pagina = min(50, max(1, (int) filter_var($_GET['por_pagina'] ?? 20, FILTER_VALIDATE_INT)));

// categoria: validada via whitelist no banco (SELECT da tabela categorias)
$slug_categoria = strtolower(trim($_GET['categoria'] ?? ''));

// ── Monta WHERE dinamicamente ─────────────────────────────────────────────

$where  = ['p.ativo = 1'];
$params = [];

if ($termo !== '') {
    $like = '%' . $termo . '%';

    $where[] = '(
        p.nome LIKE :like_nome
        OR p.codigo_sku LIKE :like_sku
        OR p.descricao LIKE :like_descricao
    )';

    $params[':like_nome'] = $like;
    $params[':like_sku'] = $like;
    $params[':like_descricao'] = $like;
}

if ($slug_categoria !== '') {
    $where[] = 'c.slug = :slug';
    $params[':slug'] = $slug_categoria;
}

if ($id_fornecedora !== false) {
    $where[] = 'p.id_fornecedora = :fornecedora';
    $params[':fornecedora'] = $id_fornecedora;
}

$where_sql = 'WHERE ' . implode(' AND ', $where);
$offset    = ($pagina - 1) * $por_pagina;

// ── Executa ───────────────────────────────────────────────────────────────

try {
    $db = Database::get_instance();

    $total = (int) ($db->query_one(
        "SELECT COUNT(*) AS total
           FROM pecas p
           JOIN categorias c ON c.id_categoria = p.id_categoria
           JOIN fornecedoras f ON f.id_fornecedora = p.id_fornecedora
         {$where_sql}",
        $params
    )['total'] ?? 0);

    $params[':limite'] = $por_pagina;
    $params[':offset'] = $offset;

    $linhas = $db->query(
        "SELECT
             p.id_peca,
             p.nome,
             p.codigo_sku,
             p.descricao,
             p.preco,
             p.estoque,
             p.unidade,
             c.slug        AS categoria_slug,
             c.nome        AS categoria_nome,
             f.id_fornecedora,
             f.nome        AS fornecedora
           FROM pecas p
           JOIN categorias c ON c.id_categoria = p.id_categoria
           JOIN fornecedoras f ON f.id_fornecedora = p.id_fornecedora
         {$where_sql}
          ORDER BY p.nome ASC
          LIMIT :limite OFFSET :offset",
        $params
    );

    $pecas = array_map(fn(array $r): array => [
        'id'          => (int)   $r['id_peca'],
        'nome'        =>         $r['nome'],
        'sku'         =>         $r['codigo_sku'],
        'descricao'   =>         $r['descricao'],
        'preco'       => (float) $r['preco'],
        'estoque'     => (int)   $r['estoque'],
        'unidade'     =>         $r['unidade'],
        'categoria'   => ['slug' => $r['categoria_slug'], 'nome' => $r['categoria_nome']],
        'fornecedora' => ['id' => (int) $r['id_fornecedora'], 'nome' => $r['fornecedora']],
    ], $linhas);

    responder(200, [
        'pecas'     => $pecas,
        'total'     => $total,
        'pagina'    => $pagina,
        'por_pagina' => $por_pagina,
        'paginas'   => (int) ceil($total / $por_pagina),
    ]);

} catch (DatabaseException $e) {
    error_log('[Flowgate /api/pecas] DB: ' . $e->getMessage());
    responder(500, ['erro' => 'Erro interno. Tente novamente.']);
} catch (\Throwable $e) {
    responder(500, [
        'erro' => $e->getMessage(),
        'arquivo' => $e->getFile(),
        'linha' => $e->getLine()
    ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function json_headers(): void
{
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
}

function somente_get(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        header('Allow: GET');
        echo json_encode(['erro' => 'Método não permitido.']);
        exit;
    }
}

function responder(int $codigo, array $payload): never
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
