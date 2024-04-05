/**
 * Records metrics about avoided clicks and mouse actions.
 * @param {{clicks: number, drags: number, keyStrokes: number}} metrics - The metrics to record.
 */
let metricsQueue = [];
let isProcessingQueue = false;

function recordMetrics(metrics) {
    let today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    metrics.date = today; // Add the date to the metrics
    metricsQueue.push(metrics);
    if (!isProcessingQueue) {
        processQueue();
    }
}

function processQueue() {
    if (metricsQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }

    isProcessingQueue = true;
    let metrics = metricsQueue.shift();
    let date = metrics.date;
    delete metrics.date; // Remove the date from the metrics

    let key = 'metrics-' + date;
    chrome.storage.local.get(key, function(result) {
        // If the metrics for the date are not defined, default to { clicks: 0, drags: 0, keyStrokes: 0 }
        let dailyMetrics = result[key] || { clicks: 0, drags: 0, keyStrokes: 0 };
        // Add the new metrics to the existing ones
        dailyMetrics.clicks += metrics.clicks || 0;
        dailyMetrics.drags += metrics.drags || 0;
        dailyMetrics.keyStrokes += metrics.keyStrokes || 0;

        let updatedMetrics = {};
        updatedMetrics[key] = dailyMetrics;
        chrome.storage.local.set(updatedMetrics, processQueue);

        console.log('Metrics updated for ' + date + ':', dailyMetrics);
    });

    // Remove data older than 1 year
    let oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    let oneYearAgoStr = 'metrics-' + oneYearAgo.toISOString().split('T')[0];
    chrome.storage.local.get(null, function(items) {
        for (let key in items) {
            if (key.startsWith('metrics-') && key < oneYearAgoStr) {
                chrome.storage.local.remove(key);
            }
        }
    });

    // Update global metrics
    chrome.storage.local.get(['globalMetrics'], function(result) {
        let globalMetrics = result.globalMetrics || { clicks: 0, drags: 0, keyStrokes: 0 };
        globalMetrics.clicks += metrics.clicks || 0;
        globalMetrics.drags += metrics.drags || 0;
        globalMetrics.keyStrokes += metrics.keyStrokes || 0;
        chrome.storage.local.set({ globalMetrics: globalMetrics });
    });
}