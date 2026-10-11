import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware";
import { validateProfileInput } from "./user.validation";
import { getMyProfile, updateMyProfile } from "./users.controller";

const routes: Router = Router();
routes.use(requireAuth);
routes.get("/me", getMyProfile);
routes.patch("/me", validateProfileInput, updateMyProfile);
export default routes;
