/**
 * Central route composition module.
 * Public routes and versioned API routes are mounted from here for consistent expansion.
 */
import { Router } from "express";
import environment from "../config/environment.js";
import adminRouter from "./admin.routes.js";
import authRouter from "./auth.routes.js";
import bootstrapRouter from "./bootstrap.routes.js";
import categoryRouter from "./category.routes.js";
import generationRouter from "./generation.routes.js";
import googleRouter from "./google.routes.js";
import { publicHealthRouter, versionedHealthRouter } from "./health.routes.js";
import notificationRouter from "./notification.routes.js";
import paymentRouter from "./payment.routes.js";
import providerRouter from "./provider.routes.js";
import providerAdminRouter from "./provider.admin.routes.js";
import rewardRouter from "./reward.routes.js";
import membershipRouter from "./membership.routes.js";
import subscriptionRouter from "./subscription.routes.js";
import templateRouter from "./template.routes.js";
import transactionRouter from "./transaction.routes.js";
import uploadRouter from "./upload.routes.js";
import userRouter from "./user.routes.js";
import walletRouter from "./wallet.routes.js";

const publicRouter = Router();
const apiRouter = Router();

publicRouter.use("/", publicHealthRouter);
apiRouter.use("/", versionedHealthRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/bootstrap", bootstrapRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/reward", rewardRouter);
apiRouter.use("/transactions", transactionRouter);
apiRouter.use("/providers", providerRouter);
apiRouter.use("/admin/providers", providerAdminRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/templates", templateRouter);
apiRouter.use("/generation", generationRouter);
apiRouter.use("/generations", generationRouter);
apiRouter.use("/google", googleRouter);
apiRouter.use("/upload", uploadRouter);
apiRouter.use("/payment", paymentRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/membership", membershipRouter);
apiRouter.use("/subscription", subscriptionRouter);
apiRouter.use("/subscriptions", subscriptionRouter);
apiRouter.use("/notifications", notificationRouter);

const versionedApiPath = `${environment.app.apiBasePath}/${environment.app.apiVersion}`;

export { publicRouter, apiRouter, versionedApiPath };
