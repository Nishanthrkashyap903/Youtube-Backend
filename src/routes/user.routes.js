import { Router } from "express";
import { changePassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { testController } from "../controllers/test.controller.js";

const router=Router();

router.route("/register").post(
    // !Added a middleware upload
    upload.fields(
        [
            {
                name: 'avatar',
                maxCount: 1
            },
            {
                name:'coverImage',
                maxCount:1
            }
        ]
    )
    ,registerUser)

router.route("/test").get(testController)

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT,logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT,changePassword);

router.route("/current-user").get(verifyJWT,getCurrentUser);

router.route("/update-account").patch(verifyJWT,updateAccountDetails);

router.route("/avatar").patch(
    verifyJWT
    ,upload.single("avatar")
    ,updateUserAvatar
);

router.route("/cover-image").patch(
    verifyJWT
    ,upload.single("coverImage"),
    updateUserCoverImage
);

router.route("/channel/:userName").get(verifyJWT,getUserChannelProfile);

router.route("/history").get(verifyJWT,getWatchHistory);

export default router;