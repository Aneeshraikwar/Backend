import { Router } from "express";
import { RegisterUser } from "../controllers/User";
const router = Router();

router.route("/register").post(RegisterUser);
export default router;
