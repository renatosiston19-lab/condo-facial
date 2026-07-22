// Uso: node scripts/create-manutencao-user.js <usuario> <senha>
require("dotenv/config");
const { randomUUID } = require("crypto");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Uso: node scripts/create-manutencao-user.js <usuario> <senha>");
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const passwordHash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO "User" (id, username, "passwordHash", role, "createdAt")
     VALUES ($1, $2, $3, 'MANUTENCAO', now())
     ON CONFLICT (username) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash"`,
    [randomUUID(), username, passwordHash],
  );

  console.log(`Usuário de manutenção "${username}" criado/atualizado com sucesso.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
