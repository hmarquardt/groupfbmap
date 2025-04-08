console.log("GroupFBMap script loaded.");

// Placeholder for map initialization and app logic
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    // Initialize Leaflet map
    const map = L.map('map').setView([20, 0], 2); // Center on roughly world view, zoom level 2

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    console.log("Leaflet map initialized.");
    // --- DOM Element References ---
    const loadingIndicator = document.getElementById('loading-indicator');
    const appContainer = document.getElementById('app-container');
    const mapView = document.getElementById('map-view');
    const gettingStartedDialog = document.getElementById('getting-started-dialog');
    const joinDialog = document.getElementById('join-dialog');
    const deleteDialog = document.getElementById('delete-dialog');
    const viewGroupButton = document.getElementById('view-group-button');
    const joinMapButton = document.getElementById('join-map-button');
    const manageEntryButton = document.getElementById('manage-entry-button');
    const switchGroupButton = document.getElementById('switch-group-button');
    const groupIdInput = document.getElementById('group-id-input');
    const cancelJoinButton = document.getElementById('cancel-join-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    const geolocationError = document.getElementById('geolocation-error');
    const joinForm = document.getElementById('join-form');
    const firstNameInput = document.getElementById('first-name-input');
    const groupProfileUrlInput = document.getElementById('group-profile-url-input');
    const submitJoinButton = document.getElementById('submit-join-button');
    const joinError = document.getElementById('join-error');
    const deleteForm = document.getElementById('delete-form');
    const deleteTokenInput = document.getElementById('delete-token-input');
    const submitDeleteButton = document.getElementById('submit-delete-button');
    const deleteError = document.getElementById('delete-error');
    const avatarInput = document.getElementById('avatar-input'); // Added for GFM-014

    // --- State Variables ---
    let currentLatitude = null;
    let currentLongitude = null;
    const API_ENDPOINT = 'https://v4cpsska29.execute-api.us-west-2.amazonaws.com'; // From GFM-002 output
    let memberMarkers = L.layerGroup().addTo(map); // Layer group to hold markers

    // --- Helper Functions ---
    function showView(viewToShow) {
        // Hide all main views/dialogs first
        mapView.classList.add('hidden');
        gettingStartedDialog.classList.add('hidden');
        joinDialog.classList.add('hidden');
        deleteDialog.classList.add('hidden');

        // Show the requested one
        if (viewToShow === 'map') {
            mapView.classList.remove('hidden');
            // Invalidate map size in case container was hidden
             setTimeout(() => map.invalidateSize(), 0);
        } else if (viewToShow === 'gettingStarted') {
            gettingStartedDialog.classList.remove('hidden');
        } else if (viewToShow === 'join') {
            joinDialog.classList.remove('hidden');
        } else if (viewToShow === 'delete') {
            deleteDialog.classList.remove('hidden');
        }
    }

    // --- Map Data Loading ---
    async function loadMapData(groupId) {
        console.log(`Loading map data for group: ${groupId}`);
        memberMarkers.clearLayers(); // Clear previous markers

        // Optional: Add loading indicator specifically for map data
        // mapView.querySelector('#map-loading')?.classList.remove('hidden');

        try {
            const response = await fetch(`${API_ENDPOINT}/members/${groupId}`);
            if (!response.ok) {
                // Handle non-200 responses (like 404 Not Found, 500 Server Error)
                 const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty obj
                 const errorMsg = `Error loading members for group ${groupId}: ${errorData.error || response.statusText || 'Unknown error'}`;
                 console.error(errorMsg, response.status);
                 alert(errorMsg); // Use alert for now, could be replaced with a nicer UI element
                 // Decide if we should show getting started or just an empty map
                 // For now, just show the empty map view
                 showView('map');
                 return;
            }

            const members = await response.json();
            console.log(`Received ${members.length} members for group ${groupId}`);

            if (members.length === 0 && !localStorage.getItem(`alerted_empty_${groupId}`)) {
                 // Only alert once per session for an empty group
                 alert(`No members have added themselves to the map for group ${groupId} yet. Be the first!`);
                 localStorage.setItem(`alerted_empty_${groupId}`, 'true'); // Use sessionStorage if you only want it per tab session
            }

            members.forEach(member => {
                if (member.latitude !== undefined && member.longitude !== undefined) {
                    const marker = L.marker([member.latitude, member.longitude]);
                    let popupContent = `<b>${member.first_name || 'Member'}</b>`;
                    if (member.group_profile_url) {
                        popupContent += `<br><a href="${member.group_profile_url}" target="_blank" rel="noopener noreferrer">View Profile in Group</a>`;
                    }
                    // Add avatar if URL exists
                    if (member.profile_picture_url) {
                        // Apply Tailwind classes for styling if possible, otherwise inline styles
                        // Using inline styles here for simplicity within the JS string
                        popupContent += `<br><img src="${member.profile_picture_url}" alt="${member.first_name || 'Avatar'}" class="mt-2 w-10 h-10 object-cover rounded">`;
                    }
                    marker.bindPopup(popupContent);
                    memberMarkers.addLayer(marker);
                }
            });

             // Adjust map view to fit markers if any were added
             if (members.length > 0) {
                map.fitBounds(memberMarkers.getBounds().pad(0.1)); // Add padding
             } else {
                 // If no members, reset to default view
                 map.setView([20, 0], 2);
             }


        } catch (error) {
            console.error("Network or Fetch Error loading members:", error);
            alert("Network error fetching members. Please check your connection and try again.");
            // Show getting started dialog on network error? Or just map view?
            showView('map'); // Show map view even on error for now
        } finally {
             // Optional: Hide map loading indicator
             // mapView.querySelector('#map-loading')?.classList.add('hidden');
        }
    }

    // --- Initial Load Logic ---
    function initializeApp() {
        const storedGroupId = localStorage.getItem('group_id');
        console.log("Stored Group ID:", storedGroupId);

        loadingIndicator.classList.add('hidden');
        appContainer.classList.remove('hidden');

        if (storedGroupId) {
            // Group ID found, show map view and load data
            showView('map');
            loadMapData(storedGroupId);
        } else {
            // No Group ID, show getting started dialog
            showView('gettingStarted');
            console.log("No group ID found, showing Getting Started.");
        }
    }

    // --- Event Listeners ---

    // Getting Started Dialog Buttons
    viewGroupButton.addEventListener('click', () => {
        const groupId = groupIdInput.value.trim();
        if (groupId) {
            console.log(`User wants to view group: ${groupId}`);
            localStorage.setItem('group_id', groupId);
            // Hide dialog, show map, trigger load (similar to initializeApp logic)
            showView('map');
            loadMapData(groupId);
        } else {
            alert("Please enter a valid Facebook Group ID to view its map.");
        }
    });

    joinMapButton.addEventListener('click', () => {
        console.log("Join Map button clicked");
        showView('join');
        // Reset form state
        joinForm.reset();
        geolocationError.classList.add('hidden');
        joinError.classList.add('hidden');
        joinError.textContent = '';
        submitJoinButton.disabled = true;
        currentLatitude = null;
        currentLongitude = null;

        // Request Geolocation
        if ('geolocation' in navigator) {
            console.log("Requesting geolocation...");
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Success
                    currentLatitude = position.coords.latitude;
                    currentLongitude = position.coords.longitude;
                    console.log("Geolocation obtained:", currentLatitude, currentLongitude);
                    geolocationError.classList.add('hidden');
                    submitJoinButton.disabled = false; // Enable form submission
                },
                (error) => {
                    // Error
                    console.error("Geolocation Error:", error);
                    geolocationError.textContent = `Geolocation Error: ${error.message}. Please ensure location services are enabled for your browser and this site.`;
                    geolocationError.classList.remove('hidden');
                    submitJoinButton.disabled = true; // Keep disabled
                },
                {
                    enableHighAccuracy: true, // Optional: try for better accuracy
                    timeout: 10000,         // Optional: 10 second timeout
                    maximumAge: 0           // Optional: force fresh location
                }
            );
        } else {
            console.error("Geolocation is not supported by this browser.");
            geolocationError.textContent = "Geolocation is not supported by this browser.";
            geolocationError.classList.remove('hidden');
            submitJoinButton.disabled = true;
        }
    });

    // Map View Buttons
    manageEntryButton.addEventListener('click', () => {
        console.log("Manage Entry button clicked");
        showView('delete');
        // Try to pre-populate delete token
        const currentGroupId = localStorage.getItem('group_id');
        const currentMemberId = localStorage.getItem('member_id'); // We stored this when joining
        deleteForm.reset(); // Clear previous input
        deleteError.classList.add('hidden');
        deleteError.textContent = '';

        if (currentGroupId && currentMemberId) {
            const tokenKey = `delete_token_${currentGroupId}_${currentMemberId}`;
            const storedToken = localStorage.getItem(tokenKey);
            if (storedToken) {
                console.log("Found stored delete token, pre-populating.");
                deleteTokenInput.value = storedToken;
            } else {
                 console.log("No delete token found in localStorage for current group/member.");
            }
        } else {
             console.log("Cannot pre-populate token: No current group_id or member_id in localStorage.");
        }
    });

    switchGroupButton.addEventListener('click', () => {
        console.log("Switch Group button clicked");
        localStorage.removeItem('group_id'); // Clear current group
        localStorage.removeItem('delete_token'); // Clear potentially related token
        localStorage.removeItem('member_id'); // Clear potentially related member id
        // Hide map, show getting started
        memberMarkers.clearLayers(); // Clear markers when switching
        showView('gettingStarted');
        groupIdInput.value = ''; // Clear input field
    });

    // Dialog Cancel Buttons
    cancelJoinButton.addEventListener('click', () => {
        joinDialog.classList.add('hidden');
        // Decide whether to show map or getting started based on localStorage
        initializeApp(); // Re-run init logic to show correct view
    });

     cancelDeleteButton.addEventListener('click', () => {
        deleteDialog.classList.add('hidden');
         // Decide whether to show map or getting started based on localStorage
        initializeApp(); // Re-run init logic to show correct view
    });

    // Join Form Submission
    joinForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent traditional form submission
        console.log("Join form submitted.");

        if (!currentLatitude || !currentLongitude) {
            joinError.textContent = "Could not get location. Please try again.";
            joinError.classList.remove('hidden');
            return;
        }

        const firstName = firstNameInput.value.trim();
        const groupProfileUrl = groupProfileUrlInput.value.trim();

        if (!firstName || !groupProfileUrl) {
            joinError.textContent = "Please fill in all fields.";
            joinError.classList.remove('hidden');
            return; // Should be caught by 'required' but good practice
        }

        // Basic client-side URL validation (backend does more thorough check)
        const fbGroupUrlRegex = /facebook\.com\/groups\/(\d+)\/user\/(\d+)\/?/;
        const match = groupProfileUrl.match(fbGroupUrlRegex);
        if (!match || match.length < 3) {
             joinError.textContent = "Invalid Facebook Group Profile URL format.";
             joinError.classList.remove('hidden');
             return;
        }
        const groupId = match[1];
        const memberId = match[2];


        submitJoinButton.disabled = true;
        submitJoinButton.textContent = 'Submitting...'; // Add loading state
        joinError.classList.add('hidden');
        joinError.textContent = '';

        const payload = {
            first_name: firstName,
            group_profile_url: groupProfileUrl,
            latitude: currentLatitude,
            longitude: currentLongitude,
            // profile_picture_base64: null // Initialize
        };

        // --- Handle Avatar File ---
        const avatarFile = avatarInput.files[0];
        let avatarBase64 = null;

        if (avatarFile) {
            console.log("Avatar file selected:", avatarFile.name, avatarFile.size, avatarFile.type);
            // Validate size (e.g., 1MB limit)
            if (avatarFile.size > 1 * 1024 * 1024) {
                 joinError.textContent = "Avatar image must be less than 1MB.";
                 joinError.classList.remove('hidden');
                 submitJoinButton.disabled = false; // Re-enable button
                 return;
            }
            // Validate type (simple check)
            if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(avatarFile.type)) {
                 joinError.textContent = "Invalid avatar file type. Please use JPG, PNG, GIF, or WEBP.";
                 joinError.classList.remove('hidden');
                 submitJoinButton.disabled = false; // Re-enable button
                 return;
            }

            try {
                avatarBase64 = await readFileAsBase64(avatarFile);
                // Remove the data URI prefix (e.g., "data:image/jpeg;base64,")
                payload.profile_picture_base64 = avatarBase64.split(',')[1];
                console.log("Avatar read and encoded.");
            } catch (readError) {
                 console.error("Error reading avatar file:", readError);
                 joinError.textContent = "Error processing avatar file.";
                 joinError.classList.remove('hidden');
                 submitJoinButton.disabled = false; // Re-enable button
                 return;
            }
        } else {
             payload.profile_picture_base64 = null; // Explicitly set to null if no file
        }


        // --- Call API ---
        console.log("Calling POST /members with payload:", { ...payload, profile_picture_base64: payload.profile_picture_base64 ? '[BASE64 DATA]' : null }); // Don't log full base64

        try {
            const response = await fetch(`${API_ENDPOINT}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // Try to parse JSON regardless of status code for potential error messages
            const responseBody = await response.json().catch(err => {
                console.error("Error parsing response JSON:", err);
                return { error: "Received non-JSON response from server." }; // Default error if parsing fails
            });


            if (response.status === 201) { // Created
                console.log("API Success:", responseBody);
                const deleteToken = responseBody.delete_token;

                // Store necessary info
                localStorage.setItem('group_id', groupId);
                localStorage.setItem('member_id', memberId);
                localStorage.setItem(`delete_token_${groupId}_${memberId}`, deleteToken);

                // Use a more robust way to display the token, maybe a dedicated modal?
                // For now, using prompt which allows copying easily.
                prompt(`Success! You've been added to the map for group ${groupId}.\n\nIMPORTANT: Copy and save this Delete Token securely. You NEED it to remove your entry later, especially if you clear browser data:\n`, deleteToken);

                showView('map');
                loadMapData(groupId);

            } else {
                console.error("API Error:", response.status, responseBody);
                // Provide more specific common error feedback
                let userErrorMessage = responseBody.error || `Server responded with status ${response.status}`;
                if (userErrorMessage.includes("Invalid Facebook Group Profile URL format")) {
                    userErrorMessage = "Invalid Facebook Group Profile URL format. Please ensure it looks like: https://www.facebook.com/groups/GROUP_ID/user/MEMBER_ID";
                } else if (response.status === 500) {
                    userErrorMessage = "An internal server error occurred. Please try again later.";
                }
                joinError.textContent = `Error: ${userErrorMessage}`;
                joinError.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Network or Fetch Error:", error);
            joinError.textContent = "Network error. Please check your connection and try again.";
            joinError.classList.remove('hidden');
        } finally {
             if (!joinDialog.classList.contains('hidden')) {
                 submitJoinButton.disabled = false;
                 submitJoinButton.textContent = 'Submit My Location'; // Restore text
             }
        }
    });

    // Helper function to read file as Base64
    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    // Delete Form Submission
    deleteForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("Delete form submitted.");

        const deleteToken = deleteTokenInput.value.trim();

        // Basic validation
        if (!deleteToken || !/^[a-f0-9]{32}$/.test(deleteToken)) {
             deleteError.textContent = "Please enter a valid 32-character delete token.";
             deleteError.classList.remove('hidden');
             return;
        }

        submitDeleteButton.disabled = true;
        submitDeleteButton.textContent = 'Deleting...'; // Add loading state
        deleteError.classList.add('hidden');
        deleteError.textContent = '';

        const payload = {
            delete_token: deleteToken
        };

        console.log("Calling DELETE /members with token:", deleteToken);

        try {
            const response = await fetch(`${API_ENDPOINT}/members`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 204) { // No Content - Success
                console.log("API Delete Success");
                alert("Success! Your entry has been deleted from the map."); // Simple confirmation

                // Clear stored token (find the right key first - tricky without group/member ID easily available here)
                // We'll just clear the generic one for now, and rely on switch group to clear specific ones
                // A better approach might be needed if users manage multiple groups without switching
                const currentGroupId = localStorage.getItem('group_id');
                const currentMemberId = localStorage.getItem('member_id');
                 if (currentGroupId && currentMemberId) {
                     const tokenKey = `delete_token_${currentGroupId}_${currentMemberId}`;
                     if (localStorage.getItem(tokenKey) === deleteToken) {
                         localStorage.removeItem(tokenKey);
                         console.log(`Removed token ${tokenKey} from localStorage.`);
                         // Also remove group/member id since they are now deleted
                         localStorage.removeItem('group_id');
                         localStorage.removeItem('member_id');
                     }
                 }


                // Refresh the view (will likely show 'Getting Started' now)
                initializeApp();

            } else {
                 // Handle API errors (404 Not Found, 400 Bad Request, etc.)
                 const responseBody = await response.json().catch(() => ({})); // Try to parse error
                 console.error("API Delete Error:", response.status, responseBody);
                 let deleteUserErrorMessage = responseBody.error || `Server responded with status ${response.status}`;
                 if (deleteUserErrorMessage.includes("Delete token not found")) {
                     deleteUserErrorMessage = "Delete token not found or invalid. Please double-check the token.";
                 } else if (response.status === 500) {
                     deleteUserErrorMessage = "An internal server error occurred while deleting. Please try again later.";
                 }
                 deleteError.textContent = `Error: ${deleteUserErrorMessage}`;
                 deleteError.classList.remove('hidden');
            }

        } catch (error) {
            console.error("Network or Fetch Error during delete:", error);
            deleteError.textContent = "Network error. Please check your connection and try again.";
            deleteError.classList.remove('hidden');
        } finally {
            submitDeleteButton.disabled = false;
            submitDeleteButton.textContent = 'Delete My Entry Permanently'; // Restore text
        }
    });

    // --- Run Initialization ---
    initializeApp();
});