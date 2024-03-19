import mongoose, { Schema } from "mongoose";
import { JsonWebTokenError } from "jsonwebtoken";
import { Jwt } from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new Schema(
  {
    id: {},
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Vidio",
      },
    ],
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatar: {},
    coverimage: {},
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
    coverImg: {},
    createAt: {},
    updateAt: {},
  },
  { timestamps: true }
);
userSchema.pre("save", function (next) {
  if (this.isModified("password")) return next();
  this.password = bcrypt.hash(this.password, 10);
  next();

  userSchema.methods.isPasswordCorrect = function (password) {
    bcrypt.compare(password, this.password);
  };
  userSchema.methods.GenerateAcessToken = function () {
    Jwt.sign(
      {
        _id: this._id,
        email: this.email,
        username: this.username,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {expireIn:process.env.ACCESS_TOKEN_EXPIRY}
    );
  };
  userSchema.methods.GenerateRefressToken = function (refreshToken) { Jwt.sign(
    {
      _id: this._id,
      
    },
    process.env.REFRESH_ACCESS_TOKEN_SECRET,
    {expireIn:process.env.REFRESH_ACCESS_TOKEN_SECRET_EXPIRE}
  )};
});

export const User = mongoose.model("User", userSchema);
