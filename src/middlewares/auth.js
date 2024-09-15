import { User } from "../models/user.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

 export const varifyJWT = asyncHandler(async (req, _, next) => {
 
  try {
  
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    
    if (!token) {
      
      throw new ApiError(401, "Unauthorizad request || Token is not found  ");
    }
    
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    const user = await User.findById(decodedToken?._id).select(
      "-password -accesToken"
    );
   
    if (!user) {
      throw new ApiError(401, "Invalide accessToken");
    }

    req.user = user;
    next();
  } catch (error) {
    // console.error(error);
    throw new ApiError(401, "Your are not loged ,In please logIn ", error);
  }
});

