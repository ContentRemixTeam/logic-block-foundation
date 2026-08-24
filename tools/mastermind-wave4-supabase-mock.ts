type Result = { data: unknown; error: unknown };
const calls: Array<{ kind: 'rpc' | 'function'; name: string; body: Record<string, unknown> }> = [];
const queues = new Map<string, Result[]>();

export const __wave4Mock = {
  calls,
  reset() { calls.splice(0); queues.clear(); },
  enqueue(name: string, result: Result) {
    const queue = queues.get(name) ?? [];
    queue.push(result);
    queues.set(name, queue);
  },
  count(name: string) { return calls.filter((call) => call.name === name).length; },
  bodies(name: string) { return calls.filter((call) => call.name === name).map((call) => call.body); },
};

const next = (name: string): Promise<Result> => {
  const result = queues.get(name)?.shift();
  if (!result) return Promise.resolve({ data: null, error: { message: `No mock queued for ${name}` } });
  return Promise.resolve(result);
};

export const supabase = {
  rpc(name: string, body: Record<string, unknown>) {
    calls.push({ kind: 'rpc', name, body });
    return next(name);
  },
  functions: {
    invoke(name: string, options: { body: Record<string, unknown> }) {
      calls.push({ kind: 'function', name, body: options.body });
      return next(name);
    },
  },
};
