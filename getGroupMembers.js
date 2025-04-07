exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const groupId = event.pathParameters?.group_id || 'unknown_group';

  // Placeholder logic: Return a dummy list of members
  const dummyMembers = [
    { first_name: "Alice", latitude: 40.7128, longitude: -74.0060, group_profile_url: `https://www.facebook.com/groups/${groupId}/user/1` },
    { first_name: "Bob", latitude: 34.0522, longitude: -118.2437, group_profile_url: `https://www.facebook.com/groups/${groupId}/user/2` },
  ];

  const response = {
    statusCode: 200, // OK
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Basic CORS for now
    },
    body: JSON.stringify(dummyMembers),
  };

  console.log("Response:", JSON.stringify(response, null, 2));
  return response;
};