<?php

declare(strict_types=1);

require __DIR__ . '/lib/Http.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$override = strtoupper(trim($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? ''));
if ($method === 'POST' && in_array($override, ['PUT', 'PATCH', 'DELETE'], true)) {
    $method = $override;
}
$path = request_path();

if ($method === 'GET' && $path === '/health') {
    header('Access-Control-Allow-Origin: *');
    json_response(200, ['status' => 'ok', 'timestamp' => gmdate('c')]);
}

require __DIR__ . '/lib/Pricing.php';
require __DIR__ . '/lib/Auth.php';
require __DIR__ . '/lib/AgendamentoRepository.php';

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    json_response(503, [
        'mensagem' => 'API não configurada. Copie config.example.php para config.php e preencha o MySQL.',
    ]);
}

/** @var array $cfg */
$cfg = require $configPath;
apply_cors($cfg);

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $cfg['db_host'], $cfg['db_name']),
        $cfg['db_user'],
        $cfg['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (Throwable $e) {
    json_response(500, ['mensagem' => 'Erro ao conectar no banco MySQL.']);
}

$repo = new AgendamentoRepository($pdo);
$secret = (string) ($cfg['auth_secret'] ?? '');

if ($method === 'POST' && $path === '/auth/login') {
    $body = read_json_body();
    $usuario = trim((string) ($body['usuario'] ?? ''));
    $senha = (string) ($body['senha'] ?? '');
    if ($usuario === '' || $senha === '') {
        json_response(400, ['mensagem' => 'Informe usuário e senha.']);
    }
    $barbeiro = find_barbeiro_credentials($usuario, $senha);
    if (!$barbeiro) {
        json_response(401, ['mensagem' => 'Usuário ou senha incorretos.']);
    }
    $token = sign_token(
        ['barbeiro' => $barbeiro['nome'], 'usuario' => $barbeiro['usuario']],
        $secret
    );
    json_response(200, [
        'token' => $token,
        'barbeiro' => $barbeiro['nome'],
        'usuario' => $barbeiro['usuario'],
    ]);
}

if ($method === 'GET' && $path === '/auth/me') {
    $auth = require_auth($secret);
    json_response(200, [
        'barbeiro' => $auth['barbeiro'],
        'usuario' => $auth['usuario'] ?? '',
    ]);
}

if ($method === 'GET' && ($path === '/ocupados' || $path === '/agendamentos/ocupados')) {
    $data = trim((string) ($_GET['data'] ?? ''));
    $barbeiro = trim((string) ($_GET['barbeiro'] ?? ''));
    if ($data === '' || $barbeiro === '') {
        json_response(400, ['mensagem' => 'Parâmetros obrigatórios: data, barbeiro.']);
    }
    json_response(200, $repo->horariosOcupados($data, $barbeiro));
}

if ($method === 'POST' && $path === '/agendamentos') {
    $body = read_json_body();
    $nome = trim((string) ($body['nome'] ?? ''));
    $servicos = normalizar_servicos($body['servicos'] ?? '');
    $barbeiro = trim((string) ($body['barbeiro'] ?? ''));
    $data = trim((string) ($body['data'] ?? ''));
    $hora = trim((string) ($body['hora'] ?? ''));
    $forma = trim((string) ($body['forma_pagamento'] ?? ''));
    $telefone = trim((string) ($body['telefone'] ?? ''));

    if ($nome === '' || $data === '' || $hora === '' || $servicos === '' || $barbeiro === '' || $forma === '') {
        json_response(400, [
            'mensagem' => 'Campos obrigatórios: nome, data, hora, servicos, barbeiro, forma_pagamento',
        ]);
    }
    if (!in_array($forma, FORMAS_PAGAMENTO, true)) {
        json_response(400, ['mensagem' => 'Forma de pagamento inválida.']);
    }
    if (parse_date_time($data, $hora) < new DateTime()) {
        json_response(400, ['mensagem' => 'Não é permitido agendar para data/horário no passado.']);
    }
    if (!$repo->slotLivre($data, $hora, $barbeiro)) {
        json_response(400, [
            'mensagem' => 'Já existe um agendamento para esse barbeiro nesse dia e horário.',
        ]);
    }
    try {
        $created = $repo->criar([
            'nome' => $nome,
            'telefone' => $telefone,
            'data' => $data,
            'hora' => $hora,
            'servicos' => $servicos,
            'barbeiro' => $barbeiro,
            'forma_pagamento' => $forma,
            'valor_total' => calcular_valor($servicos),
        ]);
        json_response(201, $created);
    } catch (PDOException $e) {
        if ((int) $e->errorInfo[1] === 1062) {
            json_response(400, [
                'mensagem' => 'Já existe um agendamento para esse barbeiro nesse dia e horário.',
            ]);
        }
        json_response(500, ['mensagem' => 'Erro ao criar agendamento.']);
    }
}

if ($method === 'GET' && $path === '/agendamentos') {
    $auth = require_auth($secret);
    $data = trim((string) ($_GET['data'] ?? ''));
    $queryBarbeiro = trim((string) ($_GET['barbeiro'] ?? ''));
    if ($queryBarbeiro !== '' && $queryBarbeiro !== $auth['barbeiro']) {
        json_response(403, ['mensagem' => 'Sem permissão para ver outro barbeiro.']);
    }
    json_response(200, $repo->listar($data ?: null, $auth['barbeiro']));
}

if ($method === 'GET' && $path === '/financeiro/resumo') {
    $auth = require_auth($secret);
    $data = trim((string) ($_GET['data'] ?? ''));
    $mes = trim((string) ($_GET['mes'] ?? ''));
    $rows = $repo->listarConcluidos($auth['barbeiro']);

    if ($data !== '') {
        $rows = array_values(array_filter($rows, fn ($r) => ($r['data'] ?? '') === $data));
    } elseif ($mes !== '') {
        $rows = array_values(array_filter($rows, fn ($r) => str_starts_with((string) ($r['data'] ?? ''), $mes)));
    } else {
        $hoje = (new DateTime())->format('Y-m-d');
        $rows = array_values(array_filter($rows, fn ($r) => ($r['data'] ?? '') === $hoje));
    }

    $total = array_sum(array_map(fn ($r) => (float) ($r['valor_total'] ?? 0), $rows));
    $porPagamento = [];
    foreach ($rows as $r) {
        $fp = $r['forma_pagamento'] ?: 'Não informado';
        $porPagamento[$fp] = ($porPagamento[$fp] ?? 0) + (float) ($r['valor_total'] ?? 0);
    }

    json_response(200, [
        'barbeiro' => $auth['barbeiro'],
        'total' => $total,
        'total_formatado' => formatar_moeda($total),
        'atendimentos' => count($rows),
        'por_pagamento' => $porPagamento,
        'historico' => array_map(function ($r) {
            return [
                'id' => $r['id'],
                'nome' => $r['nome'],
                'data' => $r['data'],
                'hora' => substr((string) $r['hora'], 0, 5),
                'servicos' => $r['servicos'],
                'forma_pagamento' => $r['forma_pagamento'],
                'valor_total' => (float) ($r['valor_total'] ?? 0),
                'valor_formatado' => formatar_moeda($r['valor_total'] ?? 0),
            ];
        }, $rows),
    ]);
}

if (preg_match('#^/agendamentos/(\d+)$#', $path, $m)) {
    $id = (int) $m[1];
    $auth = require_auth($secret);

    if ($method === 'PUT') {
        $body = read_json_body();
        $existente = $repo->buscarPorId($id);
        if (!$existente) {
            json_response(404, ['mensagem' => 'Agendamento não encontrado.']);
        }
        if (!assert_ownership($existente, $auth['barbeiro'])) {
            json_response(403, ['mensagem' => 'Sem permissão.']);
        }

        $nome = trim((string) ($body['nome'] ?? ''));
        $servicos = normalizar_servicos($body['servicos'] ?? '');
        $barbeiro = trim((string) ($body['barbeiro'] ?? ''));
        $data = trim((string) ($body['data'] ?? ''));
        $hora = trim((string) ($body['hora'] ?? ''));
        $forma = trim((string) ($body['forma_pagamento'] ?? $existente['forma_pagamento'] ?? ''));

        if ($nome === '' || $data === '' || $hora === '' || $servicos === '' || $barbeiro === '') {
            json_response(400, ['mensagem' => 'Campos obrigatórios: nome, data, hora, servicos, barbeiro']);
        }
        if (parse_date_time($data, $hora) < new DateTime()) {
            json_response(400, ['mensagem' => 'Não é permitido reagendar para data/horário no passado.']);
        }
        if (!$repo->slotLivre($data, $hora, $barbeiro, $id)) {
            json_response(400, [
                'mensagem' => 'Já existe um agendamento para esse barbeiro nesse dia e horário.',
            ]);
        }
        $updated = $repo->atualizar($id, [
            'nome' => $nome,
            'telefone' => trim((string) ($body['telefone'] ?? '')),
            'data' => $data,
            'hora' => $hora,
            'servicos' => $servicos,
            'barbeiro' => $barbeiro,
            'forma_pagamento' => $forma,
            'valor_total' => calcular_valor($servicos),
        ]);
        json_response(200, $updated);
    }

    if ($method === 'DELETE') {
        $existente = $repo->buscarPorId($id);
        if (!$existente) {
            json_response(404, ['mensagem' => 'Agendamento não encontrado.']);
        }
        if (!assert_ownership($existente, $auth['barbeiro'])) {
            json_response(403, ['mensagem' => 'Sem permissão.']);
        }
        $repo->remover($id);
        json_response(200, ['mensagem' => 'Agendamento excluído com sucesso.']);
    }
}

if (preg_match('#^/agendamentos/(\d+)/confirmar$#', $path, $m) && $method === 'PATCH') {
    $id = (int) $m[1];
    $auth = require_auth($secret);
    $existente = $repo->buscarPorId($id);
    if (!$existente) {
        json_response(404, ['mensagem' => 'Agendamento não encontrado.']);
    }
    if (!assert_ownership($existente, $auth['barbeiro'])) {
        json_response(403, ['mensagem' => 'Sem permissão.']);
    }
    json_response(200, $repo->confirmar($id));
}

json_response(404, [
    'mensagem' => 'Rota ' . $method . ' ' . $path . ' não encontrada.',
]);
