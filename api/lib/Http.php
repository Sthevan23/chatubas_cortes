<?php

declare(strict_types=1);

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function request_path(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    if ($base !== '' && str_starts_with($uri, $base)) {
        $uri = substr($uri, strlen($base));
    }
    $uri = '/' . trim($uri, '/');
    return $uri === '/' ? '/' : rtrim($uri, '/');
}

function cors_origin_allowed(string $origin, array $allowed): bool
{
    if ($origin === '') {
        return false;
    }
    $origin = rtrim($origin, '/');
    $normalized = array_map(static fn ($o) => rtrim((string) $o, '/'), $allowed);
    if (in_array($origin, $normalized, true)) {
        return true;
    }
    if (preg_match('#^http://127\.0\.0\.1(:\d+)?$#', $origin)) {
        return true;
    }
    if (preg_match('#^http://localhost(:\d+)?$#', $origin)) {
        return true;
    }
    return false;
}

function apply_cors(array $cfg): void
{
    $origin = rtrim($_SERVER['HTTP_ORIGIN'] ?? '', '/');
    $allowed = $cfg['cors_origins'] ?? [];

    if ($origin !== '' && cors_origin_allowed($origin, $allowed)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
    }

    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (!str_starts_with($header, 'Bearer ')) {
        return null;
    }
    return trim(substr($header, 7));
}
