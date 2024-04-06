import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import { LoginUser, RegisterUser, logOut } from "../controllers/User.js";
import { varifyJWT } from "../middlewares/midAuth.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "Avatar",
      maxCount: 1,
    },

    {
      name: "CoverImg",
      maxCount: 1,
    },
  ]),
  RegisterUser
);
router.route("/login").post(LoginUser);
router.route("/logout").post(varifyJWT, logOut);
export default router;
