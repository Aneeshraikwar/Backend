import mongoose, { Schema, Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const likeSchema = new Schema(
 {

    comment:{
        type:mongoose.Types.ObjectId,
        ref:"Comment"
    },
    vidio:{
        type:mongoose.Types.ObjectId,
        ref:"vidio"
    },
    likedby:{
        type:mongoose.Types.ObjectId,
        ref:"User"
    },
    tweet:{
        type:mongoose.Types.ObjectId,
        ref:"tweet"
    }
 },
  { timestamps: true }
);
likeSchema.plugin(mongooseAggregatePaginate);
export const like = mongoose.model("Like", likeSchema);
