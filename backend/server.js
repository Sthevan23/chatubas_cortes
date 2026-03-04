const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const agendamentoRoutes = require("./agendamentoRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/agendamentos", agendamentoRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
