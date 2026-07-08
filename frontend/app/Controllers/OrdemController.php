<?php

declare(strict_types=1);

namespace Automax\Controllers;

use Automax\Config\Database;
use Automax\Config\DatabaseException;
use Automax\Auth\AccessControl;
use Automax\Support\Validador;
use Automax\Support\ErroValidacao;

class OrdemController
{
    private const TIPOS_ORDEM_VALIDOS = ['revisao', 'pecas', 'emergencia', 'vip'];

    // ─── Helpers ─────────────────────────────────────────────

    private static function json(int $status, mixed $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    private static function ler_body(): ?array
    {
        $raw = file_get_contents('php://input');
        if (empty($raw)) return null;
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    private static function validar_csrf(): void
    {
        $token_header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $token_sessao = $_SESSION['csrf_token']       ?? '';
        if (!$token_sessao || !hash_equals($token_sessao, $token_header)) {
            self::json(403, ['erro' => 'Token inválido.']);
            exit;
        }
    }

    private static function validar_id(mixed $raw): int|false
    {
        return filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    }

    // Retorna array de peças [{nome, qtd, valor}] de uma OS
    private static function buscar_pecas(Database $db, int $id_ordem): array
    {
        return $db->query_all(
            'SELECT nome_peca AS nome, quantidade_trocas AS qtd, valor_unitario AS valor
               FROM ordem_pecas
              WHERE id_ordem = :id
              ORDER BY id_ordem_peca ASC',
            [':id' => $id_ordem]
        );
    }

    // Substitui todas as peças de uma OS (chamar dentro de transaction)
    private static function salvar_pecas(Database $db, int $id_ordem, array $pecas): void
    {
        $db->execute('DELETE FROM ordem_pecas WHERE id_ordem = :id', [':id' => $id_ordem]);

        foreach ($pecas as $p) {
            $nome  = trim((string)($p['nome']  ?? ''));
            $qtd   = max(1, (int)($p['qtd']    ?? 1));
            $valor = max(0.0, (float)($p['valor'] ?? 0));

            if ($nome === '') continue;

            $db->execute(
                'INSERT INTO ordem_pecas (id_ordem, nome_peca, quantidade_trocas, valor_unitario)
                 VALUES (:id_ordem, :nome, :qtd, :valor)',
                [
                    ':id_ordem' => $id_ordem,
                    ':nome'     => $nome,
                    ':qtd'      => $qtd,
                    ':valor'    => $valor,
                ]
            );
        }
    }

    /**
     * Valida e normaliza os campos comuns a criar() e atualizar().
     * Lança ErroValidacao com mensagem pronta para o cliente quando
     * algum campo estiver fora dos limites (tamanho, faixa ou whitelist).
     *
     * @return array{id_funcionario:?int, id_cliente:int, id_veiculo:int,
     *               tipo_ordem:string, diagnostico:?string, abertura:string,
     *               prazo:string, mao_de_obra:?float, orcamento:?float}
     */
    private static function validar_dados_ordem(array $body): array
    {
        return [
            'id_funcionario' => Validador::inteiro($body['id_funcionario'] ?? null, 'Funcionário', 1, PHP_INT_MAX, false),
            'id_cliente'     => Validador::inteiro($body['id_cliente']     ?? null, 'Cliente', 1),
            'id_veiculo'     => Validador::inteiro($body['id_veiculo']     ?? null, 'Veículo', 1),
            'tipo_ordem'     => Validador::whitelist($body['tipo_ordem']   ?? null, 'Tipo de ordem', self::TIPOS_ORDEM_VALIDOS),
            'diagnostico'    => Validador::texto($body['diagnostico']      ?? null, 'Diagnóstico', 1, 2000, false),
            'abertura'       => Validador::texto($body['abertura']         ?? null, 'Data de abertura', 1, 10),
            'prazo'          => Validador::texto($body['prazo']            ?? null, 'Prazo', 1, 10),
            'mao_de_obra'    => Validador::decimal($body['mao_de_obra']    ?? null, 'Mão de obra', 0, 99_999_999.99, false),
            'orcamento'      => Validador::decimal($body['orcamento']      ?? null, 'Orçamento', 0, 99_999_999.99, false),
        ];
    }

    private static function id_funcionario_sessao(): ?int
    {
        $id = $_SESSION['funcionario_id'] ?? null;
        return $id !== null ? (int)$id : null;
    }

    private static function registrar_log(Database $db, ?int $id_funcionario, string $detalhe): void
    {
        try {
            $db->execute(
                'INSERT INTO logs (id_funcionario, detalhe) VALUES (:id_funcionario, :detalhe)',
                [':id_funcionario' => $id_funcionario, ':detalhe' => $detalhe]
            );
        } catch (\Throwable $e) {
            error_log('[OrdemController] registrar_log: ' . $e->getMessage());
        }
    }

    // ─── GET /api/ordens ─────────────────────────────────────

    public static function listar(): void
    {
        AccessControl::exigir_permissao('ordem_servico.visualizar');

        try {
            $db = Database::get_instance();

            $ordens = $db->query_all(
                "SELECT o.id_ordem,
                        o.id_funcionario,
                        o.id_cliente,
                        o.id_veiculo,
                        o.tipo_ordem,
                        o.diagnostico,
                        DATE_FORMAT(o.abertura,   '%Y-%m-%d') AS abertura,
                        DATE_FORMAT(o.prazo,      '%Y-%m-%d') AS prazo,
                        DATE_FORMAT(o.fechamento, '%Y-%m-%d') AS fechamento,
                        o.conclusao_ordem,
                        o.mao_de_obra,
                        o.orcamento,
                        o.status
                   FROM ordem o
                  ORDER BY o.id_ordem DESC"
            );

            foreach ($ordens as &$os) {
                $os['id_ordem']       = (int)$os['id_ordem'];
                $os['id_funcionario'] = $os['id_funcionario'] !== null ? (string)$os['id_funcionario'] : null;
                $os['id_cliente']     = (string)$os['id_cliente'];
                $os['id_veiculo']     = (int)$os['id_veiculo'];
                $os['mao_de_obra']    = $os['mao_de_obra'] !== null ? (float)$os['mao_de_obra'] : 0.0;
                $os['orcamento']      = $os['orcamento']   !== null ? (float)$os['orcamento']   : 0.0;
                $os['pecas']          = self::buscar_pecas($db, $os['id_ordem']);
            }
            unset($os);

            self::json(200, ['ok' => true, 'ordens' => $ordens]);

        } catch (DatabaseException $e) {
            error_log('[OrdemController] listar: ' . $e->getMessage());
            self::json(503, ['erro' => 'Serviço indisponível.']);
        }
    }

    // ─── POST /api/ordens ────────────────────────────────────

    public static function criar(): void
    {
        AccessControl::exigir_permissao('ordem_servico.criar');
        self::validar_csrf();

        $body = self::ler_body();
        if ($body === null) { self::json(400, ['erro' => 'Corpo inválido.']); return; }

        try {
            $dados = self::validar_dados_ordem($body);
        } catch (ErroValidacao $e) {
            self::json(422, ['erro' => $e->getMessage()]); return;
        }

        $db = null;
        try {
            $db = Database::get_instance();
            $db->begin_transaction();

            $id_ordem = $db->insert(
                "INSERT INTO ordem
                    (id_funcionario, id_cliente, id_veiculo, tipo_ordem,
                     diagnostico, abertura, prazo, fechamento, conclusao_ordem,
                     mao_de_obra, orcamento, status)
                 VALUES
                    (:id_funcionario, :id_cliente, :id_veiculo, :tipo_ordem,
                     :diagnostico, :abertura, :prazo, NULL, NULL,
                     :mao_de_obra, :orcamento, 'aberta')",
                [
                    ':id_funcionario' => $dados['id_funcionario'],
                    ':id_cliente'     => $dados['id_cliente'],
                    ':id_veiculo'     => $dados['id_veiculo'],
                    ':tipo_ordem'     => $dados['tipo_ordem'],
                    ':diagnostico'    => $dados['diagnostico'],
                    ':abertura'       => $dados['abertura'],
                    ':prazo'          => $dados['prazo'],
                    ':mao_de_obra'    => $dados['mao_de_obra'],
                    ':orcamento'      => $dados['orcamento'],
                ]
            );

            if (!empty($body['pecas']) && is_array($body['pecas'])) {
                self::salvar_pecas($db, $id_ordem, $body['pecas']);
            }

            $id_func = self::id_funcionario_sessao();
            self::registrar_log($db, $id_func, "OS #{$id_ordem} criada — tipo: {$dados['tipo_ordem']} | cliente: {$dados['id_cliente']}");

            $db->commit();
            self::json(201, ['ok' => true, 'id_ordem' => $id_ordem]);

        } catch (DatabaseException $e) {
            $db?->rollback();
            error_log('[OrdemController] criar: ' . $e->getMessage());
            self::json(503, ['erro' => 'Serviço indisponível.']);
        }
    }

    // ─── PATCH /api/ordens/:id ───────────────────────────────

    public static function atualizar(array $params): void
    {
        AccessControl::exigir_permissao('ordem_servico.editar');
        self::validar_csrf();

        $id_ordem = self::validar_id($params['id'] ?? '');
        if ($id_ordem === false) { self::json(400, ['erro' => 'ID inválido.']); return; }

        $body = self::ler_body();
        if ($body === null) { self::json(400, ['erro' => 'Corpo inválido.']); return; }

        try {
            $dados           = self::validar_dados_ordem($body);
            $fechamento      = Validador::texto($body['fechamento']      ?? null, 'Fechamento', 1, 10, false);
            $conclusao_ordem = Validador::texto($body['conclusao_ordem'] ?? null, 'Conclusão', 1, 2000, false);
        } catch (ErroValidacao $e) {
            self::json(422, ['erro' => $e->getMessage()]); return;
        }

        $db = null;
        try {
            $db = Database::get_instance();
            $db->begin_transaction();

            $afetados = $db->execute(
                'UPDATE ordem SET
                    id_funcionario  = :id_funcionario,
                    id_cliente      = :id_cliente,
                    id_veiculo      = :id_veiculo,
                    tipo_ordem      = :tipo_ordem,
                    diagnostico     = :diagnostico,
                    abertura        = :abertura,
                    prazo           = :prazo,
                    fechamento      = :fechamento,
                    conclusao_ordem = :conclusao_ordem,
                    mao_de_obra     = :mao_de_obra,
                    orcamento       = :orcamento
                  WHERE id_ordem = :id_ordem',
                [
                    ':id_funcionario'  => $dados['id_funcionario'],
                    ':id_cliente'      => $dados['id_cliente'],
                    ':id_veiculo'      => $dados['id_veiculo'],
                    ':tipo_ordem'      => $dados['tipo_ordem'],
                    ':diagnostico'     => $dados['diagnostico'],
                    ':abertura'        => $dados['abertura'],
                    ':prazo'           => $dados['prazo'],
                    ':fechamento'      => $fechamento,
                    ':conclusao_ordem' => $conclusao_ordem,
                    ':mao_de_obra'     => $dados['mao_de_obra'],
                    ':orcamento'       => $dados['orcamento'],
                    ':id_ordem'        => $id_ordem,
                ]
            );

            if ($afetados === 0) {
                $db->rollback();
                self::json(404, ['erro' => 'OS não encontrada.']); return;
            }

            self::salvar_pecas($db, $id_ordem, $body['pecas'] ?? []);

            Logger::registrar(
                "OS #{$id_ordem} atualizada — tipo: {$tipo_ordem} | cliente: {$id_cliente}",
                Logger::funcionario_atual()
            );

            $db->commit();
            self::json(200, ['ok' => true]);

        } catch (DatabaseException $e) {
            $db?->rollback();
            error_log('[OrdemController] atualizar: ' . $e->getMessage());
            self::json(503, ['erro' => 'Serviço indisponível.']);
        }
    }

    // ─── PATCH /api/ordens/:id/fechar ───────────────────────

    public static function fechar(array $params): void
    {
        AccessControl::exigir_permissao('ordem_servico.fechar');
        self::validar_csrf();

        $id_ordem = self::validar_id($params['id'] ?? '');
        if ($id_ordem === false) { self::json(400, ['erro' => 'ID inválido.']); return; }

        $body = self::ler_body();
        if ($body === null) { self::json(400, ['erro' => 'Corpo inválido.']); return; }

        try {
            $fechamento      = Validador::texto($body['fechamento']      ?? null, 'Fechamento', 1, 10, false) ?? date('Y-m-d');
            $conclusao_ordem = Validador::texto($body['conclusao_ordem'] ?? null, 'Conclusão', 1, 2000, false);
            $mao_de_obra     = Validador::decimal($body['mao_de_obra']   ?? 0, 'Mão de obra', 0, 99_999_999.99);
            $orcamento       = Validador::decimal($body['orcamento']     ?? 0, 'Orçamento', 0, 99_999_999.99);
        } catch (ErroValidacao $e) {
            self::json(422, ['erro' => $e->getMessage()]); return;
        }

        $db = null;
        try {
            $db = Database::get_instance();
            $db->begin_transaction();

            $afetados = $db->execute(
                "UPDATE ordem SET
                    status          = 'concluida',
                    fechamento      = :fechamento,
                    conclusao_ordem = :conclusao_ordem,
                    mao_de_obra     = :mao_de_obra,
                    orcamento       = :orcamento
                  WHERE id_ordem = :id_ordem
                    AND status NOT IN ('concluida', 'cancelada')",
                [
                    ':fechamento'      => $fechamento,
                    ':conclusao_ordem' => $conclusao_ordem,
                    ':mao_de_obra'     => $mao_de_obra,
                    ':orcamento'       => $orcamento,
                    ':id_ordem'        => $id_ordem,
                ]
            );

            if ($afetados === 0) {
                $db->rollback();
                self::json(404, ['erro' => 'OS não encontrada ou já finalizada.']); return;
            }

            if (!empty($body['pecas']) && is_array($body['pecas'])) {
                self::salvar_pecas($db, $id_ordem, $body['pecas']);
            }

            $id_func = Logger::funcionario_atual();
            Logger::registrar("OS #{$id_ordem} concluída — fechamento: {$fechamento}", $id_func);

            $db->commit();
            self::json(200, ['ok' => true]);

        } catch (DatabaseException $e) {
            $db?->rollback();
            error_log('[OrdemController] fechar: ' . $e->getMessage());
            self::json(503, ['erro' => 'Serviço indisponível.']);
        }
    }

    // ─── DELETE /api/ordens/:id ──────────────────────────────

    public static function deletar(array $params): void
    {
        AccessControl::exigir_permissao('ordem_servico.excluir');
        self::validar_csrf();

        $id_ordem = self::validar_id($params['id'] ?? '');
        if ($id_ordem === false) { self::json(400, ['erro' => 'ID inválido.']); return; }

        try {
            $db = Database::get_instance();

            $afetados = $db->execute(
                'DELETE FROM ordem WHERE id_ordem = :id',
                [':id' => $id_ordem]
            );

            if ($afetados === 0) {
                self::json(404, ['erro' => 'OS não encontrada.']); return;
            }

            $id_func = Logger::funcionario_atual();
            Logger::registrar("OS #{$id_ordem} removida.", $id_func);

            self::json(200, ['ok' => true]);

        } catch (DatabaseException $e) {
            error_log('[OrdemController] deletar: ' . $e->getMessage());
            self::json(503, ['erro' => 'Serviço indisponível.']);
        }
    }
}