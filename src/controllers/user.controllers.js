import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validate -not empty
  // check if user already exist: username, email
  // check for image, check for avatar
  // upload them to cloudinary
  // create user object - create entry in DB
  // remove password and refeshToken field from response
  // check for user creation
  // return res

  const { username, email, fullName, password } = req.body;
  console.log("email", email);

  // ------ this type of if else for beginners -------------
  //    if(fullName===""){
  //     throw new apiError(400,"Username is required")
  //    } //

  if ([fullName, username, email, password].some((val) => val?.trim() === "")) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User name of email already existed");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new apiError(402, "Avatar is required");
  }

  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!coverImageLocalPath) {
    throw new apiError(402, "Cover image is required");
  }

  const avatar = await uploadOncloudinary(avatarLocalPath);
  const coverImage = await uploadOncloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(
    new apiResponse(200,createdUser,"User registered Successfully")
  )
});

export { registerUser };
