import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import conf from '../conf/conf.js'
          
cloudinary.config({ 
  cloud_name: conf.cloudName, 
  api_key: conf.apiKey,
  api_secret: conf.apiSecret
});
        
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //*Upload the file on cloudinary
        // console.log("localpath in cloudinary: ",localFilePath);
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        // console.log("response in cloudinary: ",response);
        // console.log("file is uploaded on cloudinary url:",response.url);
        return response;
    } catch (error) {

        console.log("Cloudinary Error: ",error);
        //& It deletes the file created locally on the server in a Synchronous way means it blocks the exection of the code until the file is removed
        fs.unlinkSync(localFilePath); 
        
        return null;
    }
}

export  {uploadOnCloudinary};

          
