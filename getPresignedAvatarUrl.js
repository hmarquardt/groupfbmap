import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from 'crypto'; // Use crypto for UUID generation

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' }); // Default region if not set
const bucketName = process.env.S3_BUCKET_NAME;
const UPLOAD_EXPIRATION_SECONDS = 300; // URL valid for 5 minutes
const MAX_FILE_SIZE_MB = 1; // Match frontend validation
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AVATAR_PREFIX = 'avatars/'; // Store avatars in an 'avatars/' folder

export const handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Handle OPTIONS preflight request for HTTP API Payload 2.0
    if (event.requestContext?.http?.method === 'OPTIONS') {
        console.log("Handling OPTIONS preflight request");
        return {
            statusCode: 204, // No Content
            headers: {
                "Access-Control-Allow-Origin": "https://groupfbmap.com", // Be specific
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Max-Age": 86400
            }
        };
    }

    // Proceed with POST logic otherwise

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
        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: UPLOAD_EXPIRATION_SECONDS,
        });

        console.log("Successfully generated pre-signed URL.");

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Type": "application/json",
                // CORS headers might not be strictly needed here for POST response
                // if the OPTIONS preflight is handled correctly, but doesn't hurt.
                "Access-Control-Allow-Origin": "https://groupfbmap.com"
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