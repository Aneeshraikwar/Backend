import { User } from "../models/user.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

 export const varifyJWT = asyncHandler(async (req, _, next) => {
  console.log("hello 1");
  try {
    console.log("inside try 2");
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    console.log("after token", token);
    if (!token) {
      console.log("inside if token 4");
      throw new ApiError(401, "Unauthorizad request || Token is not found  ");
    }
    console.log("hello 5");
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("hello 6");
    console.log("decodedToken ", decodedToken);
    const user = await User.findById(decodedToken?._id).select(
      "-password -accesToken"
    );
    console.log("hello 7");
    if (!user) {
      throw new ApiError(401, "Invalide accessToken  ");
    }

    req.user = user;
    next();
  } catch (error) {
    // console.error(error);
    throw new ApiError(401, "something went wrong ", error);
  }
});

