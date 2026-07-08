<?php

declare(strict_types=1);

namespace Automax\Controllers;

use Automax\Config\Database;
use Automax\Config\DatabaseException;
use Automax\Auth\AccessControl;
use Automax\Support\Validador;
use Automax\Support\ErroValidacao;

class AgendamentoGerenciaController
{
    public const STATUS_VALIDOS = ['pendente', 'confirmado', 'em_atendimento', 'concluido', 'cancelado'];
    private const TURNOS_VALIDOS = ['manha', 'tarde'];
    private const POR_PAGINA     = 15;

    public static function criar(): void
    {
        AccessControl::exigir_permissao('agendamentos.gerenciar');
        self::validar_csrf();

        $body = self::ler_body();

        try {
            $dados = self::validar_e_normalizar_criacao($body);
        } catch (ErroValidacao $e) {
            self::json(422, ['ok' => false, 'erro' => $e->getMessage()]);
            return;
        }

        try {
            $db = Database::get_instance();

            $id = $db->insert(
                'INSERT INTO agendamentos
                    (nome, telefone, email, placa, marca, modelo, ano,
                     combustivel, km, servico, sintomas, descricao, data_preferida, turno, status)
                 VALUES
                    (:nome, :telefone, :email, :placa, :marca, :modelo, :ano,
                     :combustivel, :km, :servico, :sintomas, :descricao, :data_preferida, :turno, :status)',
                [
                    ':nome'           => $dados['nome'],
                    ':telefone'       => $dados['telefone'],
                    ':email'          => $dados['email'],
                    ':placa'          => $dados['placa'],
                    ':marca'          => $dados['marca'],
                    ':modelo'         => $dados['modelo'],
                    ':ano'            => $dados['ano'],
                    ':combustivel'    => $dados['combustivel'],
                    ':km'             => $dados['km'],
                    ':servico'        => $dados['servico'],
                    ':sintomas'       => $dados['sintomas'],
                    ':descricao'      => $dados['descricao'],
                    ':data_preferida' => $dados['data_preferida'],
                    ':turno'          => $dados['turno'],
                    ':status'         => $dados['status'],
                ]
            );

            self::json(201, ['ok' => true, 'id' => $id]);

        } catch (DatabaseException $e) {
            error_log('[AgendamentosController] criar: ' . $e->getMessage());
            self::json(503, ['ok' => false, 'erro' => 'Serviço indisponível.']);
        }
    }

    /**
     * Valida os campos do agendamento criado manualmente pela recepção/
     * gerência e devolve os valores já normalizados, prontos para o INSERT.
     */
    private static function validar_e_normalizar_criacao(array $body): array
    {
        $nome     = Validador::texto($body['nome']     ?? null, 'Nome', 3, 255);
        $telefone = Validador::texto($body['telefone'] ?? null, 'Telefone', 8, 30);
        $marca    = Validador::texto($body['marca']    ?? null, 'Marca do veículo', 2, 100);
        $modelo   = Validador::texto($body['modelo']   ?? null, 'Modelo do veículo', 2, 100);
        $servico  = Validador::texto($body['servico']  ?? null, 'Serviço', 1, 100);

        $email       = Validador::texto($body['email']       ?? null, 'E-mail', 5, 255, false);
        $placa       = Validador::texto($body['placa']       ?? null, 'Placa', 1, 8, false);
        $combustivel = Validador::texto($body['combustivel'] ?? null, 'Combustível', 1, 30, false);
        $sintomas    = Validador::texto($body['sintomas']    ?? null, 'Sintomas', 1, 255, false);
        $descricao   = Validador::texto($body['descricao']   ?? null, 'Descrição', 1, 1000, false);

        if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ErroValidacao('E-mail inválido.');
        }

        $ano = Validador::inteiro($body['ano'] ?? null, 'Ano do veículo', 1900, 2100, false);
        $km  = Validador::inteiro($body['km']  ?? null, 'Quilometragem', 0, 2_000_000, false);

        $data_preferida = trim((string) ($body['data_preferida'] ?? ''));
        $partes = \DateTime::createFromFormat('Y-m-d', $data_preferida);
        if (!$partes || $partes->format('Y-m-d') !== $data_preferida) {
            throw new ErroValidacao('Data preferida inválida.');
        }

        $turno  = Validador::whitelist($body['turno']  ?? '', 'Turno', [...self::TURNOS_VALIDOS, '']);
        $status = Validador::whitelist($body['status'] ?? 'confirmado', 'Status', self::STATUS_VALIDOS);

        return [
            'nome'           => $nome,
            'telefone'       => $telefone,
            'email'          => $email,
            'placa'          => $placa !== null ? strtoupper($placa) : null,
            'marca'          => $marca,
            'modelo'         => $modelo,
            'ano'            => $ano,
            'combustivel'    => $combustivel,
            'km'             => $km,
            'servico'        => $servico,
            'sintomas'       => $sintomas,
            'descricao'      => $descricao,
            'data_preferida' => $data_preferida,
            'turno'          => $turno !== '' ? $turno : null,
            'status'         => $status,
        ];
    }

    public static function listar(): void
    {
        AccessControl::exigir_permissao('agendamentos.visualizar');

        $pagina = self::validar_int_positivo($_GET['pagina'] ?? '1') ?: 1;
        $busca  = trim($_GET['busca']  ?? '');
        $status = trim($_GET['status'] ?? '');

        if ($status !== '' && !in_array($status, self::STATUS_VALIDOS, true)) {
            $status = '';
        }

        try {
            $db     = Database::get_instance();
            $offset = ($pagina - 1) * self::POR_PAGINA;

            [$where_sql, $params_base] = self::montar_filtros($busca, $status);

            $total = (int) ($db->query_one(
                "SELECT COUNT(*) AS total FROM agendamentos {$where_sql}",
                $params_base
            )['total'] ?? 0);

            $linhas = $db->query(
                "SELECT id, nome, telefone, email, placa, marca, modelo, ano,
                        servico, sintomas, descricao, data_preferida, turno,
                        status, criado_em
                   FROM agendamentos
                 {$where_sql}
                  ORDER BY FIELD(status, 'pendente', 'confirmado', 'em_atendimento', 'concluido', 'cancelado'),
                           data_preferida ASC, id DESC
                  LIMIT :limite OFFSET :offset",
                array_merge($params_base, [':limite' => self::POR_PAGINA, ':offset' => $offset])
            );

            self::json(200, [
                'ok'            => true,
                'agendamentos'  => $linhas,
                'total'         => $total,
                'pagina'        => $pagina,
                'total_paginas' => max(1, (int) ceil($total / self::POR_PAGINA)),
            ]);

        } catch (DatabaseException $e) {
            error_log('[AgendamentosController] listar: ' . $e->getMessage());
            self::json(503, ['ok' => false, 'erro' => 'Serviço indisponível.']);
        }
    }

    public static function atualizar_status(array $params): void
    {
        AccessControl::exigir_permissao('agendamentos.gerenciar');
        self::validar_csrf();

        $id = self::validar_id($params['id'] ?? '');
        if ($id === false) {
            self::json(400, ['ok' => false, 'erro' => 'ID inválido.']);
            return;
        }

        $body   = self::ler_body();
        $status = trim((string) ($body['status'] ?? ''));

        if (!in_array($status, self::STATUS_VALIDOS, true)) {
            self::json(422, ['ok' => false, 'erro' => 'Status inválido.']);
            return;
        }

        try {
            $db = Database::get_instance();

            $afetados = $db->execute(
                'UPDATE agendamentos SET status = :status WHERE id = :id',
                [':status' => $status, ':id' => $id]
            );

            if ($afetados === 0) {
                self::json(404, ['ok' => false, 'erro' => 'Agendamento não encontrado.']);
                return;
            }

            self::json(200, ['ok' => true, 'status' => $status]);

        } catch (DatabaseException $e) {
            error_log('[AgendamentosController] atualizar_status: ' . $e->getMessage());
            self::json(503, ['ok' => false, 'erro' => 'Serviço indisponível.']);
        }
    }

    public static function deletar(array $params): void
    {
        AccessControl::exigir_permissao('agendamentos.gerenciar');
        self::validar_csrf();

        $id = self::validar_id($params['id'] ?? '');
        if ($id === false) {
            self::json(400, ['ok' => false, 'erro' => 'ID inválido.']);
            return;
        }

        try {
            $db = Database::get_instance();

            $afetados = $db->execute('DELETE FROM agendamentos WHERE id = :id', [':id' => $id]);

            if ($afetados === 0) {
                self::json(404, ['ok' => false, 'erro' => 'Agendamento não encontrado.']);
                return;
            }

            self::json(200, ['ok' => true]);

        } catch (DatabaseException $e) {
            error_log('[AgendamentosController] deletar: ' . $e->getMessage());
            self::json(503, ['ok' => false, 'erro' => 'Serviço indisponível.']);
        }
    }

    private static function montar_filtros(string $busca, string $status): array
    {
        $condicoes = [];
        $params    = [];

        if ($busca !== '') {
            $condicoes[] = '(nome LIKE :busca_nome OR placa LIKE :busca_placa OR servico LIKE :busca_servico)';
            $termo_busca = "%{$busca}%";
            $params[':busca_nome']    = $termo_busca;
            $params[':busca_placa']   = $termo_busca;
            $params[':busca_servico'] = $termo_busca;
        }

        if ($status !== '') {
            $condicoes[] = 'status = :status';
            $params[':status'] = $status;
        }

        $where_sql = $condicoes ? ('WHERE ' . implode(' AND ', $condicoes)) : '';
        return [$where_sql, $params];
    }

    private static function validar_int_positivo(mixed $valor): ?int
    {
        $resultado = filter_var($valor, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        return $resultado === false ? null : $resultado;
    }

    private static function validar_id(mixed $raw): int|false
    {
        return filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    }

    private static function ler_body(): array
    {
        $raw  = file_get_contents('php://input');
        $data = json_decode((string) $raw, true);
        return is_array($data) ? $data : [];
    }

    private static function validar_csrf(): void
    {
        $token_header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $token_sessao = $_SESSION['csrf_token']       ?? '';

        if (!$token_sessao || !hash_equals($token_sessao, $token_header)) {
            self::json(403, ['ok' => false, 'erro' => 'Token inválido.']);
            exit;
        }
    }

    private static function json(int $status, mixed $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }
}