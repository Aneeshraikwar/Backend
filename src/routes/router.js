import { Router } from "express";
import { upload } from "../middlewares/multer.js";
import { RegisterUser } from "../controllers/User.js";
const router = Router();

router.route("/register").post(
  upload.fields([ 
    {
      name: "Avatar",
      maxCount: 1,
    },

    {
        name:"CoverImg",
        maxCount:1,
    },
  ]),
  RegisterUser
);
export default router;
