// Replace these with your Nextcloud details
const NEXTCLOUD_URL = 'https://drbr.fr';
const NEXTCLOUD_USERNAME = '';
const NEXTCLOUD_APP_PASSWORD = '';
const TELEMETRY_DIRECTORY = '/telemetry/';

// Function to send telemetry data to your Nextcloud
async function sendTelemetryToYourNextcloud(telemetryData) {
    try {
        const ClientID = await getOrCreateClientID();

        // Build the file path for the telemetry data
        const telemetryFilePath = `${NEXTCLOUD_URL}/remote.php/dav/files/${encodeURIComponent(NEXTCLOUD_USERNAME)}${TELEMETRY_DIRECTORY}telemetry.json`;

        // Fetch existing telemetry data (if it exists) to append new data
        let existingData = [];

        // GET request to fetch the current telemetry data (if it exists)
        try {
            const response = await fetch(telemetryFilePath, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${btoa(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_APP_PASSWORD}`)}`,
                },
            });

            if (response.ok) {
                existingData = await response.json();  // Parse the existing data
            } else if (response.status === 404) {
                console.warn('Telemetry file not found, creating a new file.');
                existingData = [];  // Initialize as an empty array if the file does not exist
            } else {
                console.error('Error fetching existing telemetry file:', response.status, response.statusText);
                return;
            }
        } catch (error) {
            console.warn('Failed to fetch telemetry file:', error);
            existingData = [];  // Initialize as an empty array if there's an error fetching
        }

        // Append new telemetry data
        existingData.push(telemetryData);

        // PUT request to send the updated telemetry data back to Nextcloud
        const putResponse = await fetch(telemetryFilePath, {
            method: 'PUT',  // Use PUT to upload or overwrite the file
            headers: {
                Authorization: `Basic ${btoa(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_APP_PASSWORD}`)}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(existingData),  // Send the updated data
        });

        if (!putResponse.ok) {
            console.error('Failed to upload telemetry to Nextcloud:', putResponse.status, putResponse.statusText);
        } else {
            console.log('Telemetry uploaded successfully to Nextcloud');
        }

    } catch (error) {
        console.error('Error uploading telemetry to Nextcloud:', error);
    }
}

// Function to track custom events
async function trackEvent(eventCategory, eventLabel, value) {
    const ClientID = await getOrCreateClientID();
    const telemetryData = {
        clientID: ClientID,
        eventCategory,
        eventLabel,
        value,
        timestamp: new Date().toISOString(),
    };

    // Send telemetry data to your Nextcloud
    await sendTelemetryToYourNextcloud(telemetryData);
}

// Function to get or create a unique ClientID
async function getOrCreateClientID() {
    const result = await chrome.storage.local.get('ClientID');
    let ClientID = result.ClientID;

    if (!ClientID) {
        // Generate a new ClientID using crypto.randomUUID
        ClientID = crypto.randomUUID();
        await chrome.storage.local.set({ ClientID });
    }
    return ClientID;
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

// Function to track the state of all checkboxes
function trackCheckboxStates() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async function () {
            const checkboxId = checkbox.id; // Get the checkbox ID
            const checkboxState = checkbox.checked ? 'ON' : 'OFF'; // State of the checkbox

            console.log(`Checkbox ${checkboxId} is ${checkboxState}`);
            await trackEvent('Weda-Helper Options', checkboxId, checkboxState === 'ON' ? 1 : 0);
        });
    });
}

// Function to handle telemetry consent
async function handleTelemetryConsent(consent) {
    await chrome.storage.local.set({ telemetryConsent: consent });

    if (consent) {
        trackCheckboxStates();
    }

    const popup = document.getElementById('telemetry-popup');
    popup.style.display = 'none';
}

// Function to show the telemetry popup
function showTelemetryPopup() {
    const popup = document.getElementById('telemetry-popup');
    popup.style.display = 'flex';
}
