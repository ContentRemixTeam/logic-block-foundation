export type ScorecardPlannerRpcArgs = {
  p_provider: string;
  p_event_id: string;
  p_email: string;
  p_event_type: string;
  p_product_id: string;
  p_price_id: string;
  p_order_id: string | null;
  p_transaction_id: string | null;
  p_parent_transaction_id: string | null;
  p_currency: string | null;
  p_amount_cents: number | null;
  p_effective_at: string;
  p_access_expires_at: string | null;
  p_payload_sha256: string;
};

export type ScorecardPlannerWebhookDependencies = {
  expectedSecret: string;
  rpc: (args: ScorecardPlannerRpcArgs) => Promise<Record<string, unknown>>;
};

type FormValues = Map<string, string[]>;
type Charge = Record<string, string>;

const EVENT_TYPES: Record<string, string | null> = {
  "order.success": "purchase",
  "order.subscription_payment": "renewal",
  "order.refund": "refund",
  "order.subscription_cancelled": "cancel_at_period_end",
  "order.subscription_paused": "subscription_paused",
  "order.subscription_resumed": "subscription_resumed",
  "order.rebill_failed": "payment_failed",
  "cart.abandoned": null,
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function first(values: FormValues, ...keys: string[]): string {
  for (const key of keys) {
    const value = values.get(key)?.find((candidate) => clean(candidate));
    if (value) return clean(value);
  }
  return "";
}

function normalizeItemKey(value: string): string {
  return clean(value).toLowerCase().replaceAll("_", "-");
}

function splitItems(value: string): string[] {
  return [...new Set(value.split(",").map(normalizeItemKey).filter(Boolean))];
}

function parseInteger(value: string): number | null {
  if (!/^-?\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isoDate(values: FormValues): string {
  const timestamp = parseInteger(first(values, "order_timestamp", "order[date_unix]", "timestamp"));
  if (timestamp !== null && timestamp > 0) return new Date(timestamp * 1000).toISOString();
  const supplied = first(values, "order_date", "order[date]", "date");
  const milliseconds = Date.parse(supplied);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : new Date().toISOString();
}

function readCharges(values: FormValues): Charge[] {
  const charges = new Map<number, Charge>();
  for (const [key, entries] of values) {
    const match = key.match(/^order\[charges\]\[(\d+)]\[([^\]]+)]$/);
    if (!match) continue;
    const index = Number(match[1]);
    const charge = charges.get(index) ?? {};
    charge[match[2]] = clean(entries[0]);
    charges.set(index, charge);
  }
  return [...charges.entries()].sort(([left], [right]) => left - right).map(([, charge]) => charge);
}

function keyForCharge(charge: Charge): string {
  if (charge.item_identifier) return normalizeItemKey(charge.item_identifier);
  if (charge.item_type && charge.reference) return normalizeItemKey(`${charge.item_type}-${charge.reference}`);
  return "";
}

function transactionFor(values: FormValues, itemKey: string): string {
  const alternate = itemKey.replaceAll("-", "_");
  return first(
    values,
    `transactions[${itemKey}]`,
    `transactions[${alternate}]`,
    "transaction_id",
    "transaction[id]",
    "charge_id",
  );
}

function parentTransactionFor(values: FormValues, itemKey: string): string {
  const alternate = itemKey.replaceAll("-", "_");
  return first(
    values,
    `parent_transactions[${itemKey}]`,
    `parent_transactions[${alternate}]`,
    "parent_transaction_id",
    "original_transaction_id",
  );
}

function eventItem(values: FormValues, prefix: "subscription" | "refund"): string {
  const type = first(values, `${prefix}[type]`);
  const id = first(values, `${prefix}[id]`);
  return type && id ? normalizeItemKey(`${type}-${id}`) : "";
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const size = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < size; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function formValues(entries: Iterable<[string, string]>): FormValues {
  const values: FormValues = new Map();
  for (const [key, value] of entries) {
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  return values;
}

export async function processScorecardPlannerWebhook(
  values: FormValues,
  rawPayload: string,
  dependencies: ScorecardPlannerWebhookDependencies,
): Promise<{ processed: number; ignored: number; results: Record<string, unknown>[] }> {
  const providedSecret = first(values, "thrivecart_secret");
  if (!providedSecret || !dependencies.expectedSecret || !constantTimeEqual(providedSecret, dependencies.expectedSecret)) {
    throw new Error("invalid_secret");
  }

  const providerEvent = first(values, "event").toLowerCase();
  if (!(providerEvent in EVENT_TYPES)) return { processed: 0, ignored: 1, results: [] };
  const eventType = EVENT_TYPES[providerEvent];
  if (!eventType) return { processed: 0, ignored: 1, results: [] };

  const email = first(values, "customer[email]", "email").toLowerCase();
  if (!email.includes("@")) throw new Error("missing_customer_email");

  const orderId = first(values, "order_id", "subscription_id", "invoice_id");
  const currency = first(values, "currency", "order[currency]").toUpperCase() || null;
  const effectiveAt = isoDate(values);
  const payloadHash = await sha256Hex(rawPayload);
  const charges = readCharges(values);
  const purchaseMap = splitItems(first(values, "purchase_map_flat"));
  const fallbackItem = normalizeItemKey(first(values, "item_identifier", "purchase_map[0]"));
  const lifecycleItem = eventItem(values, providerEvent === "order.refund" ? "refund" : "subscription");
  const itemKeys = purchaseMap.length
    ? purchaseMap
    : fallbackItem
    ? [fallbackItem]
    : lifecycleItem
    ? [lifecycleItem]
    : [...new Set(charges.map(keyForCharge).filter(Boolean))];
  if (!itemKeys.length) throw new Error("missing_purchase_items");

  const results: Record<string, unknown>[] = [];
  let ignored = 0;
  for (const itemKey of itemKeys) {
    const itemCharges = charges.filter((charge) => keyForCharge(charge) === itemKey);
    const paidCharge = itemCharges.find((charge) => charge.type === "single") ?? itemCharges[0];
    // Renewal/refund/cancellation events do not always include the payment
    // plan ID. The database resolves an empty value against the original
    // paid event for this order and product.
    const priceId = clean(paidCharge?.payment_plan_id) || first(values, "subscription[payment_plan_id]");
    const transactionId = transactionFor(values, itemKey);
    const parentTransactionId = parentTransactionFor(values, itemKey);
    const lifecycle = ["refund", "chargeback", "cancel_at_period_end", "expiration"].includes(eventType);
    const paid = ["purchase", "renewal"].includes(eventType);
    const amount = parseInteger(clean(paidCharge?.amount) || first(
      values,
      "subscription[amount]",
      "refund[amount]",
      "order[total]",
      "total",
    ));
    const baseEventId = first(values, "event_id", "webhook_id", "invoice_id", "order_id", "subscription_id") || await sha256Hex(`${providerEvent}|${rawPayload}`);
    const args: ScorecardPlannerRpcArgs = {
      p_provider: "thrivecart",
      p_event_id: `${providerEvent}:${baseEventId}:${itemKey}`.slice(0, 200),
      p_email: email,
      p_event_type: eventType,
      p_product_id: itemKey,
      p_price_id: priceId,
      p_order_id: orderId || null,
      p_transaction_id: paid ? transactionId || first(values, "invoice_id") || null : null,
      p_parent_transaction_id: lifecycle ? parentTransactionId || null : null,
      p_currency: currency,
      p_amount_cents: amount,
      p_effective_at: effectiveAt,
      p_access_expires_at: first(values, "access_expires_at", "subscription[next_payment_date]") || null,
      p_payload_sha256: payloadHash,
    };

    const result = await dependencies.rpc(args);
    if (result.status === "rejected_unmapped") {
      ignored += 1;
      continue;
    }
    results.push(result);
  }

  return { processed: results.length, ignored, results };
}
