<?php

declare(strict_types=1);

namespace Automax\Controllers;

use Automax\Config\Database;
use Automax\Config\DatabaseException;

/**
 * Agendamento de serviços (/pedir).
 *
 * Desde a integração com o painel do cliente, todo agendamento é vinculado
 * à conta autenticada (id_cliente) e, opcionalmente, a um dos veículos
 * cadastrados do cliente (id_veiculo).
 */
class AgendamentoController
{
    private const TURNOS_VALIDOS = ['manha', 'tarde'];
    private const MAX_BODY_BYTES = 65536;

    private const MAX_LEN = [
        'nome'        => 150,
        'telefone'    => 20,
        'email'       => 150,
        'marca'       => 50,
        'modelo'      => 50,
        'combustivel' => 30,
        'servico'     => 100,
        'sintomas'    => 500,
        'descricao'   => 1000,
    ];

    public static function criar(): void
    {
        self::validar_csrf();

        $id_cliente = (int) ($_SESSION['cliente_id'] ?? 0);
        $body       = self::ler_body();

        if ($body === null) {
            self::json(400, ['ok' => false, 'erro' => 'Corpo inválido.']);
            return;
        }

        $dados = self::normalizar($body);

        $erros = self::validar($dados);
        if (!empty($erros)) {
            self::json(422, ['ok' => false, 'erro' => implode(' ', $erros)]);
            return;
        }

        try {
            $db = Database::get_instance();

            $id_veiculo = self::resolver_veiculo($db, $id_cliente, $dados['placa']);

            $db->execute(
                'INSERT INTO agendamentos
                    (id_cliente, id_veiculo, nome, telefone, email, placa, marca, modelo, ano,
                     combustivel, km, servico, sintomas, descricao, data_preferida, turno)
                 VALUES
                    (:id_cliente, :id_veiculo, :nome, :telefone, :email, :placa, :marca, :modelo, :ano,
                     :combustivel, :km, :servico, :sintomas, :descricao, :data_preferida, :turno)',
                [
                    ':id_cliente'     => $id_cliente,
                    ':id_veiculo'     => $id_veiculo,
                    ':nome'           => $dados['nome'],
                    ':telefone'       => $dados['telefone'],
                    ':email'          => $dados['email'] ?: null,
                    ':placa'          => $dados['placa'] ?: null,
                    ':marca'          => $dados['marca'],
                    ':modelo'         => $dados['modelo'],
                    ':ano'            => self::ou_null_int($dados['ano']),
                    ':combustivel'    => $dados['combustivel'] ?: null,
                    ':km'             => self::ou_null_int($dados['km']),
                    ':servico'        => $dados['servico'],
                    ':sintomas'       => $dados['sintomas'] ?: null,
                    ':descricao'      => $dados['descricao'] ?: null,
                    ':data_preferida' => $dados['data_preferida'],
                    ':turno'          => $dados['turno'] ?: null,
                ]
            );

            self::json(201, ['ok' => true]);
        } catch (DatabaseException $e) {
            error_log('[AgendamentoController] criar: ' . $e->getMessage());
            self::json(503, ['ok' => false, 'erro' => 'Serviço indisponível. Tente novamente.']);
        }
    }

    /**
     * Normaliza e tipa os campos recebidos antes de validar/persistir,
     * evitando repetir trim()/strtoupper() em pontos diferentes do fluxo
     * (o que antes fazia a placa usada no INSERT e na busca de veículo
     * ficarem normalizadas de formas diferentes).
     */
    private static function normalizar(array $body): array
    {
        return [
            'nome'           => trim((string) ($body['nome'] ?? '')),
            'telefone'       => trim((string) ($body['telefone'] ?? '')),
            'email'          => trim((string) ($body['email'] ?? '')),
            'placa'          => strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) ($body['placa'] ?? ''))),
            'marca'          => trim((string) ($body['marca'] ?? '')),
            'modelo'         => trim((string) ($body['modelo'] ?? '')),
            'ano'            => trim((string) ($body['ano'] ?? '')),
            'combustivel'    => trim((string) ($body['combustivel'] ?? '')),
            'km'             => trim((string) ($body['km'] ?? '')),
            'servico'        => trim((string) ($body['servico'] ?? '')),
            'sintomas'       => trim((string) ($body['sintomas'] ?? '')),
            'descricao'      => trim((string) ($body['descricao'] ?? '')),
            'data_preferida' => trim((string) ($body['data_preferida'] ?? '')),
            'turno'          => trim((string) ($body['turno'] ?? '')),
        ];
    }

    private static function validar(array $d): array
    {
        $erros = [];

        if ($d['nome'] === '')     $erros[] = 'Nome é obrigatório.';
        if ($d['telefone'] === '') $erros[] = 'Telefone é obrigatório.';
        if ($d['marca'] === '')    $erros[] = 'Marca do veículo é obrigatória.';
        if ($d['modelo'] === '')   $erros[] = 'Modelo do veículo é obrigatório.';
        if ($d['servico'] === '')  $erros[] = 'Selecione o serviço desejado.';

        if (!self::data_valida($d['data_preferida'])) {
            $erros[] = 'Data preferida inválida.';
        }

        if ($d['turno'] !== '' && !in_array($d['turno'], self::TURNOS_VALIDOS, true)) {
            $erros[] = 'Turno inválido.';
        }

        if ($d['email'] !== '' && !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
            $erros[] = 'E-mail inválido.';
        }

        if ($d['telefone'] !== '' && !preg_match('/^[0-9()+\-\s]{8,20}$/', $d['telefone'])) {
            $erros[] = 'Telefone inválido.';
        }

        if ($d['placa'] !== '' && !preg_match('/^[A-Z0-9]{7}$/', $d['placa'])) {
            $erros[] = 'Placa inválida.';
        }

        if ($d['ano'] !== '' && !preg_match('/^\d{4}$/', $d['ano'])) {
            $erros[] = 'Ano inválido.';
        }

        if ($d['km'] !== '' && !preg_match('/^\d{1,7}$/', $d['km'])) {
            $erros[] = 'Quilometragem inválida.';
        }

        foreach (self::MAX_LEN as $campo => $tamanho) {
            if (mb_strlen($d[$campo]) > $tamanho) {
                $erros[] = "Campo '{$campo}' excede o tamanho máximo permitido.";
            }
        }

        return $erros;
    }

    private static function data_valida(string $data): bool
    {
        $partes = \DateTime::createFromFormat('Y-m-d', $data);
        return $partes !== false && $partes->format('Y-m-d') === $data;
    }

    /**
     * Se o agendamento informar a placa de um veículo já cadastrado pelo
     * cliente autenticado, vincula o agendamento a esse veículo (id_veiculo).
     * Caso contrário (placa nova ou não informada), retorna null.
     */
    private static function resolver_veiculo(Database $db, int $id_cliente, string $placa): ?int
    {
        if ($placa === '' || $id_cliente <= 0) {
            return null;
        }

        $veiculo = $db->query_one(
            'SELECT id_veiculo FROM veiculos WHERE placa = :placa AND id_cliente = :id_cliente LIMIT 1',
            [':placa' => $placa, ':id_cliente' => $id_cliente]
        );

        return $veiculo !== null ? (int) $veiculo['id_veiculo'] : null;
    }

    private static function ou_null_int(mixed $valor): ?int
    {
        return $valor !== '' && $valor !== null ? (int) $valor : null;
    }

    private static function ler_body(): ?array
    {
        $raw = $GLOBALS['_test_input'] ?? file_get_contents('php://input');
        if (empty($raw) || strlen($raw) > self::MAX_BODY_BYTES) return null;

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    private static function validar_csrf(): void
    {
        $token_header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $token_sessao = $_SESSION['csrf_token'] ?? '';

        if ($token_sessao === '' || !hash_equals($token_sessao, $token_header)) {
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