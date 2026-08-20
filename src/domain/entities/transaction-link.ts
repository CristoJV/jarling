const TRANSACTION_LINK_TYPES = ['related', 'bizum'] as const;
export type TransactionLinkType = (typeof TRANSACTION_LINK_TYPES)[number];

export type TransactionLink = Readonly<{
  id: string;
  sourceTransactionId: string;
  targetTransactionId: string;
  type: TransactionLinkType;
  createdAt: string;
}>;

export function createTransactionLink(link: TransactionLink): TransactionLink {
  if (
    link.sourceTransactionId === link.targetTransactionId ||
    !TRANSACTION_LINK_TYPES.includes(link.type)
  ) {
    throw new TypeError('A transaction link requires two different records.');
  }
  const [sourceTransactionId, targetTransactionId] = [
    link.sourceTransactionId,
    link.targetTransactionId,
  ].sort();
  return { ...link, sourceTransactionId, targetTransactionId };
}
