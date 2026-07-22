import { createHash, randomBytes } from "crypto";

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

function parseWwwAuthenticate(header: string): Record<string, string> {
  const scheme = header.split(" ")[0];
  if (scheme?.toLowerCase() !== "digest") {
    throw new Error(`Esquema de autenticação não suportado: ${scheme}`);
  }

  const params: Record<string, string> = {};
  const rest = header.slice(scheme.length).trim();
  const re = /(\w+)=(?:"([^"]*)"|([^,\s]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rest)) !== null) {
    params[match[1]] = match[2] ?? match[3];
  }
  return params;
}

function buildAuthorizationHeader(params: {
  username: string;
  password: string;
  method: string;
  uri: string;
  challenge: Record<string, string>;
  nc?: string;
}): string {
  const { username, password, method, uri, challenge } = params;
  const nc = params.nc ?? "00000001";
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

export interface DigestCredentials {
  username: string;
  password: string;
}

/**
 * Performs an HTTP request against a Dahua/Intelbras CGI endpoint that uses
 * HTTP Digest Auth. Does the initial 401 handshake and retries once with the
 * computed Authorization header, per RFC 2617.
 */
export async function digestFetch(
  url: string,
  init: RequestInit,
  credentials: DigestCredentials,
): Promise<Response> {
  const method = init.method ?? "GET";
  const uri = new URL(url).pathname + new URL(url).search;

  const firstAttempt = await fetch(url, { ...init, headers: { ...init.headers } });
  if (firstAttempt.status !== 401) {
    return firstAttempt;
  }

  const wwwAuthenticate = firstAttempt.headers.get("www-authenticate");
  if (!wwwAuthenticate) {
    throw new Error("Equipamento retornou 401 sem cabeçalho WWW-Authenticate.");
  }

  const challenge = parseWwwAuthenticate(wwwAuthenticate);
  const authorization = buildAuthorizationHeader({
    username: credentials.username,
    password: credentials.password,
    method,
    uri,
    challenge,
  });

  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: authorization },
  });
}
