import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.js";
import { ApiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Jwt from "jsonwebtoken";
import mongoose, { sanitizeFilter } from "mongoose";
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
    throw new ApiError(500, "Error in generating or refreshing token");
  }
};

const RegisterUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if ([username, email, password].some((filed) => filed?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }
  const existidUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existidUser) {
    throw new ApiError(
      409,
      "Error in existing User or username or email is exist"
    );
  }

  const CoverImageLocalPath = req.files?.CoverImg[0]?.path;
  const AvatarLocalPath = req.files?.Avatar[0]?.path;

  if (!AvatarLocalPath || !CoverImageLocalPath) {
    throw new ApiError(
      400,
      "AvatarLocalPath or CoverImageLocalPath is not provided"
    );
  }

  // Upload Avatar to Cloudinary
  const avatarUploadResponse = await uploadOnCloudinary(AvatarLocalPath);

  const avatarUrl = avatarUploadResponse.url;
  // Upload Cover Image` to Cloudinary
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
    throw new ApiError(400, "The user is not register ");
  }
  res.status(200).json({ message: "User registered successfully", user });
});
const LoginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  console.log(email, username, password);
  if (!email || !username) {
    throw new ApiError(400, "Incorrect Username or Email");
  }
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  // console.log("user :",user)
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Enter valid Password");
  }
  const { AccessToken, RefreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

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
      new ApiResponse(200, "User LogedIn Successfully", {
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
      $unset: {
        refreshToken: 1,
        // this would be better aproach
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
const refreshingAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "incoming Refresh token not found");
  }
  /* -------------------- verifing cookie's refresh token ------------------- */
  try {
    const decodedRefreshToken = Jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_ACCESS_TOKEN_SECRET
    );
    if (!decodedRefreshToken) {
      throw new ApiError(401, "Refresh Token is not found from the data base ");
    }
    /* ----------------------- finding the user from db ---------------------- */
    const user = await User.findById(decodedRefreshToken?._id);
    if (!user) {
      throw new ApiError(401, "something wrong in getting user ");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token doesn't match ");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    /* ---------------- generating new refresh and Access Tokens ---------------- */
    const { AccessToken, refreshToken } = generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", AccessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          refreshToken,
          AccessToken,
          "Access Token is refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "something went wrong", error?.message);
  }
});

/* -------------------------------------------------------------------------- */
/*                       controller for change Password                       */
/* -------------------------------------------------------------------------- */
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  /* -------------------------- verifing the password ------------------------- */
  if (!user) {
    console.log(user);
    throw new ApiError(400, "user not found");
  }
  const correctPassword = await user.isPasswordCorrect(oldPassword);
  if (!correctPassword) {
    throw new ApiError(400, "Password is not correct");
  }
  user.password = newPassword;
  /* --------------------------- saving new password -------------------------- */
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed succesfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetch successfully"));
});
/* -------------------------------------------------------------------------- */
/*                        controller for profile update                       */
/* -------------------------------------------------------------------------- */
const updateProfile = asyncHandler(async (req, res) => {
  const { email, username } = req.body;
  if (!email && !username) {
    throw new ApiError(401, "error in email or username");
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        username,
        email,
      },
    },
    { new: true }
  ).select("-password");
  if (!user) {
    throw new ApiError(400, "user not fount");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "The account details were updated successfully"
      )
    );
});
const setAvatar = asyncHandler(async (req, res) => {
  const avatarPath = req.file?.path;
  console.log(avatarPath);
  console.log(avatarPath);
  if (!avatarPath) {
    throw new ApiError(401, "not able to fatch avatar local path");
  }

  const Avatar = await uploadOnCloudinary(avatarPath);
  if (!Avatar.url) {
    throw new ApiError(
      401,
      "something wrong while uploading avatar",
      error?.message
    );
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        Avatar: Avatar.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "the Avatar uploaded successfully "));
});
const setCoverImg = asyncHandler(async (req, res) => {
  const CoverImgPath = req.file?.path;
  if (!CoverImgPath) {
    throw new ApiError(
      401,
      "not able to fatch CoverImg local path",
      error?.message
    );
  }

  const CoverImg = await uploadOnCloudinary(CoverImgPath);
  if (!CoverImg.url) {
    throw new ApiError(
      401,
      "something wrong while uploading CoverImg",
      error?.message
    );
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        CoverImg: CoverImg.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, " CoverImg uploaded successfully "));
});
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Invalid user");
  }
  // const user=await User.find({
  //        username
  //   })
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_d",
        foreignField: "channels",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_d",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        SubscribedToCount: {
          $size: "subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        email: 1,
        subscribersCount: 1,
        SubscribedToCount: 1,
        isSubscribed: 1,
        Avatar: 1,
        CoverImg: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(500, "channel does not exist  ");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        "The channel has been successfully fatched"
      )
    );
});
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "vidio",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "user",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    email: 1,
                    Avatar: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, user[0], "Watch History factched successfully"));
});

export {
  RegisterUser,
  LoginUser,
  logOut,
  refreshingAccessToken,
  changePassword,
  getCurrentUser,
  updateProfile,
  setAvatar,
  setCoverImg,
  getUserChannelProfile,
  getWatchHistory,
};
