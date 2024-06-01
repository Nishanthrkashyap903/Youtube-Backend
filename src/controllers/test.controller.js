import { asyncHandler } from "../utils/asyncHandler.js";

const testController=asyncHandler((req,res)=>{
    res.status(201).json({"name":"nrk"});
})

export {testController}