const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a file buffer to Cloudinary
 * Transforms to webp, 800x600 (limit crop), auto quality, folder 'predicciones'
 * @param {Buffer} buffer - File buffer from multer
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadFromBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'predicciones',
        tags: ['prediccion'],
        format: 'webp',
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 'auto'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Deletes an image from Cloudinary using its public ID
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<object>} Cloudinary deletion result
 */
const deleteImage = (publicId) => {
  return new Promise((resolve, reject) => {
    if (!publicId) {
      return resolve({ result: 'not_found' });
    }
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

module.exports = {
  cloudinary,
  uploadFromBuffer,
  deleteImage
};
