<?php

declare(strict_types=1);

require_once __DIR__ . '/database.php';

class ProdutoNotFoundException extends RuntimeException {}

class ProdutoController
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::get_instance();
    }

    /*
     * Busca um produto pelo seu ID.
     * Lança ProdutoNotFoundException se não encontrado.
     */
    public function buscar_por_id(int $id_produto): array
    {
        $produto = $this->db->query_one(
            'SELECT id_produto, nome, preco, stock, imagem, categoria, detalhes
               FROM produtos
              WHERE id_produto = :id
              LIMIT 1',
            [':id' => $id_produto]
        );

        if ($produto === null) {
            throw new ProdutoNotFoundException("Produto #{$id_produto} não encontrado.");
        }

        return $produto;
    }

    /*
     * Retorna produtos da mesma categoria, excluindo o produto atual.
     * Usado na seção "Produtos Relacionados".
     */
    public function buscar_relacionados(string $categoria, int $excluir_id, int $limite = 3): array
    {
        return $this->db->query(
            'SELECT id_produto, nome, preco, imagem
               FROM produtos
              WHERE categoria = :categoria
                AND id_produto != :excluir_id
              LIMIT :limite',
            [
                ':categoria'  => $categoria,
                ':excluir_id' => $excluir_id,
                ':limite'     => $limite,
            ]
        );
    }

    /*
     * Lista todos os produtos, com paginação simples.
     * Usado em /produtos (listagem geral).
     */
    public function listar(int $pagina = 1, int $por_pagina = 12): array
    {
        $offset = ($pagina - 1) * $por_pagina;

        return $this->db->query(
            'SELECT id_produto, nome, preco, stock, imagem, categoria
               FROM produtos
              ORDER BY id_produto DESC
              LIMIT :limite OFFSET :offset',
            [
                ':limite'  => $por_pagina,
                ':offset'  => $offset,
            ]
        );
    }
}