import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import { getMyAvailability, updateAvailability } from "./availability.controller";
import { validateAvailabilityInput, validateAvailabilityQuery } from "./availability.validation";

const routes: Router = Router();
routes.use(requireAuth, requireRole("TUTOR"));
routes.get("/", validateAvailabilityQuery, getMyAvailability);
routes.put("/", validateAvailabilityInput, updateAvailability);
export default routes;
