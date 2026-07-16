const repo = require("./agendamentoRepository");
const { formatarMoeda } = require("./servicos");

function monthPrefix(isoMonth) {
  return isoMonth; // YYYY-MM
}

exports.resumo = async (req, res) => {
  try {
    const barbeiro = req.barbeiro;
    const { data, mes } = req.query;

    let rows = await repo.listarConcluidos({ barbeiro });

    if (data) {
      rows = rows.filter((r) => r.data === data);
    } else if (mes) {
      rows = rows.filter((r) => String(r.data).startsWith(monthPrefix(mes)));
    } else {
      const hoje = new Date();
      const hojeStr = [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0"),
      ].join("-");
      rows = rows.filter((r) => r.data === hojeStr);
    }

    const total = rows.reduce((sum, r) => sum + Number(r.valor_total || 0), 0);
    const porPagamento = {};

    rows.forEach((r) => {
      const fp = r.forma_pagamento || "Não informado";
      porPagamento[fp] = (porPagamento[fp] || 0) + Number(r.valor_total || 0);
    });

    res.json({
      barbeiro,
      total,
      total_formatado: formatarMoeda(total),
      atendimentos: rows.length,
      por_pagamento: porPagamento,
      historico: rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        data: r.data,
        hora: String(r.hora).slice(0, 5),
        servicos: r.servicos,
        forma_pagamento: r.forma_pagamento,
        valor_total: Number(r.valor_total || 0),
        valor_formatado: formatarMoeda(r.valor_total),
      })),
    });
  } catch (err) {
    console.error("Erro financeiro:", err);
    res.status(500).json({ mensagem: "Erro ao carregar financeiro." });
  }
};
