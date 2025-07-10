import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try {

        const user = await User.findById(userId)
        
        if (!user) {
            throw new ApiError(404, "User not found while generating tokens");
        }

        const accessToken =  await user.generateAccessToken()
        const refreshToken =  await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return{ accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    
    //console.log("rer.body : ", req.body);
    //console.log("rer.file : ", req.files);

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

const loginUser = asyncHandler( async (req,res) => {
    
    const {username, email, password} = req.body
    

    if(!username && !email){
        throw new ApiError(400, "username or email is required!!")
    }

    // username or email 
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    // find the user
    if(!user){
        throw new ApiError(404, "user not exist")
    }

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, " Invalid user credentials")
    }


    // access and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    // send cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    // responce
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
            "user loged in successfully" 
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
    const userID = req.user._id
    await User.findByIdAndUpdate(
        userID,
        {
            $set:{ refreshToken: undefined }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User logged out!"
        )
    )

})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised access")
    }

    try {
        const decodedToken =  jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id)
        
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id).select("-password")
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken , options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken:newRefreshToken
                },
                "Access token refreshed!!"
            )
        )
    } catch (error) {
        throw new ApiError(201, error?.message || "invalid refresh token")
    }

})

export { registerUser,loginUser,logoutUser,refreshAccessToken }