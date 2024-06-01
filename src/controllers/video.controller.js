import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinaryUpload.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    // console.log(page,limit,query,sortBy,sortType,userId);

    //& First we have to check whether the userId in query and user id Logged In is matching
    
    if(userId!==String(req.user?._id))
    {
        throw new ApiError(400,"Unauthorized Access");
    }

    const videoAggregate=await Video.aggregate();
    await Video.aggregatePaginate(videoAggregate,)
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    //?get title,description and check those fields and extract  the userId 

    const existingUser=req.user?.id;
    // console.log("existing user",existingUser);
    if(
        [title,description].
        some((value)=> 
            value===undefined || value?.trim()===''
        )
    )
    {
        throw new ApiError(400,"Both the title and description fields are mandatory");
    }

    // console.log(req?.files);
    
    const videoFilePath=req?.files?.videoFile?.[0].path;
    const thumbnailPath=req?.files?.thumbnail?.[0].path;

    if(!videoFilePath || !thumbnailPath){
        throw new ApiError(400,"Please upload the video and thumbnail")
    }

    const videoUpload=await uploadOnCloudinary(videoFilePath);

    const thumbnailUpload=await uploadOnCloudinary(thumbnailPath);

    if(!videoUpload || !thumbnailUpload){
        throw new ApiError(500,"Error in uploading video and thumbnail");
    }

    console.log("Video: ",videoUpload,"Thumbnail: ",thumbnailUpload);

    const videoDuration=videoUpload.duration;
    const videoUrl=videoUpload.url;
    const thumbnailUrl=thumbnailUpload.url;

    //!Save the fields in db

    const videoCreate=await Video.create(
        {
            videoFile: videoUrl,
            thumbnail: thumbnailUrl,
            title: title,
            description: description,
            duration: videoDuration,
            owner: existingUser
        }
    )

    if(!videoCreate)
    {
        throw new ApiError(500,"Failed to create video document in db");
    }

    res.json(
        new ApiResponse(200,{
            videoUrl: videoUrl,
            thumbnailUrl: thumbnailUrl
        },
        "Published the Video")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    console.log("videoId: ",videoId)
    const video=await Video.findById(videoId);

    if(!video)
    {
        throw new ApiError(400,"Video corresponing that id doesnot exists");
    }
    
    res
    .json(new ApiResponse(
        200,
        {
            video: video
        },
        "Video sent successfully"
    ));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video



})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}