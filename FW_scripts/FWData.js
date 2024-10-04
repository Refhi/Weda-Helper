// let weda = window.weda || {};
// => weda semble déjà défini ???

let infos = {
    wedaHelper: weda.wedaHelper,
    capabilities: weda.capabilities
}

console.log("FWData.js: infos", infos);
window.postMessage({
    type: "FROM_PAGE",
    payload: infos
}, "*");
