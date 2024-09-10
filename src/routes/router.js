import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import { LoginUser, RegisterUser, logOut,refreshingAccessToken } from "../controllers/User.js";
import { varifyJWT } from "../middlewares/Auth.js";
const router = Router();
/* --------------------------- RegisterUser route --------------------------- */

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

/* ------------------------------- login route ------------------------------ */
router.route("/login").post(LoginUser);
/* ------------------------------ logOut route ------------------------------ */
router.route("/logout").post(varifyJWT, logOut);
/* ------------------------- route for refresh token ------------------------ */
router.route('/refreshToken').post(refreshingAccessToken)
export default router;
