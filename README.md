<div align="center">

# Systemic

![PHP](https://img.shields.io/badge/PHP-8.x-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**Projeto de Situacao de Aprendizagem — SENAI**

Sistema integrado para gerenciamento da Automax e portal de fornecedores da Flowgate.

</div>

---

## Historia

Um ano atras, eramos apenas uma equipe de desenvolvedores contratados para atender a **Automax** — uma oficina mecanica movimentada que precisava de um sistema para gerenciar suas operacoes. Entregamos a primeira versao, mas o tempo era curto e as escolhas tecnicas refletiam isso: SQLite, Flask, sessoes simples.

Um ano depois, voltamos diferentes. Voltamos com a **Flowgate** (ainda atuando como Systemic) — nossa propria empresa, que agrega multiplas fornecedoras em um unico ponto de acesso. A Automax cresceu, e nosso sistema precisa crescer com ela. Desta vez, fazemos do jeito certo.

> A Flowgate fornece servicos de pecas e informacoes tecnicas, integrando fornecedoras em uma unica API. A Automax consome esses servicos e ganha uma plataforma renovada para suas operacoes internas.

---

## O que mudou em relacao a S.A anterior

| Componente | Antes | Agora |
|---|---|---|
| Backend | Python + Flask | PHP com router proprio |
| Banco de dados | SQLite | MySQL com Docker Volumes |
| Autenticacao | Sessions no servidor | JWT Tokens |
| Servidor | Embutido no Flask | Nginx |
| Containers | Docker simples | Docker Compose multi-container |

---

## Stack tecnica

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
**Docker Compose** gerencia os containers da Automax, da Flowgate e do banco de dados, permitindo comunicacao entre eles e isolamento de ambiente.

![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white)
**Nginx** atua como servidor web e reverse proxy, roteando requisicoes para os containers corretos.

![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white)
**PHP** com uma biblioteca de routing propria. Um `index.php` recebe todo o trafego e responde com a pagina e os dados corretos.

![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)
**MySQL** com conexao real e **Docker Volumes** para persistir os dados mesmo apos desligar os containers.

---

## Arquitetura de Deployment

O diagrama abaixo representa como os containers se comunicam em producao.

```
                          +---------------------------+
                          |        HOST MACHINE        |
                          |                           |
   Browser/Client  ------>|  :80 / :443               |
                          |  +---------------------+  |
                          |  |       NGINX         |  |
                          |  |   (Reverse Proxy)   |  |
                          |  +---------------------+  |
                          |        |         |        |
                          |        v         v        |
                          |  +---------+ +---------+  |
                          |  | AUTOMAX | |FLOWGATE |  |
                          |  |  :8001  | |  :8002  |  |
                          |  | PHP+FPM | | PHP+FPM |  |
                          |  +---------+ +---------+  |
                          |        |         |        |
                          |        v         v        |
                          |  +---------------------+  |
                          |  |       MYSQL DB      |  |
                          |  |       :3306         |  |
                          |  +---------------------+  |
                          |        |                  |
                          |        v                  |
                          |  [  Docker Volume  ]      |
                          |   /var/lib/mysql          |
                          +---------------------------+
```

### Fluxo de uma requisicao

```
Cliente
  |
  | HTTP Request
  v
Nginx (porta 80/443)
  |
  |-- /automax/* --> Container Automax (PHP)
  |                        |
  |                        |--> MySQL (dados da oficina)
  |
  |-- /flowgate/* --> Container Flowgate (PHP)
                           |
                           |--> MySQL (catalogo de fornecedoras)
```

### Docker Compose — visao geral dos servicos

```yaml
# Estrutura conceitual do docker-compose.yml
services:
  nginx:       # Reverse proxy — expoe as portas 80/443
  automax:     # App da oficina — PHP, sem portas expostas ao host
  flowgate:    # API da Flowgate — PHP, sem portas expostas ao host
  db:          # MySQL — acessivel apenas pelos containers internos
volumes:
  db_data:     # Persiste os dados apos restart dos containers
```

---

## Estrutura do projeto

```
Systemic/
├── docs/                  # Diagramas, modelagem e documentacao
└── frontend/
    ├── assets/            # Arquivos estaticos globais
    ├── login/
    │   └── assets/
    ├── ordem-servico/
    ├── produto/
    └── styles/            # Estilos globais
```

---

## Distribuicao de tarefas

| Responsabilidade | Responsaveis |
|---|---|
| Apoio geral e modelagem de deployment | Gabriel |
| Configuracao do Nginx e deploy | William + Gabriel |
| API da Flowgate | William + Gabriel |
| Rework das paginas HTML/CSS | William + Wellinthon |
| PHP geral (Automax e Flowgate) | Victor Mellos |

> Todos podem e devem contribuir fora de suas areas principais. A distribuicao acima e o plano provisorio.

---

## Habilidades necessarias

![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)
Entendimento de modelagem relacional e queries MySQL.

![UML](https://img.shields.io/badge/UML-Diagramas-informational?style=flat-square)
Diagramas de classe, caso de uso e atividade.

![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white)
Variaveis, controle de fluxo, funcoes — a caixa de ferramentas do PHP.

![Git](https://img.shields.io/badge/Conventional_Commits-F05032?style=flat-square&logo=git&logoColor=white)
Conventional Commits para manter o historico legivel para todos.

---

## Conventional Commits

Usamos a convencao abaixo para manter clareza no historico de mudancas:

```
feat:     nova funcionalidade
fix:      correcao de bug
docs:     alteracao na documentacao
style:    formatacao sem mudanca de logica
refactor: refatoracao sem nova funcionalidade
chore:    tarefas de build, config, etc.
```

**Exemplo:**
```
feat(flowgate): adiciona endpoint de busca de pecas por fornecedora
fix(automax): corrige validacao de ordem de servico duplicada
```

---

## O que ainda falta definir

- [ ] Planejamento de custos e canvas da Flowgate
- [ ] Diagramas de caso de uso e atividade da Flowgate
- [ ] Definicao final do schema do banco de dados
- [ ] Configuracao inicial do `docker-compose.yml`

---

<div align="center">

**SENAI — Situacao de Aprendizagem**
Desenvolvido pela equipe Systemic

![Status](https://img.shields.io/badge/status-em_desenvolvimento-yellow?style=flat-square)

</div>
