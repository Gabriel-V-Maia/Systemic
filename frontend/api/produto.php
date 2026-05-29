<?php

declare(strict_types=1);

/*
 * Endpoint: GET /api/produto/:id
 *
 * Responde com JSON contendo os dados do produto e seus relacionados.
 * Chamado pelo produto.js no frontend.
 *
 * Respostas:
 *   200  { produto: {...}, relacionados: [...] }
 *   400  { erro: "ID inválido" }
 *   401  { erro: "Não autenticado" }
 *   404  { erro: "Produto não encontrado" }
 *   500  { erro: "Erro interno" }
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../auth_controller.php';
require_once __DIR__ . '/../ProdutoController.php';

header('Content-Type: application/json; charset=UTF-8');

function responder_json(int $codigo, array $payload): never
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

AuthController::exigir_autenticacao();

$id_raw    = $_GET['id'] ?? '';
$id_produto = filter_var($id_raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

if ($id_produto === false) {
    responder_json(400, ['erro' => 'ID inválido. Forneça um inteiro positivo.']);
}


try {
    $controller = new ProdutoController();
    $produto     = $controller->buscar_por_id($id_produto);
    $relacionados = $controller->buscar_relacionados($produto['categoria'], $id_produto);

    responder_json(200, [
        'produto'     => $produto,
        'relacionados' => $relacionados,
    ]);

} catch (ProdutoNotFoundException $e) {
    responder_json(404, ['erro' => $e->getMessage()]);

} catch (DatabaseException $e) {
    error_log('[API produto] DatabaseException: ' . $e->getMessage());
    responder_json(500, ['erro' => 'Erro interno. Tente novamente mais tarde.']);

} catch (Throwable $e) {
    error_log('[API produto] Throwable: ' . $e->getMessage());
    responder_json(500, ['erro' => 'Erro interno inesperado.']);
}