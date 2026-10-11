import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import { validateTutorId, validateTutorProfile, validateTutorQuery } from "./tutor.validation";
import { getMyTutorProfile, getTutor, getTutors, saveTutorProfile } from "./tutor.controller";
import { getPublicAvailability } from "@/modules/availability/availability.controller";
import { validatePublicAvailability } from "@/modules/availability/availability.validation";
import { getTutorReviews } from "@/modules/review/review.controller";
import { validateTutorReviews } from "@/modules/review/review.validation";

export const publicTutorRoutes: Router = Router();
publicTutorRoutes.get("/", validateTutorQuery, getTutors);
publicTutorRoutes.get("/:id", validateTutorId, getTutor);
publicTutorRoutes.get("/:id/availability", validatePublicAvailability, getPublicAvailability);
publicTutorRoutes.get("/:id/reviews", validateTutorReviews, getTutorReviews);

export const tutorManagementRoutes: Router = Router();
tutorManagementRoutes.use(requireAuth, requireRole("TUTOR"));
tutorManagementRoutes.get("/profile", getMyTutorProfile);
tutorManagementRoutes.put("/profile", validateTutorProfile, saveTutorProfile);
