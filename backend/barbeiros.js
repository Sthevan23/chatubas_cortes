// Credenciais dos barbeiros — altere as senhas antes de publicar
const BARBEIROS = [
  { id: "ricardo", nome: "Ricardo", usuario: "ricardo", senha: "ricardo123" },
  { id: "marcos", nome: "Marcos", usuario: "marcos", senha: "marcos123" },
  { id: "andre", nome: "André", usuario: "andre", senha: "andre123" },
];

function findByCredentials(usuario, senha) {
  const user = (usuario || "").trim().toLowerCase();
  const pass = senha || "";
  return BARBEIROS.find(
    (b) => b.usuario.toLowerCase() === user && b.senha === pass
  );
}

function findByNome(nome) {
  return BARBEIROS.find((b) => b.nome === nome);
}

module.exports = { BARBEIROS, findByCredentials, findByNome };
