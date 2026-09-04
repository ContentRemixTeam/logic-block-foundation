// deno-lint-ignore no-import-prefix
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  formValues,
  processScorecardPlannerWebhook,
  type ScorecardPlannerRpcArgs,
} from "./scorecardPlannerCommerceWebhook.ts";

const secret = "test-thrivecart-secret";

function officialStylePurchase() {
  return new URLSearchParams([
    ["event", "order.success"],
    ["mode", "live"],
    ["thrivecart_secret", secret],
    ["order_id", "1514394"],
    ["invoice_id", "000000004"],
    ["order_timestamp", "1788512400"],
    ["currency", "USD"],
    ["customer[email]", "BUYER@EXAMPLE.COM"],
    ["order[total]", "4900"],
    ["order[charges][0][item_type]", "product"],
    ["order[charges][0][reference]", "101"],
    ["order[charges][0][item_identifier]", "product_101"],
    ["order[charges][0][amount]", "900"],
    ["order[charges][0][type]", "single"],
    ["order[charges][0][payment_plan_id]", "201"],
    ["order[charges][1][item_type]", "upsell"],
    ["order[charges][1][reference]", "101"],
    ["order[charges][1][item_identifier]", "upsell_101"],
    ["order[charges][1][amount]", "4000"],
    ["order[charges][1][type]", "single"],
    ["transactions[product-101]", "txn-scorecard-1"],
    ["transactions[upsell-101]", "txn-planner-1"],
    ["purchase_map_flat", "product-101,upsell-101"],
  ]);
}

Deno.test("maps a $9 product and $40 Planner upsell as separate exact purchases", async () => {
  const params = officialStylePurchase();
  const calls: ScorecardPlannerRpcArgs[] = [];
  const result = await processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
    expectedSecret: secret,
    rpc: (args) => {
      calls.push(args);
      return Promise.resolve({ success: true, status: "active" });
    },
  });

  assertEquals(result.processed, 2);
  assertEquals(calls.map((call) => [call.p_product_id, call.p_price_id, call.p_amount_cents]), [
    ["product-101", "201", 900],
    ["upsell-101", "", 4000],
  ]);
  assertEquals(calls.map((call) => call.p_transaction_id), ["txn-scorecard-1", "txn-planner-1"]);
  assertEquals(calls[0].p_email, "buyer@example.com");
  assertEquals(calls[0].p_event_type, "purchase");
});

Deno.test("maps an official-style refund and leaves parent resolution to the ledger", async () => {
  const params = new URLSearchParams([
    ["event", "order.refund"],
    ["mode", "live"],
    ["thrivecart_secret", secret],
    ["order_id", "1514394"],
    ["invoice_id", "refund-4"],
    ["currency", "USD"],
    ["customer[email]", "buyer@example.com"],
    ["refund[type]", "upsell"],
    ["refund[id]", "101"],
    ["refund[amount]", "4000"],
  ]);
  const calls: ScorecardPlannerRpcArgs[] = [];
  await processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
    expectedSecret: secret,
    rpc: (args) => {
      calls.push(args);
      return Promise.resolve({ success: true, status: "refunded" });
    },
  });

  assertEquals(calls[0].p_transaction_id, null);
  assertEquals(calls[0].p_parent_transaction_id, null);
  assertEquals(calls[0].p_event_type, "refund");
  assertEquals(calls[0].p_product_id, "upsell-101");
  assertEquals(calls[0].p_price_id, "");
  assertEquals(calls[0].p_amount_cents, 4000);
});

Deno.test("maps an official-style subscription renewal without charge rows", async () => {
  const params = new URLSearchParams([
    ["event", "order.subscription_payment"],
    ["mode", "live"],
    ["event_id", "renewal-event-2"],
    ["thrivecart_secret", secret],
    ["order_id", "1514394"],
    ["invoice_id", "000000004-2"],
    ["currency", "USD"],
    ["customer[email]", "buyer@example.com"],
    ["subscription[type]", "upsell"],
    ["subscription[id]", "101"],
    ["subscription[amount]", "4900"],
  ]);
  const calls: ScorecardPlannerRpcArgs[] = [];
  await processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
    expectedSecret: secret,
    rpc: (args) => {
      calls.push(args);
      return Promise.resolve({ success: true, status: "active" });
    },
  });

  assertEquals(calls[0].p_event_type, "renewal");
  assertEquals(calls[0].p_product_id, "upsell-101");
  assertEquals(calls[0].p_price_id, "");
  assertEquals(calls[0].p_amount_cents, 4900);
  assertEquals(calls[0].p_transaction_id, "000000004-2");
  assertEquals(calls[0].p_effective_at, null);
});

Deno.test("maps official-style cancellation and resume events", async () => {
  const calls: ScorecardPlannerRpcArgs[] = [];
  for (const [providerEvent, expected] of [
    ["order.subscription_cancelled", "cancel_at_period_end"],
    ["order.subscription_resumed", "subscription_resumed"],
  ] as const) {
    const params = new URLSearchParams([
      ["event", providerEvent],
      ["mode", "live"],
      ["thrivecart_secret", secret],
      ["order_id", "1514394"],
      ["invoice_id", "000000004"],
      ["currency", "USD"],
      ["customer[email]", "buyer@example.com"],
      ["subscription[type]", "upsell"],
      ["subscription[id]", "101"],
    ]);
    await processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
      expectedSecret: secret,
      rpc: (args) => {
        calls.push(args);
        return Promise.resolve({ success: true, status: expected });
      },
    });
  }

  assertEquals(calls.map((call) => [call.p_event_type, call.p_product_id, call.p_price_id]), [
    ["cancel_at_period_end", "upsell-101", ""],
    ["subscription_resumed", "upsell-101", ""],
  ]);
  assertEquals(calls.map((call) => call.p_effective_at), [null, null]);
});

Deno.test("rejects an invalid account secret before any entitlement call", async () => {
  const params = officialStylePurchase();
  params.set("thrivecart_secret", "wrong");
  let calls = 0;
  await assertRejects(
    () => processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
      expectedSecret: secret,
      rpc: () => {
        calls += 1;
        return Promise.resolve({});
      },
    }),
    Error,
    "invalid_secret",
  );
  assertEquals(calls, 0);
});

Deno.test("rejects test-mode purchases by default", async () => {
  const params = officialStylePurchase();
  params.set("mode", "test");
  let calls = 0;
  await assertRejects(
    () => processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
      expectedSecret: secret,
      rpc: () => {
        calls += 1;
        return Promise.resolve({});
      },
    }),
    Error,
    "invalid_checkout_mode",
  );
  assertEquals(calls, 0);
});

Deno.test("rejects a paid event without a provider timestamp", async () => {
  const params = officialStylePurchase();
  params.delete("order_timestamp");
  let calls = 0;
  await assertRejects(
    () => processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
      expectedSecret: secret,
      rpc: () => {
        calls += 1;
        return Promise.resolve({});
      },
    }),
    Error,
    "invalid_event_timestamp",
  );
  assertEquals(calls, 0);
});

Deno.test("accepts official lifecycle payloads without a provider timestamp", async () => {
  const params = new URLSearchParams([
    ["event", "order.rebill_failed"],
    ["mode", "live"],
    ["thrivecart_secret", secret],
    ["order_id", "1514394"],
    ["invoice_id", "000000004"],
    ["currency", "USD"],
    ["customer[email]", "buyer@example.com"],
    ["subscription[type]", "upsell"],
    ["subscription[id]", "101"],
  ]);
  const calls: ScorecardPlannerRpcArgs[] = [];
  await processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
    expectedSecret: secret,
    rpc: (args) => {
      calls.push(args);
      return Promise.resolve({ success: true, status: "needs_review" });
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].p_event_type, "payment_failed");
  assertEquals(calls[0].p_effective_at, null);
});

Deno.test("rejects an invalid supplied lifecycle timestamp instead of falling back", async () => {
  const params = new URLSearchParams([
    ["event", "order.refund"],
    ["mode", "live"],
    ["thrivecart_secret", secret],
    ["order_id", "1514394"],
    ["invoice_id", "000000004"],
    ["order_timestamp", "not-a-timestamp"],
    ["customer[email]", "buyer@example.com"],
    ["refund[type]", "upsell"],
    ["refund[id]", "101"],
  ]);
  await assertRejects(
    () => processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
      expectedSecret: secret,
      rpc: () => Promise.resolve({}),
    }),
    Error,
    "invalid_event_timestamp",
  );
});

Deno.test("ignores unrelated account products without failing the catch-all webhook", async () => {
  const params = officialStylePurchase();
  const result = await processScorecardPlannerWebhook(formValues(params.entries()), params.toString(), {
    expectedSecret: secret,
    rpc: () => Promise.resolve({ success: false, status: "rejected_unmapped" }),
  });
  assertEquals(result, { processed: 0, ignored: 2, results: [] });
});

Deno.test("ignores abandoned carts and unknown catch-all event names", async () => {
  const abandoned = new URLSearchParams([
    ["event", "cart.abandoned"],
    ["thrivecart_secret", secret],
  ]);
  assertEquals(
    await processScorecardPlannerWebhook(formValues(abandoned.entries()), abandoned.toString(), {
      expectedSecret: secret,
      rpc: () => Promise.resolve({}),
    }),
    { processed: 0, ignored: 1, results: [] },
  );

  abandoned.set("event", "made.up");
  assertEquals(
    await processScorecardPlannerWebhook(formValues(abandoned.entries()), abandoned.toString(), {
      expectedSecret: secret,
      rpc: () => Promise.resolve({}),
    }),
    { processed: 0, ignored: 1, results: [] },
  );
});
