import mongoose, { Schema, model } from "mongoose";
import { User } from "./user";

const subsCriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {timestamps:true}
  
);
export const Subscribtion=mongoose.model("subscription",subsCriptionSchema)
