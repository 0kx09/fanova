/**
 * Watermark Service
 * Adds watermarks to images for Base plan users
 */

const axios = require('axios');
const sharp = require('sharp');

/**
 * Add watermark to image
 * @param {string} imageUrl - URL of the image to watermark
 * @param {string} watermarkText - Text to use as watermark (default: "Fanova")
 * @returns {Promise<Buffer>} - Watermarked image as buffer
 */
async function addWatermark(imageUrl, watermarkText = 'Fanova') {
  try {
    // Download the image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // Create watermark text SVG
    const watermarkSvg = `
      <svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="10" 
          y="35" 
          font-family="Arial, sans-serif" 
          font-size="24" 
          font-weight="bold"
          fill="rgba(255, 255, 255, 0.6)"
          stroke="rgba(0, 0, 0, 0.3)"
          stroke-width="0.5"
        >${watermarkText}</text>
      </svg>
    `;

    // Composite watermark onto image
    const watermarkedImage = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          top: 20,
          left: 20,
          blend: 'over'
        }
      ])
      .toBuffer();

    return watermarkedImage;
  } catch (error) {
    console.error('Error adding watermark:', error);
    // If watermarking fails, return original image
    // In production, you might want to handle this differently
    throw error;
  }
}

/**
 * Add watermark and upload to storage
 * @param {string} imageUrl - Original image URL
 * @param {string} storagePath - Path to save watermarked image
 * @param {object} supabaseClient - Supabase storage client
 * @returns {Promise<string>} - Public URL of watermarked image
 */
async function addWatermarkAndUpload(imageUrl, storagePath, supabaseClient) {
  try {
    const watermarkedBuffer = await addWatermark(imageUrl);
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('images')
      .upload(storagePath, watermarkedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload watermarked image: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in watermark and upload:', error);
    throw error;
  }
}

module.exports = {
  addWatermark,
  addWatermarkAndUpload
};
