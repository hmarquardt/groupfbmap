// AWS SDK v3 clients
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require('crypto');
const sharp = require('sharp'); // Image processing library

// Initialize Clients
const region = process.env.AWS_REGION || "us-west-2";
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region });

const tableName = process.env.TABLE_NAME || "GroupMembers";
const bucketName = process.env.BUCKET_NAME || "groupfbmap-avatars"; // S3 bucket for avatars

// Regular expression to parse Facebook Group Profile URL
const fbGroupUrlRegex = /facebook\.com\/groups\/(\d+)\/user\/(\d+)\/?/;
const MAX_AVATAR_WIDTH = 150;

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    let body;
    try {
        // Increase payload size limit if needed via API Gateway configuration
        body = JSON.parse(event.body || '{}');
    } catch (parseError) {
        console.error("JSON Parsing Error:", parseError);
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Invalid request body format." }),
        };
    }

    // Added profile_picture_base64 (optional)
    const { first_name, group_profile_url, latitude, longitude, profile_picture_base64 } = body;

    // --- Input Validation ---
    if (!first_name || !group_profile_url || latitude === undefined || longitude === undefined) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Missing required fields: first_name, group_profile_url, latitude, longitude." }),
        };
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
         return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Latitude and longitude must be numbers." }),
        };
    }

    // --- Parse URL ---
    const match = group_profile_url.match(fbGroupUrlRegex);
    if (!match || match.length < 3) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Invalid Facebook Group Profile URL format. Expected format: https://www.facebook.com/groups/{group_id}/user/{member_id}" }),
        };
    }
    const group_id = match[1];
    const member_id = match[2];

    // --- Generate Delete Token ---
    const delete_token = crypto.randomBytes(16).toString('hex');

    // --- Process and Upload Avatar (if provided) ---
    let profile_picture_url = null;
    if (profile_picture_base64) {
        try {
            console.log("Processing avatar...");
            // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
            const base64Data = profile_picture_base64.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // Resize image using sharp
            const resizedBuffer = await sharp(imageBuffer)
                .resize({ width: MAX_AVATAR_WIDTH, withoutEnlargement: true }) // Resize width, maintain aspect ratio, don't enlarge small images
                .jpeg({ quality: 80 }) // Convert to JPEG with quality setting
                .toBuffer();

            // Define S3 key (e.g., group_id/member_id.jpg)
            const s3Key = `${group_id}/${member_id}.jpg`;

            // Upload to S3
            const putObjectParams = {
                Bucket: bucketName,
                Key: s3Key,
                Body: resizedBuffer,
                ContentType: 'image/jpeg',
                ACL: 'public-read' // Make avatar publicly readable
            };
            const putCommand = new PutObjectCommand(putObjectParams);
            await s3Client.send(putCommand);

            // Construct the public URL (adjust based on region and bucket settings if needed)
            // Standard format: https://<bucket-name>.s3.<region>.amazonaws.com/<key>
            profile_picture_url = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
            console.log("Avatar uploaded successfully:", profile_picture_url);

        } catch (imageError) {
            console.error("Error processing or uploading image:", imageError);
            // Decide if this should be a fatal error or just skip the avatar
            // For now, we'll skip the avatar but still add the member
            profile_picture_url = null; // Ensure it's null if upload failed
             // Optionally return a specific error or warning? For now, just log it.
        }
    }

    // --- Prepare DynamoDB Item ---
    const item = {
        group_id,
        member_id,
        first_name,
        group_profile_url,
        latitude,
        longitude,
        delete_token,
        profile_picture_url, // Will be null if no avatar or if upload failed
        createdAt: new Date().toISOString(),
    };

    // --- Save to DynamoDB ---
    const command = new PutCommand({
        TableName: tableName,
        Item: item,
    });

    try {
        await docClient.send(command);
        console.log("Successfully added item:", item);

        const response = {
            statusCode: 201,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ delete_token: delete_token }),
        };
        return response;

    } catch (dbError) {
        console.error("DynamoDB Error:", dbError);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Could not add member entry.", details: dbError.message }),
        };
    }
};