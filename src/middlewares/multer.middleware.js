import multer from "multer";

const storage = multer.diskStorage({
    //~where the uploaded files should be stored
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname);
    }
  })
  
export const upload = multer({ storage: storage });

