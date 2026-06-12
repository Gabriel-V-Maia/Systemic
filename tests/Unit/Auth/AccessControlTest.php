<?php

declare(strict_types=1);

namespace Tests\Unit\Auth;

use PHPUnit\Framework\TestCase;
use Automax\Auth\AccessControl;

class AccessControlTest extends TestCase
{
    private int $ob_level_before;

    protected function setUp(): void
    {
        $this->ob_level_before = ob_get_level();
        $_SESSION = [];
        if (session_status() === PHP_SESSION_NONE) session_start();
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
        while (ob_get_level() > $this->ob_level_before) ob_end_clean();
        if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
    }

    // --- nivel_tem_permissao ---

    public function test_gerente_pode_excluir_ordem_servico(): void
    {
        $this->assertTrue(AccessControl::nivel_tem_permissao('gerente', 'ordem_servico.excluir'));
    }

    public function test_recepcao_nao_pode_excluir_ordem_servico(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('recepcao', 'ordem_servico.excluir'));
    }

    public function test_mecanico_nao_pode_excluir_ordem_servico(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('mecanico', 'ordem_servico.excluir'));
    }

    public function test_nivel_inexistente_nao_tem_nenhuma_permissao(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('fantasma', 'ordem_servico.visualizar'));
    }

    public function test_string_vazia_nao_tem_nenhuma_permissao(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('', 'ordem_servico.criar'));
    }

    // --- Permissões do gerente ---

    public function test_gerente_pode_editar_estoque(): void
    {
        $this->assertTrue(AccessControl::nivel_tem_permissao('gerente', 'estoque.editar'));
    }

    public function test_gerente_pode_cadastrar_clientes(): void
    {
        $this->assertTrue(AccessControl::nivel_tem_permissao('gerente', 'clientes.cadastrar'));
    }

    // --- Permissões da recepção ---

    public function test_recepcao_pode_criar_ordem_servico(): void
    {
        $this->assertTrue(AccessControl::nivel_tem_permissao('recepcao', 'ordem_servico.criar'));
    }

    public function test_recepcao_nao_pode_editar_estoque(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('recepcao', 'estoque.editar'));
    }

    public function test_recepcao_nao_pode_fechar_ordem_servico(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('recepcao', 'ordem_servico.fechar'));
    }

    // --- Permissões do mecânico ---

    public function test_mecanico_pode_editar_ordem_servico(): void
    {
        $this->assertTrue(AccessControl::nivel_tem_permissao('mecanico', 'ordem_servico.editar'));
    }

    public function test_mecanico_pode_fechar_ordem_servico(): void
    {
        $this->assertTrue(AccessControl::nivel_tem_permissao('mecanico', 'ordem_servico.fechar'));
    }

    public function test_mecanico_nao_pode_cadastrar_clientes(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('mecanico', 'clientes.cadastrar'));
    }

    public function test_mecanico_nao_pode_editar_clientes(): void
    {
        $this->assertFalse(AccessControl::nivel_tem_permissao('mecanico', 'clientes.editar'));
    }

    // --- permissoes_do_nivel ---

    public function test_permissoes_do_gerente_contem_todas_as_acoes_criticas(): void
    {
        $permissoes = AccessControl::permissoes_do_nivel('gerente');

        $acoes_criticas = [
            'ordem_servico.excluir',
            'estoque.editar',
            'clientes.editar',
        ];

        foreach ($acoes_criticas as $acao) {
            $this->assertContains($acao, $permissoes, "Gerente deveria ter: {$acao}");
        }
    }

    public function test_permissoes_de_nivel_inexistente_retorna_array_vazio(): void
    {
        $permissoes = AccessControl::permissoes_do_nivel('nivel_que_nao_existe');

        $this->assertIsArray($permissoes);
        $this->assertEmpty($permissoes);
    }

    public function test_permissao_inexistente_retorna_false_para_qualquer_nivel(): void
    {
        $niveis = ['gerente', 'recepcao', 'mecanico'];

        foreach ($niveis as $nivel) {
            $this->assertFalse(
                AccessControl::nivel_tem_permissao($nivel, 'permissao.que_nao_existe'),
                "Nível '{$nivel}' não deveria ter permissão inventada"
            );
        }
    }
}