const formatDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const mapSubscription = (subscription) => {
  if (!subscription) {
    return {
      plan: "free",
      status: "inactive",
      expiresAt: null,
      autoRenew: false,
    };
  }

  const subObj =
    typeof subscription.toObject === "function"
      ? subscription.toObject()
      : subscription;

  return {
    plan: subObj.plan || "free",
    status: subObj.status || "inactive",
    expiresAt: formatDate(subObj.expiresAt),
    autoRenew: Boolean(subObj.autoRenew),
  };
};

export const mapWallet = (wallet) => {
  if (!wallet) return null;

  const walletObj =
    typeof wallet.toObject === "function" ? wallet.toObject() : wallet;
  const id = walletObj._id || walletObj.id || null;

  return {
    id: id ? String(id) : null,
    currentCredits: walletObj.currentCredits ?? 0,
    pendingCredits: walletObj.pendingCredits ?? 0,
    lockedCredits: walletObj.lockedCredits ?? 0,
    lifetimeCredits: walletObj.lifetimeCredits ?? 0,
    status: walletObj.status || "active",
  };
};

export const mapUser = (user) => {
  if (!user) return null;

  const userObj = typeof user.toObject === "function" ? user.toObject() : user;
  const id = userObj._id || userObj.id || null;

  let walletId = null;
  if (userObj.wallet) {
    if (
      typeof userObj.wallet === "object" &&
      (userObj.wallet._id || userObj.wallet.id)
    ) {
      walletId = String(userObj.wallet._id || userObj.wallet.id);
    } else {
      walletId = String(userObj.wallet);
    }
  }

  const subscriptionObj = mapSubscription(userObj.subscription);

  // Derive hasActiveSubscription: must not be free plan, status in active statuses, and not expired
  const hasActiveSubscription = (() => {
    const sub = userObj.subscription;
    if (!sub) return false;
    const plan = sub.plan || "free";
    if (plan === "free") return false;

    const status = sub.status;
    const isActiveStatus = [
      "active",
      "trial",
      "grace_period",
      "renewed",
    ].includes(status);
    if (isActiveStatus) {
      if (sub.expiresAt) {
        return new Date(sub.expiresAt) > new Date();
      }
      return true;
    }
    if (status === "cancelled" && sub.expiresAt) {
      return new Date(sub.expiresAt) > new Date();
    }
    return false;
  })();

  const isPremium = hasActiveSubscription;
  const isEmailVerified = Boolean(userObj.isEmailVerified);
  const accountStatus = userObj.accountStatus || "active";

  return {
    id: id ? String(id) : null,
    googleId: userObj.googleId || null,
    name: userObj.name || null,
    email: userObj.email || null,
    profileImage: userObj.profileImage || null,
    role: userObj.role || "user",
    accountStatus,
    isEmailVerified,
    isPremium,
    hasActiveSubscription,
    subscription: subscriptionObj,
    walletId,
  };
};

export const mapTokens = (tokens) => {
  if (!tokens) return null;

  let accessExpiresAt = tokens.accessExpiresAt;

  // Extract accessExpiresAt from JWT payload if not explicitly present
  if (!accessExpiresAt && tokens.accessToken) {
    try {
      const parts = tokens.accessToken.split(".");
      if (parts.length === 3) {
        // Base64url decode the payload part
        const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload = JSON.parse(payloadStr);
        if (payload && payload.exp) {
          accessExpiresAt = new Date(payload.exp * 1000);
        }
      }
    } catch {
      // Fallback
    }
  }

  return {
    accessToken: tokens.accessToken || null,
    accessExpiresAt: formatDate(accessExpiresAt),
    refreshToken: tokens.refreshToken || null,
    refreshExpiresAt: formatDate(tokens.refreshExpiresAt),
  };
};

export const buildLoginResponse = (
  user,
  wallet,
  tokens,
  message = "Login successful.",
) => {
  return {
    statusCode: 200,
    success: true,
    message,
    data: {
      user: mapUser(user),
      wallet: mapWallet(wallet),
      tokens: mapTokens(tokens),
    },
  };
};

const authMapper = {
  mapUser,
  mapWallet,
  mapSubscription,
  mapTokens,
  buildLoginResponse,
};

export default authMapper;
