<?php

declare(strict_types=1);

/*
 * Endpoint: GET /api/disponibilidade?skus=SKU1,SKU2,...
 *
 * Consulta o estoque de uma lista de SKUs em uma única chamada.
 * Projetado para que a Automax verifique disponibilidade antes
 * de abrir uma Ordem de Serviço — sem precisar iterar peça por peça.
 *
 * Query params:
 *   skus       string   SKUs separados por vírgula (máx. 20)
 *   fornecedora int     Filtra por fornecedora — opcional
 *
 * Requer autenticação via X-Flowgate-Key.
 *
 * Respostas:
 *   200  { disponibilidade: [ { sku, nome, estoque, disponivel, preco }, ... ] }
 *   400  { erro: "..." }
 *   401  { erro: "..." }
 *   405  { erro: "..." }
 *   500  { erro: "..." }
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../libs/ApiAuth.php';

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['erro' => 'Método não permitido.']);
    exit;
}

ApiAuth::exigir();

// ── Valida parâmetros ─────────────────────────────────────────────────────

$skus_raw = trim($_GET['skus'] ?? '');

if ($skus_raw === '') {
    http_response_code(400);
    echo json_encode(['erro' => 'Parâmetro "skus" é obrigatório.']);
    exit;
}

/*
 * Sanitiza cada SKU: permite apenas alfanuméricos e hífens,
 * que são os únicos caracteres usados nos códigos das fornecedoras.
 */
$skus_input = array_slice(explode(',', $skus_raw), 0, 20);
$skus = array_values(array_filter(
    array_map(fn(string $s) => preg_replace('/[^A-Za-z0-9\-]/', '', trim($s)), $skus_input),
    fn(string $s) => $s !== ''
));

if (empty($skus)) {
    http_response_code(400);
    echo json_encode(['erro' => 'Nenhum SKU válido informado.']);
    exit;
}

$id_fornecedora = filter_var($_GET['fornecedora'] ?? '', FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1],
]);

// ── Monta query com placeholders seguros ──────────────────────────────────

/*
 * Para usar o IN com prepared statements precisamos criar um placeholder
 * para cada SKU da lista. Ex: :sku0, :sku1, :sku2, …
 */
$placeholders = implode(', ', array_map(fn($i) => ":sku{$i}", array_keys($skus)));
$params = [];
foreach ($skus as $i => $sku) {
    $params[":sku{$i}"] = $sku;
}

$extra_where = '';
if ($id_fornecedora !== false) {
    $extra_where = ' AND p.id_fornecedora = :fornecedora';
    $params[':fornecedora'] = $id_fornecedora;
}

// ── Executa ───────────────────────────────────────────────────────────────

try {
    $db   = Database::get_instance();
    $rows = $db->query(
        "SELECT p.codigo_sku, p.nome, p.estoque, p.preco
           FROM pecas p
          WHERE p.codigo_sku IN ({$placeholders})
            AND p.ativo = 1
            {$extra_where}
          ORDER BY p.nome ASC",
        $params
    );

    // Indexa resultado por SKU para preencher os não-encontrados com disponivel=false
    $encontrados = [];
    foreach ($rows as $r) {
        $encontrados[$r['codigo_sku']] = $r;
    }

    $disponibilidade = array_map(function (string $sku) use ($encontrados): array {
        if (!isset($encontrados[$sku])) {
            return ['sku' => $sku, 'nome' => null, 'estoque' => 0, 'disponivel' => false, 'preco' => null];
        }
        $r = $encontrados[$sku];
        return [
            'sku'        => $sku,
            'nome'       => $r['nome'],
            'estoque'    => (int)   $r['estoque'],
            'disponivel' => (int)   $r['estoque'] > 0,
            'preco'      => (float) $r['preco'],
        ];
    }, $skus);

    http_response_code(200);
    echo json_encode(['disponibilidade' => $disponibilidade], JSON_UNESCAPED_UNICODE);

} catch (DatabaseException $e) {
    error_log('[Flowgate /api/disponibilidade] DB: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['erro' => 'Erro interno. Tente novamente.']);
} catch (\Throwable $e) {
    error_log('[Flowgate /api/disponibilidade] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['erro' => 'Erro interno inesperado.']);
}
