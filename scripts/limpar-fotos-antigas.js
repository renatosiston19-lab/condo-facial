// Remove a foto (base64) dos cadastros concluídos há mais de 5 dias.
// Uso: node scripts/limpar-fotos-antigas.js
require("dotenv/config");
const { Client } = require("pg");

const RETENCAO_FOTO_DIAS = 5;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query(
    `UPDATE "CadastroFacial"
     SET foto = NULL
     WHERE status = 'CONCLUIDO'
       AND foto IS NOT NULL
       AND "updatedAt" < now() - interval '${RETENCAO_FOTO_DIAS} days'`,
  );

  console.log(`Fotos removidas: ${res.rowCount}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
