# GroupFBMap - Facebook Group Member Map

## Description

GroupFBMap is a web application that allows members of a Facebook group to voluntarily share their approximate location on an interactive map. This helps visualize the geographic distribution of the group's members. Users can join a specific group's map, view existing members, and manage their own entry.

## Features

*   **View Group Map:** Enter a Facebook Group ID to view the map for that group.
*   **Join Group Map:** Add yourself to a group's map by providing:
    *   First Name
    *   Facebook Group Profile URL
    *   Approximate Location (obtained via browser geolocation)
    *   Optional Avatar (image upload, resized automatically)
*   **Manage Entry:** Delete your own entry from the map using a unique Delete Token provided upon joining.
*   **Interactive Map:** Uses Leaflet.js to display member locations with markers (including avatars if provided).
*   **Serverless Backend:** Built using AWS services for scalability and cost-effectiveness.
*   **Responsive UI:** Uses Tailwind CSS for a clean and responsive user interface.
*   **Non-blocking Notifications:** Provides user feedback through a notification banner instead of disruptive pop-ups.

## Technology Stack

*   **Frontend:**
    *   HTML5
    *   Tailwind CSS (via Play CDN)
    *   JavaScript (Vanilla)
    *   Leaflet.js (for interactive maps)
*   **Backend:**
    *   AWS Lambda (Node.js runtime)
        *   `addMember`: Handles adding new members, avatar uploads/resizing.
        *   `getGroupMembers`: Retrieves members for a specific group.
        *   `deleteMember`: Handles member deletion and avatar removal.
        *   `getPresignedAvatarUrl`: Generates pre-signed URLs for secure avatar uploads (likely).
    *   AWS API Gateway: Exposes Lambda functions as RESTful API endpoints.
    *   AWS DynamoDB: NoSQL database for storing member data (location, name, profile URL, avatar key, group ID).
    *   AWS S3: Stores user-uploaded avatars.
    *   AWS IAM: Manages permissions for AWS services.
*   **Image Processing (Backend):**
    *   Jimp (used within `addMember` Lambda for image resizing)
*   **Hosting:**
    *   Frontend likely hosted on GitHub Pages (based on `IMPLEMENTATION_PLAN.md`).
    *   Backend hosted on AWS Lambda/API Gateway.

## Setup & Deployment (High-Level)

Setting up this project involves configuring both the AWS backend and the frontend.

1.  **AWS Backend:**
    *   Deploy the Lambda functions (`addMember`, `getGroupMembers`, `deleteMember`, `getPresignedAvatarUrl`) with necessary dependencies (e.g., AWS SDK, Jimp). This might involve creating deployment packages (`.zip` files).
    *   Configure an API Gateway instance to trigger these Lambda functions via HTTP requests (GET, POST, DELETE). Configure CORS.
    *   Create a DynamoDB table with appropriate primary keys and secondary indexes (e.g., a GSI on the Delete Token).
    *   Create an S3 bucket for avatar storage with appropriate permissions and CORS configuration.
    *   Set up IAM roles and policies granting necessary permissions for Lambda functions to interact with DynamoDB, S3, and CloudWatch Logs.
2.  **Frontend:**
    *   Update the API endpoint URL in `script.js` (variable `API_ENDPOINT`) to point to your deployed API Gateway stage URL.
    *   Host the `index.html`, `style.css` (if not using Tailwind CDN exclusively), and `script.js` files on a web server or static hosting provider (like GitHub Pages).
3.  **Domain/DNS (Optional):**
    *   Configure a custom domain name (like the one specified in `CNAME`) to point to the frontend hosting.
    *   Ensure HTTPS is enabled.

*(Note: Refer to `IMPLEMENTATION_PLAN.md` and the various `.json` policy/configuration files for more specific details on the intended AWS setup.)*

## Usage

1.  Open the hosted `index.html` page in your browser.
2.  **To View:** Enter a known Facebook Group ID in the "Getting Started" dialog and click "View Group Map".
3.  **To Join:** Click "Add Me to a Group Map", allow location access, fill in your first name, Facebook group profile URL (find this in the group's member list), optionally upload an avatar, and submit. **Save the provided Delete Token securely!**
4.  **To Delete:** If you are on the map view for the group you joined, click "Manage My Entry", enter your Delete Token, and confirm deletion.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

(Specify License - e.g., MIT, Apache 2.0, or leave blank if none)