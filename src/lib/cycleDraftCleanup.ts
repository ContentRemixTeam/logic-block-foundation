export async function clearCycleDraftAfterReceipt(
  deleteCloudDraft: () => Promise<{ error: unknown | null }>,
  clearBrowserDraft: () => void,
): Promise<void> {
  const { error } = await deleteCloudDraft();
  if (error) {
    throw new Error('Your plan was saved, but the draft could not be cleared yet. Retry to verify cleanup.');
  }
  clearBrowserDraft();
}
