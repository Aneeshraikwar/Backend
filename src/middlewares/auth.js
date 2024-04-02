import { User } from "../models/user.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

export const varifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accesToken ||
      req.header("Authorization")?.replace("Bearer", "");
  
    if (!token) {
      throw new apiError(401, "Unauthorizad request || Token is not found  ");
    }
    const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -accesToken"
    );
    if (!user) {
      throw new apiError(401, "Invalide accessToken  ");
    }
    req.user=user
    next()
  } catch (error) {
    throw new apiError(401,error?.messege || "Error in auth jwtvarify ||invalide access token")
  }
});
