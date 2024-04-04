import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import conf from "../conf/conf.js";
import { User } from "../models/user.model.js";

export const verifyJWT=asyncHandler(async (req, _, next)=>{
    try {
        //*Whenever the user wants to access a protected route or resource, the user agent should send the JWT, typically in the Authorization header using the Bearer schema.

        //& This is the format of the header: Authorization: Bearer <token>
        
        console.log("request in verify middle ware",req.cookies);
        
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

        console.log("token: ",token);

        if(!token)
        {
            throw new ApiError(401,"Unauthorized request");
        }
    
        //~When the user logs in the server signs a jwt with data containing users id and using accessTokenSecret as private key  when us decode the jwt using the same key u get the data sent by the user during login time
    
        const decodedToken=jwt.verify(token,conf.accessTokenSecret);

        console.log(`decodedToken : ${decodedToken}`);
    
        const user=await User.findById(decodedToken?._id)
        .select("-password -refreshToken");
        
        if(!user)
        {
            throw new ApiError(401, "Invalid Access Token");
        }
        
        req.user=user;
    
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token");
    }
})