import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinaryUpload.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser }