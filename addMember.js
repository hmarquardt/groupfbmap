// AWS SDK v3 clients
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client } = require("@aws-sdk/client-s3"); // PutObjectCommand no longer needed here
const crypto = require('crypto');
// Jimp is no longer needed here

// Initialize Clients
const region = process.env.AWS_REGION || "us-west-2";
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region });

const tableName = process.env.TABLE_NAME || "GroupMembers";
const bucketName = process.env.S3_BUCKET_NAME || "groupfbmap-avatars"; // Renamed env var for consistency

// Regular expression to parse Facebook Group Profile URL
const fbGroupUrlRegex = /facebook\.com\/groups\/(\d+)\/user\/(\d+)\/?/;
// MAX_AVATAR_WIDTH no longer needed here

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
    // Expect profile_picture_s3_key instead of base64 data
    const { first_name, group_profile_url, latitude, longitude, profile_picture_s3_key } = body;
    console.log(`Value of profile_picture_s3_key after destructuring: ${profile_picture_s3_key}`); // ADDED LOG

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

    // --- Construct Profile Picture URL from S3 Key (if provided) ---
    let profile_picture_url = null;
    console.log(`Checking profile_picture_s3_key before 'if'. Value: ${profile_picture_s3_key}`); // ADDED LOG
    if (profile_picture_s3_key) {
        console.log(`Inside 'if (profile_picture_s3_key)' block. Value: ${profile_picture_s3_key}`); // ADDED LOG
        // Validate the key format roughly if desired (e.g., check prefix)
        // Add detailed logging before URL construction
        console.log(`Attempting URL construction. Key: ${profile_picture_s3_key}, Bucket: ${bucketName}, Region: ${region}`);
        if (typeof profile_picture_s3_key === 'string' && profile_picture_s3_key.startsWith('avatars/')) {
             // Construct the public URL
             // Standard format: https://<bucket-name>.s3.<region>.amazonaws.com/<key>
             profile_picture_url = `https://${bucketName}.s3.${region}.amazonaws.com/${profile_picture_s3_key}`;
             console.log("Constructed profile picture URL:", profile_picture_url); // Keep this log
        } else {
            console.warn("Received invalid profile_picture_s3_key format:", profile_picture_s3_key);
            // Keep profile_picture_url as null if key is invalid
        }
    } else { // Moved this else block to correspond to the outer if (line 76)
        console.log(`'if (profile_picture_s3_key)' evaluated to false.`); // ADDED LOG
    }

    // Helper function to generate dithered coordinate
    const ditherCoordinate = (coordinate) => {
        const minOffset = 0.005;
        const maxOffset = 0.01;
        // Random offset between minOffset and maxOffset
        const offset = minOffset + Math.random() * (maxOffset - minOffset);
        // Randomly add or subtract the offset
        const sign = Math.random() < 0.5 ? -1 : 1;
        return coordinate + sign * offset;
    };

    // Dither the coordinates before saving
    const ditheredLatitude = ditherCoordinate(latitude);
    const ditheredLongitude = ditherCoordinate(longitude);

    // --- Prepare DynamoDB Item ---
    const item = {
        group_id,
        member_id,
        first_name,
        group_profile_url,
        latitude: ditheredLatitude,   // Use dithered value
        longitude: ditheredLongitude, // Use dithered value
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