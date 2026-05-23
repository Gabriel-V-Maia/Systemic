<?php
require_once "./libs/router.php";

// No Docker o site fica em localhost/ (raiz), basePath é vazio
$router = new Router(__DIR__);

$router->get("/", function() {
    http_response_code(200);
    header("Content-Type: text/html; charset=UTF-8");
    echo '<base href="/pages/homepage/">';
    include(__DIR__ . '/pages/homepage/index.html');
});

$router->get("/auth/login", function() {
    http_response_code(200);
    header("Content-Type: text/html; charset=UTF-8");
    echo '<base href="/pages/login/">';
    include(__DIR__ . '/pages/login/login.html');
});

$router->get("/produtos", function() {
    http_response_code(200);
    header("Content-Type: text/html; charset=UTF-8");
    echo '<base href="/pages/produto/">';
    include(__DIR__ . '/pages/produto/produto.html');
});

$router->get("/produto/:id", function(array $params) {
    http_response_code(200);
    header("Content-Type: text/html; charset=UTF-8");
    echo '<base href="/pages/produto/">';
    include(__DIR__ . '/pages/produto/produto.html');
});

$router->get("/ordem-servico", function() {
    http_response_code(200);
    header("Content-Type: text/html; charset=UTF-8");
    echo '<base href="/pages/ordem-servico/">';
    include(__DIR__ . '/pages/ordem-servico/automax-os.html');
});

// Placeholders
foreach (['/servicos', '/pedir', '/cadastro', '/busca'] as $rota) {
    $router->get($rota, function() use ($rota) {
        http_response_code(200);
        header("Content-Type: text/html; charset=UTF-8");
        echo "<h2 style='font-family:sans-serif;padding:2rem'>Página <code>{$rota}</code> em construção.</h2>";
    });
}

try {
    $router->dispatch($_SERVER['REQUEST_URI'], $_SERVER['REQUEST_METHOD']);
} catch (Exception $e) {
    http_response_code(500);
    echo $e->getMessage();
}