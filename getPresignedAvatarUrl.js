// Use CommonJS require syntax
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require('crypto');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' }); // Default region if not set
const bucketName = process.env.S3_BUCKET_NAME;
const UPLOAD_EXPIRATION_SECONDS = 300; // URL valid for 5 minutes
const MAX_FILE_SIZE_MB = 1; // Match frontend validation
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AVATAR_PREFIX = 'avatars/'; // Store avatars in an 'avatars/' folder

exports.handler = async (event) => {
    // Assuming this handler is only invoked for POST requests now,
    // relying on HTTP API CORS config to handle OPTIONS.
    console.log("Received POST event:", JSON.stringify(event, null, 2));

    if (!bucketName) {
        console.error("S3_BUCKET_NAME environment variable not set.");
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, // Add CORS header
            body: JSON.stringify({ error: "Server configuration error: Bucket name missing." }),
        };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body || '{}');
    } catch (e) {
        console.error("Failed to parse request body:", e);
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Invalid request body." }),
        };
    }

    const { filename, contentType } = requestBody;

    // Basic validation
    if (!filename || !contentType) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Missing required fields: filename and contentType." }),
        };
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
         return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: `Invalid content type. Allowed types: ${ALLOWED_CONTENT_TYPES.join(', ')}` }),
        };
    }

    // Generate a unique key for the S3 object
    const fileExtension = filename.split('.').pop() || 'jpg'; // Get extension or default
    const uniqueKey = `${AVATAR_PREFIX}${randomUUID()}.${fileExtension}`;

    console.log(`Generating pre-signed URL for bucket: ${bucketName}, key: ${uniqueKey}, contentType: ${contentType}`);

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        ContentType: contentType, // Set content type for the upload
        // Consider adding ContentLengthRange if needed for stricter validation,
        // but requires frontend to send Content-Length header which fetch doesn't always do easily.
        // ContentLengthRange: [1, MAX_FILE_SIZE_MB * 1024 * 1024]
    });

    try {
        // Add unsignableHeaders to prevent signing checksum headers browsers don't send
        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: UPLOAD_EXPIRATION_SECONDS,
            unsignableHeaders: new Set([
                'x-amz-checksum-crc32',
                'x-amz-checksum-crc32c',
                'x-amz-checksum-sha1',
                'x-amz-checksum-sha256',
                'x-amz-sdk-checksum-algorithm', // Explicitly prevent signing this if SDK adds it
            ]),
        });

        console.log("Successfully generated pre-signed URL.");

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
                // Let HTTP API CORS config handle Access-Control-Allow-Origin
            },
            body: JSON.stringify({
                uploadUrl: signedUrl,
                key: uniqueKey, // Send the key back to the client
            }),
        };
    } catch (error) {
        console.error("Error generating pre-signed URL:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Could not generate upload URL." }),
        };
    }
};

// optionsHandler is no longer needed as OPTIONS is handled within the main handler