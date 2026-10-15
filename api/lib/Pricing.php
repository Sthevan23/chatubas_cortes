<?php

declare(strict_types=1);

const PRECOS = [
    'Corte' => 35,
    'Barba' => 30,
    'Sobrancelha' => 15,
    'Pigmentação' => 20,
];

const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão débito', 'Cartão crédito'];

function calcular_valor($servicos): float
{
    if (is_array($servicos)) {
        $lista = $servicos;
    } else {
        $lista = array_map('trim', explode(',', (string) $servicos));
    }
    $sum = 0.0;
    foreach ($lista as $nome) {
        if ($nome === '') {
            continue;
        }
        $sum += PRECOS[$nome] ?? 0;
    }
    return $sum;
}

function formatar_moeda($valor): string
{
    return 'R$ ' . number_format((float) $valor, 2, ',', '.');
}

function normalizar_servicos($servicos): string
{
    if (is_array($servicos)) {
        return implode(', ', $servicos);
    }
    return trim((string) $servicos);
}

function parse_date_time(string $data, string $hora): DateTime
{
    $h = strlen($hora) === 5 ? $hora . ':00' : $hora;
    return new DateTime($data . ' ' . $h);
}

function assert_ownership(array $agendamento, string $barbeiroNome): bool
{
    return ($agendamento['barbeiro'] ?? '') === $barbeiroNome;
}

function normalizar_hora(string $hora): string
{
    $hora = trim($hora);
    if (strlen($hora) === 5) {
        return $hora . ':00';
    }
    return $hora;
}
