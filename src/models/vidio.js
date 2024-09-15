import mongoose, { Schema } from "mongoose";
const Vidio = new Schema(
  {
    vidioFile: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    discription: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"user"
    }
  },
  { timestamps: true }
);
export const vidioSchema = mongoose.model("Vidio", vidioSchema);
