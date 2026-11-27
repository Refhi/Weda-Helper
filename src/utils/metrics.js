/**
 * @file metrics.js
 * @description Système de collecte et d'enregistrement des métriques d'utilisation.
 * Enregistre les clics évités, les déplacements de souris économisés et les frappes clavier
 * pour mesurer l'efficacité de l'extension.
 * 
 * @exports recordMetrics - Enregistre des métriques d'utilisation
 * @exports recordAiMetrics - Enregistre la consommation de tokens estimée d'un appel IA
 */

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

/**
 * Enregistre la consommation (estimée) de tokens d'un appel au modèle, avec son contexte.
 * Stockage : 'aiMetrics-YYYY-MM-DD' et 'globalAiMetrics', au format
 * { [usage]: { calls, tokensIn, tokensOut, toolCalls: { [nomOutil]: nombre } } }.
 * Depuis le document offpage (sans chrome.storage), l'enregistrement est délégué au background.
 * @param {{usage: string, tokensIn: number, tokensOut: number, toolCalls?: string[]}} entry
 * usage : contexte de l'appel (nom de la chaîne d'outils, ou 'conversation').
 */
function recordAiMetrics(entry) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        chrome.runtime.sendMessage({ type: 'recordAiMetrics', entry });
        return;
    }
    aiMetricsQueue.push({ entry, date: new Date().toISOString().split('T')[0] });
    if (!isProcessingAiQueue) processAiQueue();
}

let aiMetricsQueue = [];
let isProcessingAiQueue = false;

function addAiEntry(stats, entry) {
    const usage = entry.usage || 'conversation';
    const target = stats[usage] || (stats[usage] = { calls: 0, tokensIn: 0, tokensOut: 0, toolCalls: {} });
    target.calls += 1;
    target.tokensIn += entry.tokensIn || 0;
    target.tokensOut += entry.tokensOut || 0;
    for (const name of entry.toolCalls || []) {
        target.toolCalls[name] = (target.toolCalls[name] || 0) + 1;
    }
    return stats;
}

function processAiQueue() {
    const item = aiMetricsQueue.shift();
    if (!item) {
        isProcessingAiQueue = false;
        return;
    }
    isProcessingAiQueue = true;
    const dayKey = 'aiMetrics-' + item.date;
    chrome.storage.local.get([dayKey, 'globalAiMetrics'], (result) => {
        chrome.storage.local.set({
            [dayKey]: addAiEntry(result[dayKey] || {}, item.entry),
            globalAiMetrics: addAiEntry(result.globalAiMetrics || {}, item.entry)
        }, processAiQueue);
    });
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
            if ((key.startsWith('metrics-') && key < oneYearAgoStr) ||
                (key.startsWith('aiMetrics-') && key < 'ai' + oneYearAgoStr.charAt(0).toUpperCase() + oneYearAgoStr.slice(1))) {
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