import { asyncHandler } from "../utils/asyncHandler";
const RegisterUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    message:"Ok"
  })
});

export {RegisterUser}
