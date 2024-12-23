// Function to show the telemetry consent popup
function showTelemetryPopup() {
    const popup = document.getElementById('telemetry-popup');
    popup.style.display = 'flex';  // Show the popup
}

// Function to handle telemetry consent
async function handleTelemetryConsent(consent) {
    // Store the user's choice in local storage
    await chrome.storage.local.set({ telemetryConsent: consent });

    // Initialize telemetry if consent is given
    if (consent) {
        trackCheckboxStates();
    }

    // Hide the popup after the decision
    const popup = document.getElementById('telemetry-popup');
    popup.style.display = 'none';
}

// Function to get or create a unique ClientID
async function getOrCreateClientID() {
    // Get the stored ClientID from Chrome's local storage
    const result = await chrome.storage.local.get('ClientID');
    let ClientID = result.ClientID;

    // If ClientID doesn't exist, create one and store it
    if (!ClientID) {
        // Generate a new ClientID using crypto.randomUUID
        ClientID = crypto.randomUUID();
        // Store the new ClientID in Chrome's local storage
        await chrome.storage.local.set({ ClientID });
    }
    return ClientID;
}

// Function to track custom events
function trackEvent(eventCategory, eventLabel, value) {
    sendTelemetry(eventCategory, eventLabel, value);
}

// Initialize Nextcloud API for telemetry
async function sendTelemetry(eventCategory, eventLabel, value) {
    const ClientID = await getOrCreateClientID();
    const telemetryData = {
        clientID: ClientID,
        eventCategory,
        eventLabel,
        value,
        timestamp: new Date().toISOString(),
    };

    try {
        // Log telemetry data for debugging purposes
        console.log('Telemetry Data:', telemetryData);
        const response = await fetch('https://your-nextcloud-instance.com/remote.php/dav/files/username/telemetry.json', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer TOKEN', // Replace with your token
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(telemetryData),
        });

        if (!response.ok) {
            console.error('Failed to send telemetry:', response.status, response.statusText);
        } else {
            console.log('Telemetry sent successfully');
            // Optional: log response details if the server provides additional info
            const responseData = await response.json();
            console.log('Response Data:', responseData);
        }
    } catch (error) {
        console.error('Error sending telemetry:', error);
    }
}

// Function to track the state of all checkboxes
function trackCheckboxStates() {
    // Select all checkbox inputs
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    // Iterate through each checkbox and track its state
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkboxId = checkbox.id;  // Get the checkbox ID
            const checkboxState = checkbox.checked ? 'ON' : 'OFF'; // State of the checkbox

            // Log the state (you can replace this with your actual analytics call)
            console.log(`Checkbox ${checkboxId} is ${checkboxState}`);

            // Track the checkbox toggle event
            sendTelemetry('Weda-Helper Options', checkboxId, checkboxState === 'ON' ? 1 : 0);
        });
    });
}

// Check for telemetry consent on page load
document.addEventListener('DOMContentLoaded', async () => {
    const result = await chrome.storage.local.get('telemetryConsent');
    if (result.telemetryConsent === undefined) {
        showTelemetryPopup();
    } else if (result.telemetryConsent) {
        trackCheckboxStates();
    }

    document.getElementById('allow-telemetry').addEventListener('click', () => handleTelemetryConsent(true));
    document.getElementById('deny-telemetry').addEventListener('click', () => handleTelemetryConsent(false));
});
