// Gera o executável standalone do agente (agente-infra.exe) a partir de agent.js,
// usando o recurso nativo do Node.js "Single Executable Application".
// Uso: node agent/build.js
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const EXE_NAME = "agente-infra.exe";

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { cwd: DIR, stdio: "inherit" });
}

console.log("1/3 — gerando blob de preparação...");
run(process.execPath, ["--experimental-sea-config", "sea-config.json"]);

console.log("2/3 — copiando o binário do Node.js...");
fs.copyFileSync(process.execPath, path.join(DIR, EXE_NAME));

console.log("3/3 — injetando o código do agente no executável...");
run("npx", [
  "--yes",
  "postject",
  EXE_NAME,
  "NODE_SEA_BLOB",
  "sea-prep.blob",
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  "--overwrite",
]);

console.log(`\nPronto: agent/${EXE_NAME}`);
console.log(
  "Aviso: o executável fica sem assinatura digital válida — em alguns computadores " +
    "(políticas de segurança corporativas mais rígidas), o Windows pode bloquear a " +
    "primeira execução. Teste sempre no PC de destino antes de deixar em produção.",
);
