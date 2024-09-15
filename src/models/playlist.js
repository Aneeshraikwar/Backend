import mongoose, { Schema, Types } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { refreshingAccessToken } from "../controllers/User";

const playlistSchema = new Schema(
  {
    content: {
        type: String,
        required: true,
      },
     
      owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
  },
  { timestamps: true }
);
playlistSchema.plugin(mongooseAggregatePaginate);
export const playlist = mongoose.model("Playlist", playlistSchema);
