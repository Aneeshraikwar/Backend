import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { apiError } from "../utils/apiError.js";
import { uploadOnCloudnary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const RegisterUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  console.log("Email :", email);
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

  const AvatarLocalPath = req.files?.Avatar[0]?.path;
  const CoverImageLocalPath = req.files?.CoverImg[0]?.path;
  if (!AvatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }
  const Avatar = await uploadOnCloudnary(AvatarLocalPath);
  const coverImg = await uploadOnCloudnary(CoverImageLocalPath);
  if (!Avatar) {
    throw new apiError(400, "Avatar file is required ");
  }

 const user=await User.create({
    Avatar: Avatar.url,
    coverImg: coverImg?.url || "",
    email,
    password,
    username: username.toLowevCase()
  });
  const CheckUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if (!CheckUser) {
    throw new apiError(400,"The user is not register ")
  }
});

export { RegisterUser };
