import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import { validateCreateReview } from "./review.validation";
import { createReview } from "./review.controller";

const routes: Router = Router();
routes.post("/", requireAuth, requireRole("STUDENT"), validateCreateReview, createReview);
export default routes;
