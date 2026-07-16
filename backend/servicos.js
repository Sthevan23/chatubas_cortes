const PRECOS = {
  Corte: 35,
  Barba: 30,
  Sobrancelha: 15,
  Pigmentação: 20,
};

const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão débito", "Cartão crédito"];

function calcularValor(servicos) {
  const lista =
    typeof servicos === "string"
      ? servicos.split(",").map((s) => s.trim())
      : Array.isArray(servicos)
        ? servicos
        : [];

  return lista.reduce((sum, nome) => sum + (PRECOS[nome] || 0), 0);
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

module.exports = { PRECOS, FORMAS_PAGAMENTO, calcularValor, formatarMoeda };
