<div align="center">
<img src="assets/systemic-icon.png" width=200>

# Systemic

![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-10.11-003545?style=for-the-badge&logo=mariadb&logoColor=white)
![Apache](https://img.shields.io/badge/Apache-2.4-D22128?style=for-the-badge&logo=apache&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**Projeto de Situação de Aprendizagem — SENAI**

Sistema integrado para gerenciamento da Automax e portal de fornecedores da Flowgate.

</div>

---

## História

Um ano atrás, éramos apenas uma equipe de desenvolvedores contratados para atender a **Automax** — uma oficina mecânica movimentada que precisava de um sistema para gerenciar suas operações. Entregamos a primeira versão, mas o tempo era curto e as escolhas técnicas refletiam isso: SQLite, Flask, sessões simples.

Um ano depois, voltamos diferentes. Voltamos com a **Flowgate** (ainda atuando como Systemic) — nossa própria empresa, que agrega múltiplas fornecedoras em um único ponto de acesso. A Automax cresceu, e nosso sistema precisa crescer com ela. Desta vez, fazemos do jeito certo.

> A Flowgate fornece serviços de peças e informações técnicas, integrando fornecedoras em uma única API. A Automax consome esses serviços e ganha uma plataforma renovada para suas operações internas.

---

## O que mudou em relação à S.A. anterior

| Componente | Antes | Agora |
|---|---|---|
| Backend | Python + Flask | PHP 8.2 com router próprio e PSR-4 |
| Banco de dados | SQLite | MariaDB 10.11 |
| Autenticação | Sessions simples | Sessions seguras + CSRF |
| Servidor | Embutido no Flask | Apache via Docker |
| Ambiente | Local (XAMPP) | Docker Compose |

---

## Stack técnica

**Docker Compose** orquestra dois serviços: o container `web` (Apache + PHP 8.2) e o container `db` (MariaDB 10.11). O ambiente sobe com um único comando.

**Apache** atua como servidor web com dois Virtual Hosts — porta `8080` para a Automax e porta `8081` para a Flowgate.

**PHP 8.2** com autoload PSR-4 via Composer. Um `index.php` central recebe todo o tráfego e despacha para os controllers corretos via router próprio.

**MariaDB** com dois bancos isolados: `oficina_db` para a Automax e `flowgate_db` para a Flowgate, inicializados automaticamente pelos scripts em `backend/Banco_de_Dados/`.

---

## Arquitetura de deployment

```
                    +-----------------------------+
                    |        HOST MACHINE          |
                    |                             |
 Browser/Client --> |  :8080 (Automax)            |
                    |  :8081 (Flowgate)           |
                    |  +------------------------+ |
                    |  |        APACHE          | |
                    |  |   (Virtual Hosts)      | |
                    |  +------------------------+ |
                    |       |            |        |
                    |       v            v        |
                    |  +---------+  +---------+   |
                    |  | AUTOMAX |  |FLOWGATE |   |
                    |  | /htdocs |  | /htdocs |   |
                    |  |   PHP   |  |   PHP   |   |
                    |  +---------+  +---------+   |
                    |       |            |        |
                    |       v            v        |
                    |  +--------------------+     |
                    |  |     MARIADB        |     |
                    |  |      :3306         |     |
                    |  +--------------------+     |
                    +-----------------------------+
```

---

## Estrutura do projeto

```
Systemic/
├── backend/
│   └── Banco_de_Dados/
│       ├── oficina_db_mariadb.sql   # Schema do banco da Automax
│       ├── seed_funcionarios.sql    # Dados iniciais de funcionários
│       └── flowgate_init.sql        # Criação do usuário flowgate no MariaDB
├── flowgate/                        # API da Flowgate (porta 8081)
│   ├── api/
│   │   ├── categorias.php
│   │   ├── disponibilidade.php
│   │   ├── fornecedoras.php
│   │   ├── peca.php
│   │   └── pecas.php
│   ├── docs/
│   │   ├── API.md                   # Documentação completa da API
│   │   └── flowgate_db.sql          # Schema do banco da Flowgate
│   ├── libs/
│   │   ├── ApiAuth.php              # Autenticação por API key (hash SHA-256)
│   │   └── router.php
│   ├── database.php
│   └── index.php                    # Entry point da Flowgate
├── frontend/                        # App da Automax (porta 8080)
│   ├── api/
│   │   ├── busca.php                # GET /api/busca
│   │   ├── produto.php              # GET /api/produto
│   │   └── produtos.php             # GET /api/produtos
│   ├── app/                         # Classes PHP com autoload PSR-4
│   │   ├── Auth/
│   │   │   └── AccessControl.php
│   │   ├── Config/
│   │   │   └── Database.php
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── CadastroController.php
│   │   │   └── ProdutoController.php
│   │   └── Http/
│   │       └── Router.php
│   ├── pages/
│   │   ├── busca/
│   │   ├── cadastro/
│   │   ├── errors/
│   │   ├── homepage/
│   │   ├── login/
│   │   ├── ordem-servico/
│   │   ├── produto/
│   │   └── produtos/
│   ├── styles/
│   └── index.php                    # Entry point da Automax
├── tests/                           # Testes PHPUnit
├── apache.conf                      # Configuração dos Virtual Hosts
├── composer.json
├── docker-compose.yml
└── Dockerfile
```

---

## Como rodar

```bash
docker compose up -d
docker compose exec web composer dump-autoload --working-dir=/var/www/html
```

Acesse `http://localhost:8080` para a Automax e `http://localhost:8081` para a Flowgate.

Para resetar o banco do zero:

```bash
docker compose down -v
docker compose up -d
```

---

## Flowgate — API

A Flowgate é o hub de fornecedores. Em vez de a Automax integrar com cada fornecedora individualmente, a Flowgate centraliza o catálogo em uma única API autenticada por API key.

```
Automax ──► Flowgate API ──► [AutoPeças Brasil]
                         ──► [RapidPart]
                         ──► [MotoSupply SC]
```

Todas as rotas exigem o header `X-Flowgate-Key`. A chave de desenvolvimento é `automax-dev-key-2026`. Consulte `flowgate/docs/API.md` para a documentação completa dos endpoints.

---

## Distribuição de tarefas

| Responsabilidade | Responsáveis |
|---|---|
| Apoio geral e modelagem de deployment | Gabriel |
| Configuração do Apache e Docker | William + Gabriel |
| API da Flowgate | William + Gabriel |
| Rework das páginas HTML/CSS | Iago + Wellinthon |
| PHP geral (Automax e Flowgate) | Victor Mellos |

---

## Conventional Commits

```
feat:     nova funcionalidade
fix:      correção de bug
docs:     alteração na documentação
style:    formatação sem mudança de lógica
refactor: refatoração sem nova funcionalidade
test:     adição ou correção de testes
build:    mudanças no build, Docker, Composer
chore:    tarefas de config, gitignore, etc.
```

**Exemplo:**
```
feat(flowgate): adiciona endpoint de busca de peças por fornecedora
fix(automax): corrige validação de ordem de serviço duplicada
```

---

<div align="center">

**SENAI — Situação de Aprendizagem**
Desenvolvido pela equipe Systemic

![Status](https://img.shields.io/badge/status-em_desenvolvimento-yellow?style=flat-square)

</div>