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

// Initialize Google Analytics (or another analytics platform)
function initAnalytics() {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        dataLayer.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXX'); // Replace with your actual Google Analytics Measurement ID
}

// Track custom events
function trackEvent(eventCategory, eventLabel, value) {
    gtag('event', eventCategory, {
        'eventCategory': eventCategory,
        'eventLabel': eventLabel,
        'value': value
    });
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
            trackEvent('Weda-Helper Options', checkboxId, checkboxState === 'ON' ? 1 : 0);
        });
    });
}

// Call the function to initialize checkbox tracking when the page is loaded
document.addEventListener('DOMContentLoaded', function() {
    trackCheckboxStates();
});

// Initialize analytics
initAnalytics();

// Expose trackEvent globally
window.trackEvent = trackEvent;
