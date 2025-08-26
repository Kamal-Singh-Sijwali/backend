import  jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) =>{
  try {
    const user = await User.findById(userId)
    const accesstoken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshtoken = refreshToken
    await user.save({validateBeforeSave:false})

    return {accesstoken,refreshToken}
  } catch (error) {
    throw new apiError(500,"Something went wrong while generating refresh and access tocken")
  }
}
  //============ Register user ===========
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validate -not empty
  // check if user already exist: username, email
  // check for image, check for avatar
  // upload them to cloudinary
  // create user object - create entry in DB
  // remove password and refreshToken field from response
  // check for user creation
  // return res

  const { username, email, fullName, password } = req.body;
  // console.log("email", email);

  // ------ this type of if else for beginners -------------
  //    if(fullName===""){
  //     throw new apiError(400,"Username is required")
  //    } //

  if ([fullName, username, email, password].some((val) => val?.trim() === "")) {
    throw new apiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
// console.log("******* ********",existedUser)
  if (existedUser) {
    throw new apiError(409, "User name or email already existed");    
  }
// console.log("req file==>",req.files)
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new apiError(402, "Avatar is required");
  }

  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  console.log("coverimage=>",coverImageLocalPath)


  const avatar = await uploadOncloudinary(avatarLocalPath);
  const coverImage = await uploadOncloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || null,
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


  //============ Login user ===========
const loginUser = asyncHandler(async(req,res)=>{
    // req body => data
    // username or email 
    // find user 
    // password check 
    // access and refresh token 
    // send cookie

    const  {username,email,password} = req.body

    if(!email){
      throw new apiError(400,"Username or password is required")
    }

    const user = await User.findOne({
      $or:[{username},{email}]
    })

    if(!user){
      throw new apiError(400,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
      throw new apiError(400,"Password incorrect")
    }

    const {accesstoken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // modify cookie only from server so we create option object
    const options = {
      httpOnly:true,
      secure:true
    }

    return res.status(200)
          .cookie("accessToken",accesstoken,options)
          .cookie("refreshToken",refreshToken,options)
          .json(
            new apiResponse(200,
              {
                user:loggedInUser,
                accesstoken, // may bwe user saving access/refresh token in frontend
                refreshToken
              },
              "User logged In successfully"
            )
          )


  })


  //============ Logout user ===========
  const logoutUser = asyncHandler(async (req,res)=>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
       $set:{
        refreshToken:undefined
       }
      },
      {
          new:true
      }
    )

      const options = {
      httpOnly:true,
      secure:true
    }

    return res.status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(
              new apiResponse(200,{},"User logged Out")
            )
  })

  // ========= refresh access token ==========
  const refreshAccessToken = asyncHandler(async(req,res)=>{
     const incomingRefreshToken =  req.cookie.refreshToken || req.body.refreshToken

     if(!incomingRefreshToken){
      throw new apiError(401,"Unauthorized request")    
     }

      try {
        const decodedToken = jwt.verify(
        incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
       )
  
       const user = await user.findById(decodedToken?._id)
  
        if(!user){
        throw new apiError(401,"Invalid refresh token")    
       }
  
       if (incomingRefreshToken!== user.refreshToken) {
        throw new apiError(401,"Refresh token is expired or used")     
       }
  
       const options = {
        httpOnly:true,
        secure:true
       }
  
       const {accesstoken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
  
       return res.status(200)
                  .cookie("accessToken",accesstoken,options)
                  .cookie("refreshToken",newRefreshToken,options)
                  .json(
                    new apiResponse(
                      200,
                      {
                        accesstoken,
                        refreshToken:newRefreshToken
                      },
                      "Access token refreshed"
  
                    )
                  )
      } catch (error) {
        throw new apiError(401,error?.message||"Invalid refresh token")
        
      }

     
  })

  // ============ change password = ===========
  const changePasssword =  asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user = await  User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
      throw new apiError(401,"invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
            .json(new apiResponse(
              200,
              {},
              "Password change successfully"


              

            ))
  })

export { registerUser ,loginUser,logoutUser,refreshAccessToken};
