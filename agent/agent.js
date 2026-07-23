// Agente local — Infra Monitoramento
//
// Programa standalone (sem depender do projeto Next.js) que roda no computador
// da portaria, na mesma rede do(s) equipamento(s) Intelbras. Ele consulta
// periodicamente a nuvem por cadastros faciais pendentes deste condomínio e,
// para cada um, fala diretamente com o equipamento (que só é alcançável
// localmente), reportando o resultado de volta.
//
// Configuração: arquivo "agent-config.json" na mesma pasta deste programa,
// com o formato: { "apiUrl": "https://...", "agentToken": "...", "pollIntervalMs": 15000 }

const fs = require("fs");
const path = require("path");
const { createHash, randomBytes } = require("crypto");

function getBaseDir() {
  try {
    const sea = require("node:sea");
    if (sea.isSea()) return path.dirname(process.execPath);
  } catch {
    // "node:sea" não existe ou não está rodando como executável empacotado.
  }
  return __dirname;
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(getBaseDir(), "agent.log"), line + "\n");
  } catch {
    // Se não conseguir escrever o log em arquivo, segue só com o console.
  }
}

function loadConfig() {
  const configPath = path.join(getBaseDir(), "agent-config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Arquivo de configuração não encontrado: ${configPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!raw.apiUrl || !raw.agentToken) {
    throw new Error('agent-config.json precisa ter "apiUrl" e "agentToken".');
  }
  return {
    apiUrl: raw.apiUrl.replace(/\/$/, ""),
    agentToken: raw.agentToken,
    pollIntervalMs: raw.pollIntervalMs ?? 15000,
  };
}

// ---- Digest Auth (RFC 2617) para falar com o equipamento Intelbras ----

function md5(input) {
  return createHash("md5").update(input).digest("hex");
}

function parseWwwAuthenticate(header) {
  const scheme = header.split(" ")[0];
  const params = {};
  const rest = header.slice(scheme.length).trim();
  const re = /(\w+)=(?:"([^"]*)"|([^,\s]+))/g;
  let match;
  while ((match = re.exec(rest)) !== null) {
    params[match[1]] = match[2] ?? match[3];
  }
  return params;
}

function buildAuthorizationHeader({ username, password, method, uri, challenge }) {
  const nc = "00000001";
  const cnonce = randomBytes(8).toString("hex");
  const { realm, nonce, qop, opaque, algorithm } = challenge;

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  const parts = [
    `username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
  ];
  if (algorithm) parts.push(`algorithm=${algorithm}`);
  if (qop) {
    parts.push(`qop=${qop}`);
    parts.push(`nc=${nc}`);
    parts.push(`cnonce="${cnonce}"`);
  }
  if (opaque) parts.push(`opaque="${opaque}"`);

  return `Digest ${parts.join(", ")}`;
}

async function digestCall(device, path_, body) {
  const url = `http://${device.ip}${path_}`;
  const uri = new URL(url).pathname + new URL(url).search;
  const method = body ? "POST" : "GET";

  const first = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (first.status !== 401) {
    if (!first.ok) throw new Error(`Equipamento respondeu ${first.status} em ${path_}`);
    return first.text();
  }

  const wwwAuth = first.headers.get("www-authenticate");
  if (!wwwAuth) throw new Error("Equipamento retornou 401 sem cabeçalho WWW-Authenticate.");
  const challenge = parseWwwAuthenticate(wwwAuth);
  const authorization = buildAuthorizationHeader({
    username: device.usuario,
    password: device.senha,
    method,
    uri,
    challenge,
  });

  const second = await fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!second.ok) throw new Error(`Equipamento respondeu ${second.status} em ${path_}`);
  return second.text();
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

async function createUserOnDevice(device, { userId, userName }) {
  const validFrom = new Date();
  const validTo = new Date(validFrom.getFullYear() + 10, validFrom.getMonth(), validFrom.getDate());
  await digestCall(device, "/cgi-bin/AccessUser.cgi?action=insertMulti", {
    UserList: [
      {
        UserID: userId,
        UserName: userName,
        UserType: 0,
        UserStatus: 0,
        Doors: [device.canalPorta - 1],
        TimeSections: [255],
        ValidFrom: formatDate(validFrom),
        ValidTo: formatDate(validTo),
      },
    ],
  });
}

async function addFaceOnDevice(device, { userId, photoBase64 }) {
  await digestCall(device, "/cgi-bin/AccessFace.cgi?action=insertMulti", {
    FaceList: [{ UserID: userId, PhotoData: [photoBase64] }],
  });
}

// ---- Comunicação com a nuvem ----

async function buscarJobsPendentes(config) {
  const res = await fetch(`${config.apiUrl}/api/agent/jobs`, {
    headers: { Authorization: `Bearer ${config.agentToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao buscar cadastros pendentes (status ${res.status})`);
  const data = await res.json();
  return data.jobs ?? [];
}

async function reportarResultado(config, jobId, status, erro) {
  await fetch(`${config.apiUrl}/api/agent/jobs/${jobId}/result`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.agentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status, erro }),
  });
}

async function processarJob(config, job) {
  try {
    await createUserOnDevice(job.dispositivo, { userId: job.userId, userName: job.userName });
    await addFaceOnDevice(job.dispositivo, { userId: job.userId, photoBase64: job.photoBase64 });
    await reportarResultado(config, job.id, "CONCLUIDO");
    log(`Cadastro concluído: ${job.userName} (UserID ${job.userId})`);
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido ao comunicar com o equipamento.";
    await reportarResultado(config, job.id, "ERRO", mensagem);
    log(`Falha ao cadastrar ${job.userName} (UserID ${job.userId}): ${mensagem}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = loadConfig();
  log(`Agente iniciado. Consultando ${config.apiUrl} a cada ${config.pollIntervalMs}ms.`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const jobs = await buscarJobsPendentes(config);
      if (jobs.length > 0) log(`${jobs.length} cadastro(s) pendente(s) encontrado(s).`);
      for (const job of jobs) {
        await processarJob(config, job);
      }
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro desconhecido.";
      log(`Erro no ciclo de consulta: ${mensagem}`);
    }
    await sleep(config.pollIntervalMs);
  }
}

main().catch((err) => {
  log(`Erro fatal: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
