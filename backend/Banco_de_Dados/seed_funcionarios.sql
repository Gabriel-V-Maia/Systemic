--
-- ============================================================
--  Seed: funcionarios
--
--  Insere o usuário administrador padrão para desenvolvimento.

--
--  IMPORTANTE: nunca armazene senhas em texto claro.
--  A coluna `senha` deve guardar o retorno de password_hash().
--  Este seed já usa um hash bcrypt gerado com PASSWORD_BCRYPT.
--
--  Usuário de teste:
--    email : admin@automax.com.br
--    senha : automax123   ← trocar antes de ir pra produção
-- ============================================================

USE oficina_db;

-- Usuário gerente para desenvolvimento/testes
INSERT INTO funcionarios (nome_funcionario, email, nivel_de_acesso, senha)
VALUES (
    'Administrador Automax',
    'admin@automax.com.br',
    'gerente',
    -- hash bcrypt de 'automax123' — gerado com password_hash($senha, PASSWORD_BCRYPT)
    '$2y$12$vgUvZLzh/O4FAZhU4vksD.NK5zxDZGtr3LrpPomA2iSr.iskVUEEW'
)
ON DUPLICATE KEY UPDATE
    nome_funcionario = VALUES(nome_funcionario),
    nivel_de_acesso  = VALUES(nivel_de_acesso);

-- ============================================================
--  Como gerar um novo hash no PHP:
--    echo password_hash('sua_senha_aqui', PASSWORD_BCRYPT);
-- ============================================================