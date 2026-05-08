const multer = require('multer');

// Use disk storage for audio files because Whisper needs a physical file with an extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Keep the original file extension, such as .mp3 or .wav
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = file.originalname.split('.').pop();
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext)
  }
})
const diskUpload = multer({ storage: storage });

// Use memory storage for images so Base64 processing stays in memory
const memoryUpload = multer({ storage: multer.memoryStorage() });

module.exports = { diskUpload, memoryUpload };