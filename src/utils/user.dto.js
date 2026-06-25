const buildUserDto = (user) => {
  if (!user) {
    return null;
  }

  const id = user._id || user.id || null;
  return {
    id,
    _id: id,
    googleId: user.googleId || null,
    name: user.name || null,
    email: user.email || null,
    profileImage: user.profileImage || null,
    country: user.country || null,
    language: user.language || null,
    subscription: user.subscription || null,
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

