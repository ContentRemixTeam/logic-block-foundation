type Invocation = { body?: Record<string, unknown> };
type ResponseValue = unknown | Promise<unknown>;

const queues = new Map<string, ResponseValue[]>();
const calls = new Map<string, Invocation[]>();

export const __vaultMock = {
  reset() { queues.clear(); calls.clear(); },
  enqueue(name: string, value: ResponseValue) { queues.set(name, [...(queues.get(name) ?? []), value]); },
  count(name: string) { return calls.get(name)?.length ?? 0; },
  lastBody(name: string) { return calls.get(name)?.at(-1)?.body ?? {}; },
};

export const supabase = {
  functions: {
    async invoke(name: string, options: Invocation = {}) {
      calls.set(name, [...(calls.get(name) ?? []), options]);
      const queue = queues.get(name) ?? [];
      if (!queue.length) throw new Error(`No mocked response queued for ${name}`);
      const value = queue.shift();
      queues.set(name, queue);
      return await value;
    },
  },
};
