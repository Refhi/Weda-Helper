// Pont limité aux commandes de lecture Weda utilisées sur HprimForm.aspx.
// PageRequestManager est disponible dans le monde de la page, pas dans celui de l'extension.
(() => {
    let active = false;
    document.addEventListener("wh-hprim-request", event => {
        const { id, action, targetId } = event.detail || {};
        if (typeof id !== "string" || typeof targetId !== "string") return;
        const respond = state => document.dispatchEvent(new CustomEvent("wh-hprim-response", { detail: { id, state } }));
        if (active) { respond("busy"); return; }
        const target = document.getElementById(targetId);
        const selectors = {
            open: '#ContentPlaceHolder1_HprimsGrid a[id*="HprimsGrid_LinkButtonHprim"]',
            history: '#ContentPlaceHolder1_PatientsGrid [id*="ButtonHistoriqueResultat_"]'
        };
        if (!Object.hasOwn(selectors, action) || !target?.matches(selectors[action]) || target.disabled) {
            respond("missing");
            return;
        }
        const manager = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        if (manager?.get_isInAsyncPostBack?.()) { respond("busy"); return; }
        if (action === "open") {
            // Le contenu du bilan confirme l'ouverture, même sans événement AJAX identifiable.
            try {
                target.click();
                respond("dispatched");
            } catch {
                respond("error");
            }
            return;
        }
        const postBackCall = /\b(?:WebForm_PostBackOptions|__doPostBack)\s*\(\s*(['"])([\w$:]+)\1/;
        const expectedTarget = target.getAttribute("href")?.match(postBackCall)?.[2] ||
            target.getAttribute("onclick")?.match(postBackCall)?.[2] || target.name;
        let request, sending = false, started = false, timer;
        const begin = (_sender, args) => {
            const element = args?.get_postBackElement?.();
            const candidate = args?.get_request?.();
            const body = candidate?.get_body?.();
            // Un lien HPRIM peut lancer le postback après le clic, sans élément DOM associé.
            // Le formulaire porte alors le nom serveur exact de la commande.
            const eventTarget = typeof body === "string" ? new URLSearchParams(body).get("__EVENTTARGET") : null;
            if (element === target || (element && target.contains(element)) ||
                (expectedTarget && eventTarget === expectedTarget) || (!element && !eventTarget && sending)) {
                started = true;
                request = candidate;
            }
        };
        const end = (_sender, args) => {
            if (!started) return;
            const completed = args?.get_response?.()?.get_webRequest?.();
            if (request && completed && request !== completed) return;
            finish(args?.get_error?.() ? "error" : "complete");
        };
        const finish = state => {
            clearTimeout(timer);
            manager?.remove_beginRequest?.(begin);
            manager?.remove_endRequest?.(end);
            active = false;
            respond(state);
        };
        active = true;
        manager?.add_beginRequest?.(begin);
        manager?.add_endRequest?.(end);
        timer = setTimeout(() => finish("timeout"), 12000);
        try {
            sending = true;
            target.click();
        } catch {
            finish("error");
        } finally {
            sending = false;
        }
    });
})();
