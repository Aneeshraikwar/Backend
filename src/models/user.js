import mongoose, { Schema } from "mongoose";
import Jwt  from "jsonwebtoken";
import bcrypt from "bcrypt";
const userSchema = new Schema(
  {
    
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Vidio",
      },
    ],
    fullName:{
      type:String,
      required:false,
      lowercase:true,
    },
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
    Avatar: {
      type:String,
      required:true,
      
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
    CoverImg: {
      type :String,
    },
    createAt: {},
    updateAt: {},
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
})

userSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password);
};
  userSchema.methods.GenerateAcessToken = function () {
   return Jwt.sign( 
      {
        _id: this._id,
        email: this.email,
        username: this.username,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
    );
  };
  userSchema.methods.GenerateRefressToken = function () { 
    return Jwt.sign(
    {
      _id: this._id,
      
    },
    process.env.REFRESH_ACCESS_TOKEN_SECRET,
    {expiresIn:process.env.REFRESH_ACCESS_TOKEN_SECRET_EXPIRE}
  )};


export const User = mongoose.model("User", userSchema);
