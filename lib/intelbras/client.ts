import { digestFetch } from "./digest";

export interface IntelbrasDevice {
  ip: string;
  usuario: string;
  senha: string;
  canalPorta: number;
}

export interface IntelbrasCallResult {
  httpStatus: number;
  body: unknown;
}

export class IntelbrasError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "IntelbrasError";
  }
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

async function callCgi(
  device: IntelbrasDevice,
  path: string,
  body?: unknown,
): Promise<IntelbrasCallResult> {
  const url = `http://${device.ip}${path}`;
  const response = await digestFetch(
    url,
    {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
    { username: device.usuario, password: device.senha },
  );

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Some Dahua CGI endpoints return plain "OK"/key=value text instead of JSON.
  }

  if (!response.ok) {
    throw new IntelbrasError(
      `Equipamento respondeu ${response.status} em ${path}`,
      response.status,
      parsed,
    );
  }

  return { httpStatus: response.status, body: parsed };
}

/**
 * Cria (ou atualiza, se já existir) o usuário no equipamento.
 * Baseado em AccessUser.cgi?action=insertMulti (collection Postman Intelbras Bio-T).
 *
 * NOTA: o formato exato de sucesso/erro no corpo da resposta não estava
 * documentado na collection — validar contra o equipamento real e ajustar
 * `isSuccessBody` abaixo se necessário.
 */
export async function createUser(
  device: IntelbrasDevice,
  params: { userId: string; userName: string; validFrom?: Date; validTo?: Date },
): Promise<IntelbrasCallResult> {
  const validFrom = params.validFrom ?? new Date();
  const validTo = params.validTo ?? new Date(validFrom.getFullYear() + 10, validFrom.getMonth(), validFrom.getDate());

  return callCgi(device, "/cgi-bin/AccessUser.cgi?action=insertMulti", {
    UserList: [
      {
        UserID: params.userId,
        UserName: params.userName,
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

/**
 * Envia a foto facial (JPEG em base64, sem o prefixo "data:image/...;base64,")
 * para o usuário já criado no equipamento.
 * Baseado em AccessFace.cgi?action=insertMulti.
 */
export async function addFace(
  device: IntelbrasDevice,
  params: { userId: string; photoBase64: string },
): Promise<IntelbrasCallResult> {
  return callCgi(device, "/cgi-bin/AccessFace.cgi?action=insertMulti", {
    FaceList: [
      {
        UserID: params.userId,
        PhotoData: [params.photoBase64],
      },
    ],
  });
}

/** Confirma que o equipamento está acessível e as credenciais são válidas. */
export async function pingDevice(device: IntelbrasDevice): Promise<IntelbrasCallResult> {
  return callCgi(device, "/cgi-bin/magicBox.cgi?action=getSoftwareVersion");
}

/** Remove a biometria facial do usuário no equipamento (AccessFace.cgi?action=removeMulti). */
export async function removeFace(device: IntelbrasDevice, userId: string): Promise<IntelbrasCallResult> {
  return callCgi(
    device,
    `/cgi-bin/AccessFace.cgi?action=removeMulti&UserIDList[0]=${encodeURIComponent(userId)}`,
  );
}

/** Remove o usuário do equipamento (AccessUser.cgi?action=removeMulti). */
export async function removeUser(device: IntelbrasDevice, userId: string): Promise<IntelbrasCallResult> {
  return callCgi(
    device,
    `/cgi-bin/AccessUser.cgi?action=removeMulti&UserIDList[0]=${encodeURIComponent(userId)}`,
  );
}
