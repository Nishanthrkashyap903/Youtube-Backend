import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinaryUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import conf from "../conf/conf.js";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
    // !get user details from frontend
    // *validation -did not send empty user details
    // ?check if user already exists: username, email
    // ~check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body;
    console.log(fullName,email,password,username);

    console.log("request files: ",req.files);
    // console.log(req.files.avatar[0].path);
    // console.log(req.files.coverImage);
    // console.log(fullName?.trim());

    if (
        [fullName,email,username,password].some((field) => 
            field===undefined || field?.trim().length === 0
        )
    ) {
        throw new ApiError(400,"All the fields are required and not sent by the user");
    }

    const existedUser=await User.findOne({
       $or:[
        {username},{email}
       ]
    })

    console.log("Existing User: ",existedUser);

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    const avatarLocalPath=req.files?.avatar?.[0]?.path;
    const coverImageLocalPath=req.files?.coverImage?.[0]?.path;


    console.log("Avatar: ",avatarLocalPath,"Cover: ",coverImageLocalPath);

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);

    console.log("avatar on cloudinary",avatar)
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("coverImage on cloudinary",coverImage)
    
    if(!avatar)
    {
        throw new ApiError(400,"Avatar file is required");
    }

    const user=await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    //for selecting specified fields which should not be present
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser)
    {
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )

})

const generateAccessAndRefereshTokens=async (userId)=>{
    try {
        const user=await User.findById(userId);

        //*Methods in the User model can be only accessed by its instance 

        const accessToken=user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken=refreshToken;

        //Here we are saving the document without validating whether the password should be present or not

        await user.save(
            {
                validateBeforeSave: true
            }
        )

        return {accessToken,refreshToken};

    }
    catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const loginUser=asyncHandler(async (req,res)=>{
    // req body->data
    // username or email 
    // find the user
    // password check
    // access and referesh token
    //send cookie

    const {email, username, password}=req.body;

    console.log(`email: ${email} username: ${username}`);

    if(!username && !email)
    {
        throw new ApiError(400,"UserName or Email is required")
    }

    const user=await User.findOne({
    $or:
        [   
            {username},
            {email}
        ]
    })

    if(!user)
    {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid)
    {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id);
    console.log(`accessToken: ${accessToken} \n refreshToken: ${refreshToken}`);

    const loggedInUser=await User.findById(user._id)
    .select("-password -refreshToken");

    const options = {
        //*This ensures that it cannot be accessed by the browser
        httpOnly: true,

        //!The cookie is encrypted
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User Logged In Successfull"
        )
    )

})

const logoutUser=asyncHandler(async(req,res)=>{

    console.log(`request in logout: ${req.user}`);

    await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        //*This ensures that it cannot be accessed by the browser
        httpOnly: true,

        //!The cookie is encrypted
        secure: true
    }

    res
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged Out")
    )
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
    //& In this controller we are refreshing the access token
    //~ In my Browser cookie i am having refresh token 
    //* We are decoding the refresh token and get the id of user
    //? We are query the db using the id of user get the refresh token stored in db
    //^ And then we are comparing both the tokens (browser ref. token and refresh token in db)
    //! if true only generate both the access and refresh token and store the refesh token in db

    const incomingRefreshToken=req.cookies?.refreshToken || req.body.refreshToken;

    console.log(`incomingRefreshToken : ${incomingRefreshToken}`);
    if(!incomingRefreshToken)
    {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,conf.refreshTokenSecret)

        console.log(`decodedToken Id: ${decodedToken?._id}`);
    
        const user=await User.findById(decodedToken?._id);

        console.log(`User: ${user}`);
        if(!user)
        {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if(incomingRefreshToken!==user.refreshToken)
        {
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id);

        console.log(`newAccessToken: ${accessToken},newRefreshToken : ${refreshToken}`);

        const options = {
            httpOnly: true,
            secure: true
        }
        res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken: accessToken,
                    refreshToken: refreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token");
    }

})

const changePassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;

   try {
     const user=await User.findById(req.user._id);
     const isPasswordTrue=await user.isPasswordCorrect(oldPassword);
 
     if(!isPasswordTrue)
     {
         throw new ApiError(401,"Wrong Password");
     }
 
     user.password=newPassword;
 
     await user.save({
         validateBeforeSave:false
     });
 
     res.status(200).json(
         new ApiResponse(200,{},"Password changed Successfully")
     )
   } catch (error) {
    throw new ApiError(500 , error?.message || "Internal Server Error");
   }

})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName, email} = req.body

    if(!(fullName && email))
    {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image in cloudinary - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading user Avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image in cloudinary - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading coverImage on cloudinary")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {userName}=req.params();

    if(!userName?.trim())
    {
        throw new ApiError(400,"username is missing");
    }

    const channel=await User.aggregate(
        [
            {
                $match:{
                    username: userName?.toLowerCase()
                }
            },
            {
                $lookup:{
                    from: "subscriptions", //The collection name's first letter will be in lowercase of Model and plural
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields:{
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    subscribedToCount: {
                        $size: "subscribedTo"
                    },
                    isUserSubscribed: {
                        $cond: {
                            if:{
                                $in: [req.user?._id,"subscribers.subscriber"]
                            },
                            then:true,
                            else: false
                        }
                    }
                }
            },
            {
                $project:{
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ]
    )

    if(!channel?.length)
    {
        throw new ApiError(404,"channel does not exists");
    }
    res
    .status(200)
    .json(new ApiResponse(200,channel[0],"User channel fetched successfully"));
})

const getWatchHistory=asyncHandler(async(req,res)=>{ 
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project:{
                                        username:1,
                                        fullName:1,
                                        email:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}