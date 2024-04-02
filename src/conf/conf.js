import dotenv from 'dotenv'

dotenv.config({
    path: './.env'
})

const conf={
    cloudName: String(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey:String(process.env.CLOUDINARY_API_KEY),
    apiSecret:String(process.env.CLOUDINARY_API_SECRET)
}

export default conf;