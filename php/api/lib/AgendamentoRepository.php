<?php

declare(strict_types=1);

class AgendamentoRepository
{
    public function __construct(private PDO $pdo)
    {
        $this->ensureLembreteColumn();
    }

    private function ensureLembreteColumn(): void
    {
        try {
            $stmt = $this->pdo->query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'agendamentos'
                   AND COLUMN_NAME = 'lembrete_enviado_em'"
            );
            if ($stmt && $stmt->fetch() === false) {
                $this->pdo->exec(
                    'ALTER TABLE agendamentos ADD COLUMN lembrete_enviado_em DATETIME NULL AFTER concluido_em'
                );
            }
        } catch (Throwable) {
            // ignore
        }
    }

    public function listar(?string $data, ?string $barbeiro): array
    {
        $sql = 'SELECT id, nome, telefone, data, hora, status, servicos, barbeiro, forma_pagamento, valor_total, criado_em, lembrete_enviado_em FROM agendamentos';
        $conds = [];
        $params = [];
        if ($data) {
            $conds[] = 'data = ?';
            $params[] = $data;
        }
        if ($barbeiro) {
            $conds[] = 'barbeiro = ?';
            $params[] = $barbeiro;
        }
        if ($conds) {
            $sql .= ' WHERE ' . implode(' AND ', $conds);
        }
        $sql .= ' ORDER BY data ASC, hora ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function slotLivre(string $data, string $hora, string $barbeiro, ?int $excludeId = null): bool
    {
        $hora = normalizar_hora($hora);
        $sql = 'SELECT COUNT(*) FROM agendamentos WHERE data = ? AND hora = ? AND barbeiro = ?';
        $params = [$data, $hora, $barbeiro];
        if ($excludeId) {
            $sql .= ' AND id <> ?';
            $params[] = $excludeId;
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn() === 0;
    }

    public function criar(array $payload): array
    {
        $hora = normalizar_hora($payload['hora']);
        $stmt = $this->pdo->prepare(
            'INSERT INTO agendamentos (nome, telefone, data, hora, servicos, barbeiro, forma_pagamento, valor_total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $payload['nome'],
            $payload['telefone'],
            $payload['data'],
            $hora,
            $payload['servicos'],
            $payload['barbeiro'],
            $payload['forma_pagamento'],
            $payload['valor_total'],
        ]);
        return [
            'id' => (int) $this->pdo->lastInsertId(),
            'nome' => $payload['nome'],
            'telefone' => $payload['telefone'],
            'data' => $payload['data'],
            'hora' => $hora,
            'servicos' => $payload['servicos'],
            'barbeiro' => $payload['barbeiro'],
            'forma_pagamento' => $payload['forma_pagamento'],
            'valor_total' => $payload['valor_total'],
            'status' => 'pendente',
        ];
    }

    public function buscarPorId(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, nome, telefone, data, hora, servicos, barbeiro, forma_pagamento, valor_total, status, lembrete_enviado_em
             FROM agendamentos WHERE id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function atualizar(int $id, array $payload): array
    {
        $hora = normalizar_hora($payload['hora']);
        $stmt = $this->pdo->prepare(
            'UPDATE agendamentos SET nome = ?, telefone = ?, data = ?, hora = ?, servicos = ?, barbeiro = ?,
             forma_pagamento = ?, valor_total = ? WHERE id = ?'
        );
        $stmt->execute([
            $payload['nome'],
            $payload['telefone'],
            $payload['data'],
            $hora,
            $payload['servicos'],
            $payload['barbeiro'],
            $payload['forma_pagamento'],
            $payload['valor_total'],
            $id,
        ]);
        if ($stmt->rowCount() === 0 && !$this->buscarPorId($id)) {
            json_response(404, ['mensagem' => 'Agendamento não encontrado.']);
        }
        return ['id' => $id] + $payload + ['hora' => $hora];
    }

    public function remover(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM agendamentos WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            json_response(404, ['mensagem' => 'Agendamento não encontrado.']);
        }
    }

    public function confirmar(int $id): array
    {
        $row = $this->buscarPorId($id);
        if (!$row) {
            json_response(404, ['mensagem' => 'Agendamento não encontrado.']);
        }
        $valor = calcular_valor($row['servicos']);
        $stmt = $this->pdo->prepare(
            "UPDATE agendamentos SET status = 'concluido', valor_total = ?, concluido_em = NOW() WHERE id = ?"
        );
        $stmt->execute([$valor, $id]);
        return array_merge($row, ['status' => 'concluido', 'valor_total' => $valor]);
    }

    public function horariosOcupados(string $data, string $barbeiro): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT hora FROM agendamentos WHERE data = ? AND barbeiro = ? ORDER BY hora ASC'
        );
        $stmt->execute([$data, $barbeiro]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listarConcluidos(?string $barbeiro): array
    {
        $sql = "SELECT id, nome, data, hora, servicos, barbeiro, forma_pagamento, valor_total, status, concluido_em, lembrete_enviado_em
                FROM agendamentos WHERE status = 'concluido'";
        $params = [];
        if ($barbeiro) {
            $sql .= ' AND barbeiro = ?';
            $params[] = $barbeiro;
        }
        $sql .= ' ORDER BY data DESC, hora DESC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
