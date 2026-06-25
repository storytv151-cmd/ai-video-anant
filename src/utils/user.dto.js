const buildUserDto = (user) => {
  if (!user) {
    return null;
  }

  const id = user._id || user.id || null;
  const subscription = user.subscription
    ? {
        ...user.subscription,
        purchaseToken: undefined,
        purchaseTokenHash: undefined,
        linkedPurchaseToken: undefined,
        linkedPurchaseTokenHash: undefined,
        externalAccountId: undefined,
        externalProfileId: undefined,
        featureSnapshot:
          user.subscription.featureSnapshot instanceof Map
            ? Object.fromEntries(user.subscription.featureSnapshot.entries())
            : user.subscription.featureSnapshot || {},
        limitsSnapshot:
          user.subscription.limitsSnapshot instanceof Map
            ? Object.fromEntries(user.subscription.limitsSnapshot.entries())
            : user.subscription.limitsSnapshot || {},
        metadata:
          user.subscription.metadata instanceof Map
            ? Object.fromEntries(user.subscription.metadata.entries())
            : user.subscription.metadata || {},
      }
    : null;

  return {
    id,
    _id: id,
    googleId: user.googleId || null,
    name: user.name || null,
    email: user.email || null,
    profileImage: user.profileImage || null,
    country: user.country || null,
    language: user.language || null,
    subscription,
    role: user.role || null,
    accountStatus: user.accountStatus || null,
    isEmailVerified: Boolean(user.isEmailVerified),
    lastLogin: user.lastLogin || null,
    lastActiveAt: user.lastActiveAt || null,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
};

export { buildUserDto };
