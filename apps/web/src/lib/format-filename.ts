/**
 * Formats uploaded document filenames for customer-facing screens.
 * Ensures internal temporary hashes (e.g. file_000000002bd081faba3633d0d28f21e3.png)
 * or system UUIDs are never displayed to customers.
 */
export function formatCustomerFileName(originalName?: string | null, mimeType?: string | null): string {
  if (!originalName || originalName.trim() === '') {
    return mimeType?.includes('image') ? 'Uploaded Photo' : 'Print Document';
  }

  const cleanName = originalName.trim();
  const ext = cleanName.includes('.') ? cleanName.split('.').pop()?.toUpperCase() : '';

  // Check if filename is an Android temp file, UUID, or internal storage hash
  const isInternalTempHash =
    /^file_[0-9a-f]{16,}/i.test(cleanName) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(cleanName) ||
    cleanName.startsWith('SecurePrint_Test_');

  if (isInternalTempHash) {
    if (ext === 'PDF') return 'Print Document (PDF)';
    if (['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext || '')) return `Uploaded Photo (${ext})`;
    return 'Customer Document';
  }

  return cleanName;
}
