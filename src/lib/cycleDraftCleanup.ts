export async function clearCycleDraftAfterReceipt(
  deleteCloudDraft: () => Promise<{ data: unknown; error: unknown | null }>,
  isExpectedCloudReceipt: (data: unknown) => boolean,
  clearBrowserDraftConditionally: () => boolean,
): Promise<void> {
  const { data, error } = await deleteCloudDraft();
  if (error || !isExpectedCloudReceipt(data)) {
    throw new Error('The draft changed or cloud cleanup could not be verified. Recovery was preserved; reload before trying again.');
  }
  if (!clearBrowserDraftConditionally()) {
    throw new Error('A newer browser draft appeared while cleanup was running. Recovery was preserved; reload before trying again.');
  }
}
