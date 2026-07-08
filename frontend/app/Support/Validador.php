<?php

declare(strict_types=1);

namespace Automax\Support;

/**
 * Validações reutilizáveis de campos vindos de requisição (string, número,
 * whitelist). Cada método devolve o valor já normalizado ou aciona
 * ErroValidacao quando o campo não passa — assim o controller só chama e
 * segue, sem repetir a mesma checagem de tamanho/faixa em todo lugar.
 *
 * Uso típico dentro de um controller:
 *
 *   try {
 *       $tipo_ordem = Validador::texto($body['tipo_ordem'] ?? null, 'Tipo de ordem', 1, 100);
 *       $mao_de_obra = Validador::decimal($body['mao_de_obra'] ?? null, 'Mão de obra', 0, 99_999_999.99);
 *   } catch (ErroValidacao $e) {
 *       self::json(422, ['erro' => $e->getMessage()]);
 *       return;
 *   }
 */
class Validador
{
    /**
     * Valida uma string: obrigatória (a menos que $obrigatorio seja false),
     * dentro de [$min, $max] caracteres (mb_strlen). Retorna o valor já com trim.
     */
    public static function texto(
        mixed $valor,
        string $rotulo,
        int $min = 1,
        int $max = 255,
        bool $obrigatorio = true
    ): ?string {
        $texto = trim((string) ($valor ?? ''));

        if ($texto === '') {
            if (!$obrigatorio) {
                return null;
            }
            throw new ErroValidacao("{$rotulo} é obrigatório.");
        }

        $tamanho = mb_strlen($texto);
        if ($tamanho < $min || $tamanho > $max) {
            throw new ErroValidacao("{$rotulo} deve ter entre {$min} e {$max} caracteres.");
        }

        return $texto;
    }

    /**
     * Valida um inteiro dentro de [$min, $max]. Aceita null quando o campo
     * é opcional; caso contrário, exige um inteiro válido.
     */
    public static function inteiro(
        mixed $valor,
        string $rotulo,
        int $min = PHP_INT_MIN,
        int $max = PHP_INT_MAX,
        bool $obrigatorio = true
    ): ?int {
        if ($valor === null || $valor === '') {
            if (!$obrigatorio) {
                return null;
            }
            throw new ErroValidacao("{$rotulo} é obrigatório.");
        }

        $inteiro = filter_var($valor, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => $min, 'max_range' => $max],
        ]);

        if ($inteiro === false) {
            throw new ErroValidacao("{$rotulo} deve ser um número inteiro entre {$min} e {$max}.");
        }

        return $inteiro;
    }

    /**
     * Valida um decimal (dinheiro, preço, etc.) dentro de [$min, $max].
     * Usa DECIMAL(10,2) como faixa-padrão máxima (99999999.99), que é o
     * limite das colunas monetárias do banco — ajuste $max se a coluna
     * de destino for diferente.
     */
    public static function decimal(
        mixed $valor,
        string $rotulo,
        float $min = 0.0,
        float $max = 99_999_999.99,
        bool $obrigatorio = true
    ): ?float {
        if ($valor === null || $valor === '') {
            if (!$obrigatorio) {
                return null;
            }
            throw new ErroValidacao("{$rotulo} é obrigatório.");
        }

        $decimal = filter_var($valor, FILTER_VALIDATE_FLOAT);

        if ($decimal === false || $decimal < $min || $decimal > $max) {
            throw new ErroValidacao("{$rotulo} deve ser um valor entre {$min} e {$max}.");
        }

        return $decimal;
    }

    /**
     * Garante que o valor está numa lista fechada de opções válidas
     * (ex.: tipo_ordem, status, categoria). Evita gravar string livre
     * em coluna que o front trata como <select>.
     */
    public static function whitelist(mixed $valor, string $rotulo, array $opcoes_validas): string
    {
        $texto = trim((string) ($valor ?? ''));

        if (!in_array($texto, $opcoes_validas, true)) {
            $lista = implode(', ', $opcoes_validas);
            throw new ErroValidacao("{$rotulo} inválido. Valores aceitos: {$lista}.");
        }

        return $texto;
    }
}