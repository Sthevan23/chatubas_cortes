<?php

declare(strict_types=1);

const BARBEIROS = [
    ['id' => 'ricardo', 'nome' => 'Ricardo', 'usuario' => 'ricardo', 'senha' => 'ricardo123'],
    ['id' => 'marcos', 'nome' => 'Marcos', 'usuario' => 'marcos', 'senha' => 'marcos123'],
    ['id' => 'andre', 'nome' => 'André', 'usuario' => 'andre', 'senha' => 'andre123'],
];

const TOKEN_TTL_MS = 86400000;

function b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string
{
    $pad = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($data, '-_', '+/'), true) ?: '';
}

function sign_token(array $payload, string $secret): string
{
    $data = json_encode(array_merge($payload, ['exp' => (int) (microtime(true) * 1000) + TOKEN_TTL_MS]));
    $body = b64url_encode($data);
    $sig = b64url_encode(hash_hmac('sha256', $body, $secret, true));
    return $body . '.' . $sig;
}

function verify_token(?string $token, string $secret): ?array
{
    if (!$token || !str_contains($token, '.')) {
        return null;
    }
    [$body, $sig] = explode('.', $token, 2);
    $expected = b64url_encode(hash_hmac('sha256', $body, $secret, true));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $json = b64url_decode($body);
    $payload = json_decode($json, true);
    if (!is_array($payload) || empty($payload['exp']) || empty($payload['barbeiro'])) {
        return null;
    }
    if ((int) $payload['exp'] < (int) (microtime(true) * 1000)) {
        return null;
    }
    return $payload;
}

function find_barbeiro_credentials(string $usuario, string $senha): ?array
{
    $user = strtolower(trim($usuario));
    foreach (BARBEIROS as $b) {
        if (strtolower($b['usuario']) === $user && $b['senha'] === $senha) {
            return $b;
        }
    }
    return null;
}

function require_auth(string $secret): array
{
    $token = bearer_token();
    $payload = verify_token($token, $secret);
    if (!$payload) {
        json_response(401, ['mensagem' => 'Faça login para acessar o painel.']);
    }
    return $payload;
}
