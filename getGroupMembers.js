// AWS SDK v3 clients
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-west-2" });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME || "GroupMembers";

exports.handler = async (event) => {
    console.log("Event:", JSON.stringify(event, null, 2));

    // Extract group_id from path parameters
    const groupId = event.pathParameters?.group_id;

    if (!groupId) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Missing group_id path parameter." }),
        };
    }

    // --- Prepare DynamoDB Query ---
    const params = {
        TableName: tableName,
        KeyConditionExpression: "group_id = :gid", // Query by Partition Key
        ExpressionAttributeValues: {
            ":gid": groupId,
        },
        // Specify only the attributes needed for the map display
        ProjectionExpression: "first_name, latitude, longitude, profile_picture_url, group_profile_url",
    };

    const command = new QueryCommand(params);

    // --- Execute Query ---
    try {
        const data = await docClient.send(command);
        console.log("DynamoDB Query Success:", data.Items);

        // Return the list of members (Items array)
        const response = {
            statusCode: 200, // OK
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(data.Items || []), // Return empty array if no members found
        };
        return response;

    } catch (dbError) {
        console.error("DynamoDB Query Error:", dbError);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "Could not retrieve group members.", details: dbError.message }),
        };
    }
};