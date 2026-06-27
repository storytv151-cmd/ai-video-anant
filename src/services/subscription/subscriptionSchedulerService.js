const subscriptionSchedulerService = Object.freeze({
  getPlannedJobs: () => [
    "check_expired_subscriptions",
    "move_to_grace_period",
    "disable_premium_features",
    "send_subscription_notifications",
  ],
  runPlaceholder: async () => ({
    implemented: false,
    message:
      "Subscription scheduler is intentionally deferred. Cron integration will be added in a later phase.",
  }),
});

export default subscriptionSchedulerService;
