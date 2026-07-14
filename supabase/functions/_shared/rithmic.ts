import protobuf from "https://esm.sh/protobufjs@7.4.0";
import { encrypt, decrypt } from "./snaptrade.ts";

// Rithmic's R|Protocol API: WebSocket + Google Protocol Buffers, split into
// separate "plants" (order/history/ticker/pnl). We only need ORDER_PLANT for
// account discovery and past-fill sync. Message schemas below are the exact
// .proto definitions from Rithmic's own SDK (ported verbatim from the
// open-source async_rithmic Python client's protocol_buffers/source/*.proto
// — Rithmic doesn't publish these on their own docs site, but the field
// numbers are fixed wire-protocol constants, not implementation details, so
// porting them 1:1 from a working reference client is correct and safe).
// TLS: Rithmic's cert chains to the publicly-trusted USERTrust RSA CA, so a
// plain `wss://` connection works with no special certificate handling.
const PROTO_SOURCE = `
syntax = "proto3";
package rti;

message Base { int32 template_id = 154467; }

message RequestLogin {
  enum SysInfraType { SYSINFRATYPE_UNSPECIFIED = 0; TICKER_PLANT = 1; ORDER_PLANT = 2; HISTORY_PLANT = 3; PNL_PLANT = 4; REPOSITORY_PLANT = 5; }
  int32 template_id = 154467;
  string template_version = 153634;
  repeated string user_msg = 132760;
  string user = 131003;
  string password = 130004;
  string app_name = 130002;
  string app_version = 131803;
  string system_name = 153628;
  SysInfraType infra_type = 153621;
  repeated string mac_addr = 144108;
  string os_version = 144021;
  string os_platform = 144020;
  bool aggregated_quotes = 153644;
}
message ResponseLogin {
  int32 template_id = 154467;
  string template_version = 153634;
  repeated string user_msg = 132760;
  repeated string rp_code = 132766;
  string fcm_id = 154013;
  string ib_id = 154014;
  string country_code = 154712;
  string state_code = 154713;
  string unique_user_id = 153428;
  double heartbeat_interval = 153633;
}

message RequestRithmicSystemInfo { int32 template_id = 154467; repeated string user_msg = 132760; }
message ResponseRithmicSystemInfo {
  int32 template_id = 154467;
  repeated string user_msg = 132760;
  repeated string rp_code = 132766;
  repeated string system_name = 153628;
  repeated bool has_aggregated_quotes = 153649;
}

message RequestAccountList {
  enum UserType { USERTYPE_UNSPECIFIED = 0; USER_TYPE_FCM = 1; USER_TYPE_IB = 2; USER_TYPE_TRADER = 3; }
  int32 template_id = 154467;
  repeated string user_msg = 132760;
  string fcm_id = 154013;
  string ib_id = 154014;
  UserType user_type = 154036;
}
message ResponseAccountList {
  int32 template_id = 154467;
  repeated string user_msg = 132760;
  repeated string rq_handler_rp_code = 132764;
  repeated string rp_code = 132766;
  string fcm_id = 154013;
  string ib_id = 154014;
  string account_id = 154008;
  string account_name = 154002;
  string account_currency = 154383;
  string loss_limit = 154019;
  int32 account_creation_ssboe = 153171;
  int32 account_creation_usecs = 153172;
  string account_auto_liquidate = 131035;
  string auto_liq_threshold_current_value = 131040;
}

message RequestHeartbeat { int32 template_id = 154467; repeated string user_msg = 132760; int32 ssboe = 150100; int32 usecs = 150101; }
message ResponseHeartbeat { int32 template_id = 154467; repeated string user_msg = 132760; repeated string rp_code = 132766; int32 ssboe = 150100; int32 usecs = 150101; }

message RequestLogout { int32 template_id = 154467; repeated string user_msg = 132760; }
message ResponseLogout { int32 template_id = 154467; repeated string user_msg = 132760; repeated string rp_code = 132766; }

message Reject { int32 template_id = 154467; repeated string user_msg = 132760; repeated string rp_code = 132766; }
message ForcedLogout { int32 template_id = 154467; }

message RequestReplayExecutions {
  int32 template_id = 154467;
  repeated string user_msg = 132760;
  string fcm_id = 154013;
  string ib_id = 154014;
  string account_id = 154008;
  int32 start_index = 153002;
  int32 finish_index = 153003;
}
message ResponseReplayExecutions { int32 template_id = 154467; repeated string user_msg = 132760; repeated string rp_code = 132766; }

message RithmicOrderNotification {
  enum NotifyType { NOTIFYTYPE_UNSPECIFIED = 0; ORDER_RCVD_FROM_CLNT = 1; MODIFY_RCVD_FROM_CLNT = 2; CANCEL_RCVD_FROM_CLNT = 3; OPEN_PENDING = 4; MODIFY_PENDING = 5; CANCEL_PENDING = 6; ORDER_RCVD_BY_EXCH_GTWY = 7; MODIFY_RCVD_BY_EXCH_GTWY = 8; CANCEL_RCVD_BY_EXCH_GTWY = 9; ORDER_SENT_TO_EXCH = 10; MODIFY_SENT_TO_EXCH = 11; CANCEL_SENT_TO_EXCH = 12; OPEN = 13; MODIFIED = 14; COMPLETE = 15; MODIFICATION_FAILED = 16; CANCELLATION_FAILED = 17; TRIGGER_PENDING = 18; GENERIC = 19; LINK_ORDERS_FAILED = 20; }
  enum TransactionType { TRANSACTIONTYPE_UNSPECIFIED = 0; BUY = 1; SELL = 2; SS = 3; }
  int32 template_id = 154467;
  string user_tag = 154119;
  NotifyType notify_type = 153625;
  bool is_snapshot = 110121;
  string status = 110303;
  string basket_id = 110300;
  string fcm_id = 154013;
  string ib_id = 154014;
  string user_id = 131003;
  string account_id = 154008;
  string symbol = 110100;
  string exchange = 110101;
  int32 quantity = 112004;
  double price = 110306;
  TransactionType transaction_type = 112003;
  double avg_fill_price = 110322;
  int32 total_fill_size = 154111;
  int32 total_unfilled_size = 154112;
  string currency = 154382;
  int32 ssboe = 150100;
  int32 usecs = 150101;
}
`;

const root = protobuf.parse(PROTO_SOURCE).root;

const TEMPLATE_TYPE: Record<number, string> = {
  10: "RequestLogin", 11: "ResponseLogin",
  12: "RequestLogout", 13: "ResponseLogout",
  16: "RequestRithmicSystemInfo", 17: "ResponseRithmicSystemInfo",
  18: "RequestHeartbeat", 19: "ResponseHeartbeat",
  75: "Reject", 77: "ForcedLogout",
  302: "RequestAccountList", 303: "ResponseAccountList",
  351: "RithmicOrderNotification",
  3506: "RequestReplayExecutions", 3507: "ResponseReplayExecutions",
};
const TYPE_TEMPLATE: Record<string, number> = Object.fromEntries(Object.entries(TEMPLATE_TYPE).map(([k, v]) => [v, Number(k)]));

const BaseType = root.lookupType("rti.Base");

function encodeMessage(typeName: string, payload: Record<string, unknown>): Uint8Array {
  const type = root.lookupType(`rti.${typeName}`);
  const message = type.create({ ...payload, template_id: TYPE_TEMPLATE[typeName] });
  return type.encode(message).finish();
}

function decodeMessage(data: Uint8Array): { type: string; message: Record<string, unknown> } | null {
  const templateId = (BaseType.decode(data) as unknown as { template_id: number }).template_id;
  const typeName = TEMPLATE_TYPE[templateId];
  if (!typeName) return null;
  const type = root.lookupType(`rti.${typeName}`);
  return { type: typeName, message: type.toObject(type.decode(data), { longs: Number, defaults: true }) };
}

export type RithmicCredentials = {
  gateway: string;
  systemName: string;
  username: string;
  password: string;
  appName: string;
  appVersion: string;
};

export type RithmicSession = { ws: WebSocket; fcmId: string; ibId: string };

function gatewayUrl(gateway: string): string {
  return gateway.includes("://") ? gateway : `wss://${gateway}`;
}

async function waitFor(ws: WebSocket, predicate: (m: { type: string; message: Record<string, unknown> }) => boolean, timeoutMs = 15000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.removeEventListener("message", onMessage); reject(new Error("Rithmic request timed out")); }, timeoutMs);
    function onMessage(ev: MessageEvent) {
      const bytes = new Uint8Array(ev.data instanceof ArrayBuffer ? ev.data : ev.data);
      const decoded = decodeMessage(bytes);
      if (!decoded) return;
      if (decoded.type === "Reject") {
        clearTimeout(timer); ws.removeEventListener("message", onMessage);
        reject(new Error(`Rithmic rejected the request: ${(decoded.message.user_msg as string[] ?? []).join("; ") || (decoded.message.rp_code as string[] ?? []).join(",")}`));
        return;
      }
      if (predicate(decoded)) { clearTimeout(timer); ws.removeEventListener("message", onMessage); resolve(decoded.message); }
    }
    ws.addEventListener("message", onMessage);
  });
}

// Collects streamed messages of `collectType` until `terminalType` arrives (or the
// connection goes quiet for `quietMs`, since Rithmic's exact stream-end semantics
// for some request types aren't publicly documented and this needs live verification).
async function collectUntil(ws: WebSocket, collectType: string, terminalType: string, quietMs = 3000, hardTimeoutMs = 20000): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const collected: Record<string, unknown>[] = [];
    let quiet: ReturnType<typeof setTimeout>;
    const hard = setTimeout(() => { cleanup(); resolve(collected); }, hardTimeoutMs);
    function resetQuiet() { clearTimeout(quiet); quiet = setTimeout(() => { cleanup(); resolve(collected); }, quietMs); }
    function cleanup() { clearTimeout(hard); clearTimeout(quiet); ws.removeEventListener("message", onMessage); }
    function onMessage(ev: MessageEvent) {
      const bytes = new Uint8Array(ev.data instanceof ArrayBuffer ? ev.data : ev.data);
      const decoded = decodeMessage(bytes);
      if (!decoded) return;
      if (decoded.type === "Reject") { cleanup(); reject(new Error(`Rithmic rejected the request: ${(decoded.message.user_msg as string[] ?? []).join("; ")}`)); return; }
      if (decoded.type === collectType) { collected.push(decoded.message); resetQuiet(); }
      else if (decoded.type === terminalType) { cleanup(); resolve(collected); }
    }
    ws.addEventListener("message", onMessage);
    resetQuiet();
  });
}

export async function rithmicConnect(credentials: RithmicCredentials): Promise<RithmicSession> {
  const ws = new WebSocket(gatewayUrl(credentials.gateway));
  ws.binaryType = "arraybuffer";
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("Could not connect to the Rithmic gateway")), { once: true });
  });

  ws.send(encodeMessage("RequestLogin", {
    template_version: "3.9",
    user: credentials.username,
    password: credentials.password,
    app_name: credentials.appName,
    app_version: credentials.appVersion,
    system_name: credentials.systemName,
    infra_type: 2, // ORDER_PLANT
  }));
  const loginResponse = await waitFor(ws, (m) => m.type === "ResponseLogin");
  return { ws, fcmId: String(loginResponse.fcm_id ?? ""), ibId: String(loginResponse.ib_id ?? "") };
}

export async function rithmicDisconnect(session: RithmicSession): Promise<void> {
  try {
    session.ws.send(encodeMessage("RequestLogout", {}));
    await waitFor(session.ws, (m) => m.type === "ResponseLogout", 3000).catch(() => {});
  } finally {
    session.ws.close();
  }
}

export async function rithmicListAccounts(session: RithmicSession): Promise<{ account_id: string; account_name?: string; account_currency?: string }[]> {
  session.ws.send(encodeMessage("RequestAccountList", { fcm_id: session.fcmId, ib_id: session.ibId, user_type: 3 }));
  const accounts = await collectUntil(session.ws, "ResponseAccountList", "__never__", 1500, 8000);
  return accounts
    .filter((a) => a.account_id)
    .map((a) => ({ account_id: String(a.account_id), account_name: a.account_name as string | undefined, account_currency: a.account_currency as string | undefined }));
}

export async function rithmicReplayExecutions(session: RithmicSession, accountId: string): Promise<Record<string, unknown>[]> {
  session.ws.send(encodeMessage("RequestReplayExecutions", {
    fcm_id: session.fcmId, ib_id: session.ibId, account_id: accountId,
    start_index: 0, finish_index: -1,
  }));
  return collectUntil(session.ws, "RithmicOrderNotification", "ResponseReplayExecutions", 2000, 25000);
}

export async function encryptRithmicCredentials(c: RithmicCredentials) {
  return {
    gateway: c.gateway, system_name: c.systemName, app_name: c.appName, app_version: c.appVersion,
    username_ciphertext: await encrypt(c.username),
    password_ciphertext: await encrypt(c.password),
  };
}
export async function decryptRithmicCredentials(row: { gateway: string; system_name: string; app_name: string; app_version: string; username_ciphertext: string; password_ciphertext: string }): Promise<RithmicCredentials> {
  return {
    gateway: row.gateway, systemName: row.system_name, appName: row.app_name, appVersion: row.app_version,
    username: await decrypt(row.username_ciphertext),
    password: await decrypt(row.password_ciphertext),
  };
}
