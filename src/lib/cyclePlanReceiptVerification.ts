export interface VerifiableCyclePlanReceipt {
  planner_receipt_id: string;
  request_id: string;
  logical_plan_id: string;
  logical_plan_key: string;
  cycle_id: string;
  payload_hash: string;
  content_hash: string;
  version: number;
}

export function cyclePlanReceiptMatchesReadback(
  receipt: VerifiableCyclePlanReceipt,
  data: Record<string, unknown> | null | undefined,
): boolean {
  const storedReceipt = data?.receipt as Record<string, unknown> | undefined;
  return !(data?.status !== 'complete'
    || data?.request_id !== receipt.request_id
    || data?.plan_id !== receipt.logical_plan_id
    || data?.planner_receipt_id !== receipt.planner_receipt_id
    || data?.cycle_id !== receipt.cycle_id
    || data?.payload_hash !== receipt.payload_hash
    || data?.content_hash !== receipt.content_hash
    || data?.resulting_version !== receipt.version
    || storedReceipt?.planner_receipt_id !== receipt.planner_receipt_id
    || storedReceipt?.request_id !== receipt.request_id
    || storedReceipt?.logical_plan_id !== receipt.logical_plan_id
    || storedReceipt?.logical_plan_key !== receipt.logical_plan_key
    || storedReceipt?.cycle_id !== receipt.cycle_id
    || storedReceipt?.payload_hash !== receipt.payload_hash
    || storedReceipt?.content_hash !== receipt.content_hash
    || storedReceipt?.version !== receipt.version);
}
