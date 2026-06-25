const buildWalletDto = (wallet) => {
  if (!wallet) {
    return null;
  }

  const id = wallet._id || wallet.id || null;
  return {
    id,
    _id: id,
    user: wallet.user || null,
    status: wallet.status || null,
    currentCredits: wallet.currentCredits ?? 0,
    pendingCredits: wallet.pendingCredits ?? 0,
    lockedCredits: wallet.lockedCredits ?? 0,
    lifetimeCredits: wallet.lifetimeCredits ?? 0,
    totalPurchased: wallet.totalPurchased ?? 0,
    totalUsed: wallet.totalUsed ?? 0,
    totalRewarded: wallet.totalRewarded ?? 0,
    totalRefunded: wallet.totalRefunded ?? 0,
    createdAt: wallet.createdAt || null,
    updatedAt: wallet.updatedAt || null,
  };
};

const buildCreditTransactionDto = (tx) => {
  if (!tx) {
    return null;
  }

  const id = tx._id || tx.id || null;
  return {
    id,
    _id: id,
    wallet: tx.wallet || null,
    user: tx.user || null,
    type: tx.type || null,
    status: tx.status || null,
    source: tx.source || null,
    purpose: tx.purpose || null,
    credits: tx.credits ?? 0,
    balanceBefore: tx.balanceBefore ?? null,
    balanceAfter: tx.balanceAfter ?? null,
    referenceType: tx.referenceType || null,
    referenceId: tx.referenceId || null,
    description: tx.description || null,
    createdAt: tx.createdAt || null,
    updatedAt: tx.updatedAt || null,
  };
};

export { buildWalletDto, buildCreditTransactionDto };

