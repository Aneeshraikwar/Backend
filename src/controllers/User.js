import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { apiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const RegisterUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if ([username, email, password].some((filed) => filed?.trim() === "")) {
    throw new apiError(400, "All fields are required");
  }
  const existidUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existidUser) {
    throw new apiError(
      409,
      "Error in existing User or username or email is exist"
    );
  }
  
  const CoverImageLocalPath = req.files?.CoverImg[0]?.path;
  const AvatarLocalPath = req.files?.Avatar[0]?.path;
  if (!AvatarLocalPath || !CoverImageLocalPath) {
    throw new apiError(
      400,
      "AvatarLocalPath or CoverImageLocalPath is not provided"
    );
  }
  
  
  // Upload Avatar to Cloudinary
   const avatarUploadResponse = await uploadOnCloudinary(AvatarLocalPath);
 
   const avatarUrl = avatarUploadResponse.url;
  // Upload Cover Image to Cloudinary
  const coverImgUploadResponse = await uploadOnCloudinary(CoverImageLocalPath);
  const coverImgUrl = coverImgUploadResponse.url;
  // Create User in the database
  const user = await User.create({
    Avatar: avatarUrl,
    CoverImg: coverImgUrl || "",
    email,
    password,
    username,
  });
  const CheckUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!CheckUser) {
    throw new apiError(400, "The user is not register ");
  }
  res.status(200).json({ message: "User registered successfully", user });
});
export { RegisterUser };
