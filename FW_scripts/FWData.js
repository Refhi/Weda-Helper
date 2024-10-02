let weda = window.weda || {};

let infos = {
    wedaHelper: weda.wedaHelper,
    capabilities: weda.capabilities
}

window.postMessage({
    type: "FROM_PAGE",
    payload: infos
}, "*");
