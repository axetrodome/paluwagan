export function isPaidPayout(payout: { status?: string | null; completed_at?: string | null } | null | undefined) {
  if (!payout) {
    return false;
  }

  const status = (payout.status ?? '').toLowerCase();
  return status === 'completed' || status === 'paid' || Boolean(payout.completed_at);
}

export function buildPayoutGenerationPlan({
  activeMemberIds,
  existingPayouts,
  contributionAmount,
}: {
  activeMemberIds: Array<string | number>;
  existingPayouts: Array<{ recipient_member_id?: string | number | null; status?: string | null; completed_at?: string | null }>;
  contributionAmount: number | string;
}) {
  const normalizedMemberIds = activeMemberIds
    .map((memberId) => Number(memberId))
    .filter((memberId) => Number.isFinite(memberId) && memberId > 0);

  const paidMemberIds = new Set<number>();
  for (const payout of existingPayouts) {
    const memberId = Number(payout.recipient_member_id);
    if (Number.isFinite(memberId) && memberId > 0 && isPaidPayout(payout)) {
      paidMemberIds.add(memberId);
    }
  }

  const memberIdsToRegenerate = normalizedMemberIds.filter((memberId) => !paidMemberIds.has(memberId));
  const totalMembers = normalizedMemberIds.length;
  const normalizedContributionAmount = Number(contributionAmount ?? 0);

  return {
    memberIdsToRegenerate,
    memberIdsToKeep: Array.from(paidMemberIds).sort((left, right) => left - right),
    totalAmount: normalizedContributionAmount * totalMembers,
    totalMembers,
  };
}
