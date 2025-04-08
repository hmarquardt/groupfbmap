// AWS SDK v3 clients
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3"); // Added S3 client

// Initialize Clients
const region = process.env.AWS_REGION || "us-west-2";
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region }); // Initialize S3 Client

const tableName = process.env.TABLE_NAME || "GroupMembers";
const indexName = "DeleteTokenIndex"; // GSI name
const bucketName = process.env.BUCKET_NAME || "groupfbmap-avatars"; // S3 bucket

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (parseError) {
        console.error("JSON Parsing Error:", parseError);
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Invalid request body format." }),
        };
    }

    const { delete_token } = body;

    // --- Input Validation ---
    if (!delete_token || typeof delete_token !== 'string' || delete_token.length !== 32) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Missing or invalid delete_token format." }),
        };
    }

    // --- Query GSI to find the item by delete_token ---
    const queryParams = {
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: "delete_token = :dt",
        ExpressionAttributeValues: {
            ":dt": delete_token,
        },
        // Project primary keys AND the avatar URL
        ProjectionExpression: "group_id, member_id, profile_picture_url",
    };
    const queryCommand = new QueryCommand(queryParams);

    let itemToDelete;
    try {
        const queryResult = await docClient.send(queryCommand);
        console.log("GSI Query Result:", queryResult);

        if (!queryResult.Items || queryResult.Items.length === 0) {
            console.log(`Delete token not found: ${delete_token}`);
            return {
                statusCode: 404, // Not Found
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Delete token not found." }),
            };
        }
        if (queryResult.Items.length > 1) {
            console.warn(`Multiple items found for delete_token ${delete_token}. Using the first one.`);
        }
        itemToDelete = queryResult.Items[0];

    } catch (queryError) {
        console.error("DynamoDB GSI Query Error:", queryError);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Error finding entry to delete.", details: queryError.message }),
        };
    }

    // --- Attempt to delete S3 avatar if URL exists ---
    if (itemToDelete.profile_picture_url) {
        try {
            // Extract S3 key from URL (assuming standard format)
            const urlParts = new URL(itemToDelete.profile_picture_url);
            const s3Key = urlParts.pathname.substring(1); // Remove leading '/'

            if (s3Key) {
                console.log(`Attempting to delete S3 object: ${bucketName}/${s3Key}`);
                const deleteS3Params = {
                    Bucket: bucketName,
                    Key: s3Key,
                };
                const deleteS3Command = new DeleteObjectCommand(deleteS3Params);
                await s3Client.send(deleteS3Command);
                console.log(`Successfully deleted S3 object: ${s3Key}`);
            } else {
                 console.warn(`Could not parse S3 key from URL: ${itemToDelete.profile_picture_url}`);
            }
        } catch (s3Error) {
            // Log S3 deletion errors but don't necessarily fail the whole operation
            // The object might already be gone, or there could be permission issues
            console.error(`Error deleting S3 object for URL ${itemToDelete.profile_picture_url}:`, s3Error);
        }
    } else {
         console.log("No profile_picture_url found for this entry, skipping S3 delete.");
    }


    // --- Delete the item from the main table ---
    const deleteParams = {
        TableName: tableName,
        Key: {
            group_id: itemToDelete.group_id,
            member_id: itemToDelete.member_id,
        },
    };
    const deleteCommand = new DeleteCommand(deleteParams);

    try {
        await docClient.send(deleteCommand);
        console.log(`Successfully deleted DynamoDB item for token ${delete_token} (group: ${itemToDelete.group_id}, member: ${itemToDelete.member_id})`);

        // Return success (204 No Content)
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: null,
        };

    } catch (deleteError) {
        console.error("DynamoDB Delete Error:", deleteError);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Could not delete member entry from DynamoDB.", details: deleteError.message }),
        };
    }
};