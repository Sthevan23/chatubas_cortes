<?php
/**
 * Copie para config.php e preencha com os dados do hPanel (MySQL + domínios).
 */
return [
    'db_host' => 'localhost',
    'db_name' => 'SEU_BANCO',
    'db_user' => 'SEU_USUARIO',
    'db_pass' => 'SUA_SENHA',

    // Mesmo segredo se já usou a API Node; ou gere um novo aleatório.
    'auth_secret' => 'troque-por-um-segredo-forte',

    'cors_origins' => [
        'https://sthevandev.com.br',
        'https://www.sthevandev.com.br',
        'https://painel.sthevandev.com.br',
        'http://localhost:5173',
        'http://localhost:5500',
    ],
];
