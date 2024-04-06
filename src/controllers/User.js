import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { ApiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const foundUser = await User.findById(userId);
    // console.log(foundUserId);
    const AccessToken = foundUser.GenerateAcessToken();
    
    // console.log("Access :", generatedAccessToken);
    const RefreshToken = foundUser.GenerateRefressToken();
    // console.log("refresh :", generatedRefreshToken);
    foundUser.refreshToken = RefreshToken;
    await foundUser.save({ validateBeforeSave: false });
    return { AccessToken, RefreshToken };
  } catch (error) {
    console.log(error);
    throw new apiError(500, "Error in generating or refreshing token");
  }
};

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
const LoginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  console.log(email, username, password);
  if (!email || !username) {
    throw new apiError(400, "Incorrect Username or Email");
  }
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new apiError(404, "User not found");
  }
  // console.log("user :",user)
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(404, "Invalide credintials");
  }
  const { AccessToken, RefreshToken } =
    await generateAccessAndRefreshToken(user._id);
    
  const logedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", AccessToken, options)
    .cookie("refreshToken", RefreshToken, options)
    .json(
      new ApiResponse(200, "User logedIn successfullu", {
        user: logedInUser,
        AccessToken,
        RefreshToken,
      })
    );
});

const logOut = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logOut successFully"));
});

export { RegisterUser, LoginUser, logOut };
