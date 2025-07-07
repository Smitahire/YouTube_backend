import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
    
    console.log("rer.body : ", req.body);
    console.log("rer.file : ", req.files);

    // get user details from frontend
    const {username, email, fullname, password} = req.body
    

    // validation - not empty
    if(
        [username,email,fullname,password].some( (field) => field?.trim === "")
    ){
        throw new ApiError(400, "all fields are required")
    }

    // check if user alredy exist: username and email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username exists")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const covarImageLocalPath = req.files?.coverimage[0]?.path;

    let covarImageLocalPath;
    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length >0){
        covarImageLocalPath = req.files.coverimage[0].path;
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is require")
    }

    // upload them to cloudinary, avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverimage = await uploadOnCloudinary(covarImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is require")
    }

    // create user object - create entry in db

    const user = await User.create(
        {
            username: username.toLowerCase(),
            email,
            fullname,
            avatar: avatar.url,
            coverimage: coverimage?.url || "",
            password,
            
        }
    )
    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation 

    if(!createdUser){
        throw new ApiError(500, "something went wrong while registering user")
    }

    // return response

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User redistered successfully ")
    )
})

export { registerUser }