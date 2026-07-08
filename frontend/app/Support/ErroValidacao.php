<?php

declare(strict_types=1);

namespace Automax\Support;

/**
 * Lançada pelo Validador quando um campo não passa na checagem.
 * A mensagem já vem pronta para ser devolvida ao cliente (HTTP 422).
 */
class ErroValidacao extends \RuntimeException
{
}