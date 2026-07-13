import { encrypt, decrypt } from "./snaptrade.ts";

export type TradovateEnvironment = "live" | "demo";

export type TradovateCredentials = {
  environment: TradovateEnvironment;
  username: string;
  password: string;
  appId: string;
  appVersion: string;
  cid: string;
  sec: string;
};

type TradovateAccount = { id: number; name?: string; nickname?: string; accountSpec?: string; active?: boolean; archived?: boolean };
type TradovateExecutionReport = {
  id: number; accountId: number; contractId?: number; timestamp?: string; tradeDate?: string;
  action?: string; side?: string; buyQty?: number; sellQty?: number; qty?: number; price?: number; commission?: number; fees?: number;
};
type TradovateContract = { id: number; name?: string };

// Base URLs, /auth/accesstokenrequest body shape, and Bearer-token flow confirmed
// against Tradovate's published Partner API docs.
const baseUrl = (environment: TradovateEnvironment) =>
  environment === "demo" ? "https://demo.tradovateapi.com/v1" : "https://live.tradovateapi.com/v1";

function tryJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

async function request<T>(environment: TradovateEnvironment, path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl(environment)}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? tryJson(text) : null;
  if (!res.ok) {
    throw new Error(`Tradovate request failed (${res.status}): ${typeof body === "string" ? body : JSON.stringify(body ?? text)}`);
  }
  return body as T;
}

export async function createTradovateAccessToken(credentials: TradovateCredentials): Promise<string> {
  const deviceId = `z1vault-${credentials.cid.slice(0, 8)}`;
  const res = await request<{ accessToken?: string; token?: string; errorText?: string }>(
    credentials.environment, "/auth/accesstokenrequest", null,
    {
      method: "POST",
      body: JSON.stringify({
        name: credentials.username, password: credentials.password, appId: credentials.appId,
        appVersion: credentials.appVersion, cid: credentials.cid, sec: credentials.sec, deviceId,
      }),
    },
  );
  const token = res.accessToken ?? res.token;
  if (!token) throw new Error(res.errorText || "Tradovate did not return an access token");
  return token;
}

export async function listTradovateAccounts(credentials: TradovateCredentials) {
  const token = await createTradovateAccessToken(credentials);
  const accounts = await request<TradovateAccount[]>(credentials.environment, "/account/list", token);
  return { token, accounts: accounts.filter((a) => a.active !== false && !a.archived) };
}

export async function listTradovateExecutions(credentials: TradovateCredentials, token: string, accountId: number) {
  const start = new Date(Date.now() - 90 * 86400 * 1000).toISOString();
  return request<TradovateExecutionReport[]>(
    credentials.environment,
    `/executionReport/list?accountId=${accountId}&startTimestamp=${encodeURIComponent(start)}`,
    token,
  );
}

export async function getTradovateContracts(credentials: TradovateCredentials, token: string, contractIds: number[]) {
  const ids = [...new Set(contractIds.filter(Boolean))];
  if (!ids.length) return new Map<number, TradovateContract>();
  const contracts = await request<TradovateContract[]>(credentials.environment, `/contract/items?ids=${ids.join(",")}`, token);
  return new Map(contracts.map((c) => [c.id, c]));
}

export async function encryptTradovateCredentials(c: TradovateCredentials) {
  return {
    environment: c.environment,
    username_ciphertext: await encrypt(c.username),
    password_ciphertext: await encrypt(c.password),
    app_id_ciphertext: await encrypt(c.appId),
    app_version: c.appVersion,
    cid_ciphertext: await encrypt(c.cid),
    sec_ciphertext: await encrypt(c.sec),
  };
}

export async function decryptTradovateCredentials(row: {
  environment: string; username_ciphertext: string; password_ciphertext: string;
  app_id_ciphertext: string; app_version: string; cid_ciphertext: string; sec_ciphertext: string;
}): Promise<TradovateCredentials> {
  return {
    environment: row.environment === "demo" ? "demo" : "live",
    username: await decrypt(row.username_ciphertext),
    password: await decrypt(row.password_ciphertext),
    appId: await decrypt(row.app_id_ciphertext),
    appVersion: row.app_version || "1.0",
    cid: await decrypt(row.cid_ciphertext),
    sec: await decrypt(row.sec_ciphertext),
  };
}
