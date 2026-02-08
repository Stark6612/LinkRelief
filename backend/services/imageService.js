const sharp = require('sharp');

const MAX_SIZE_BYTES = 50 * 1024; // 50KB

/**
 * Compresses an image buffer to be under 50KB if possible.
 * @param {Buffer} buffer - The image buffer
 * @returns {Promise<Buffer>} - The compressed buffer
 */
async function scaleDown(buffer) {
    try {
        console.log(`[ScaleDown] Processing ${buffer.length} bytes...`);

        // Initial Attempt: Resize to 800px width, JPEG 60%
        let processedBuffer = await sharp(buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .jpeg({ quality: 60 })
            .toBuffer();

        // If still too large, try aggressive compression
        if (processedBuffer.length > MAX_SIZE_BYTES) {
            console.warn(`[ScaleDown] Still > 50KB (${processedBuffer.length} bytes). Retrying aggressively...`);
            processedBuffer = await sharp(buffer)
                .resize({ width: 600, withoutEnlargement: true })
                .jpeg({ quality: 40 })
                .toBuffer();
        }

        // Final Check
        if (processedBuffer.length > MAX_SIZE_BYTES) {
            console.error(`[ScaleDown] Failed to compress under 50KB. Final size: ${processedBuffer.length}`);
            throw new Error("Image too large even after compression.");
        }

        console.log(`[ScaleDown] Success. Compressed to ${processedBuffer.length} bytes.`);
        return processedBuffer;

    } catch (error) {
        console.error("[ScaleDown] Error:", error.message);
        throw error;
    }
}

module.exports = { scaleDown };
