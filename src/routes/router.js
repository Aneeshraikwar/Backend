import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import {
  LoginUser,
  RegisterUser,
  changePassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  logOut,
  refreshingAccessToken,
  setAvatar,
  setCoverImg,
  updateProfile,
} from "../controllers/User.js";
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
router.route("/refreshToken").post(refreshingAccessToken);
router.route("/changePassword").post(varifyJWT, changePassword);
router.route("/getUser").get(varifyJWT, getCurrentUser);
router.route("/updateProfile").patch(varifyJWT, updateProfile);
router
  .route("/updateAvatar")
  .patch(varifyJWT, upload.single("Avatar"), setAvatar);
router
  .route("/updateCoverImg")
  .patch(varifyJWT, upload.single("CoverImg"), setCoverImg);
router.
  route("/channel/:username")
  .get(varifyJWT, getUserChannelProfile);
router
.route("/watch-History")
.get(varifyJWT,getWatchHistory);
export default router;
