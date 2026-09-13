/**
 * Script de test à coller dans la console, sur la page Antécédents WEDA,
 * après avoir lancé une recherche CIM10 (résultats visibles dans l'arbre).
 * Teste l'hypothèse : c'est l'appel direct à SetParamID (état interne WEDA)
 * qui "accroche" réellement l'antécédent, pas les évènements souris/drag simulés.
 */
(function () {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function dispatchMouse(el, type) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const x = Math.max(1, Math.round(rect.left + rect.width / 2));
        const y = Math.max(1, Math.round(rect.top + rect.height / 2));
        const ev = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: type === 'mouseup' || type === 'click' ? 0 : 1
        });
        el.dispatchEvent(ev);
        console.log('[test] mouse', type, 'sur', el);
        return ev;
    }

    function dispatchDrag(el, type) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const x = Math.max(1, Math.round(rect.left + rect.width / 2));
        const y = Math.max(1, Math.round(rect.top + rect.height / 2));
        const ev = (typeof DragEvent === 'function')
            ? new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y })
            : new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
        el.dispatchEvent(ev);
        console.log('[test] drag', type, 'sur', el);
        return ev;
    }

    function parseSetParamIdFromHand(hand) {
        const onclick = String(hand && hand.getAttribute ? hand.getAttribute('onclick') || '' : '');
        console.log('[test] onclick brut du hand:', onclick);

        // Tentative 1 : guillemets simples autour du label
        let m = onclick.match(/SetParamID\s*\(\s*this\s*,\s*event\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'/i);
        // Tentative 2 : guillemets doubles autour du label
        if (!m) m = onclick.match(/SetParamID\s*\(\s*this\s*,\s*event\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*"((?:\\"|[^"])*)"/i);
        // Tentative 3 : sans "this, event" au début (signature différente)
        if (!m) m = onclick.match(/SetParamID\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*['"]((?:\\.|[^'"])*)['"]/i);
        // Tentative 4 : n'importe quels arguments, on capture tout entre parenthèses pour inspection
        if (!m) {
            const raw = onclick.match(/SetParamID\s*\((.*)\)/i);
            console.warn('[test] Regex connus en échec. Arguments bruts trouvés :', raw ? raw[1] : null);
            return null;
        }

        return {
            kind: Number(m[1]),
            id: Number(m[2]),
            label: String(m[3] || '').replace(/\\'/g, "'").replace(/\\"/g, '"')
        };
    }

    function armWedaCim10Hand(hand) {
        if (!hand) return false;
        const params = parseSetParamIdFromHand(hand);
        console.log('[test] Paramètres extraits de onclick:', params);

        try { hand.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}

        dispatchMouse(hand, 'mouseover');
        dispatchMouse(hand, 'mousemove');
        dispatchMouse(hand, 'mousedown');
        dispatchMouse(hand, 'mouseup');
        dispatchMouse(hand, 'click');

        try {
            if (typeof hand.onclick === 'function') {
                console.log('[test] Appel direct hand.onclick');
                hand.onclick.call(hand, dispatchMouse(hand, 'click'));
            }
        } catch (e) {
            console.warn('[test] Échec appel hand.onclick', e);
        }

        try {
            if (params && typeof window.SetParamID === 'function') {
                console.log('[test] Appel direct window.SetParamID', params);
                const ev = dispatchMouse(hand, 'click') || {};
                window.SetParamID(hand, ev, params.kind, params.id, params.label);
            } else {
                console.warn('[test] window.SetParamID introuvable ou params manquants', {
                    hasSetParamID: typeof window.SetParamID,
                    params
                });
            }
        } catch (e) {
            console.warn('[test] Échec appel SetParamID', e);
        }

        return true;
    }

    async function test() {
        // Trouve le premier résultat dans l'arbre CIM10 (ajuste le sélecteur si besoin)
        const arbre = document.querySelector('#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10');
        if (!arbre) {
            console.error('[test] Arbre CIM10 introuvable. Vérifie que la recherche a bien été lancée.');
            return;
        }
        const anchor = arbre.querySelector('a');
        if (!anchor) {
            console.error('[test] Aucun résultat (lien) trouvé dans l\'arbre CIM10.');
            return;
        }

        // Le hand est un <img title="Drag and Drop" onclick="SetParamID(...)"> enfant direct du <a>
        const hand = arbre.querySelector('img[title="Drag and Drop"]');
        if (!hand) {
            console.error('[test] Aucune image "Drag and Drop" trouvée dans l\'arbre.');
            return;
        }
        console.log('[test] Résultat CIM10:', anchor, '/ hand:', hand, '/ onclick hand:', hand.getAttribute('onclick'));

        // Zone de dépôt : premier onglet autorisé
        const zoneDepot = document.querySelector('table[title="Les éléments resultant de la recherche d\'une contre-indications sont autorisés à être lâché sur cet onglet."]');
        if (!zoneDepot) {
            console.error('[test] Aucune zone de dépôt autorisée trouvée.');
            return;
        }
        console.log('[test] Zone de dépôt:', zoneDepot);

        // Étape 1 : accrocher via SetParamID + évènements
        armWedaCim10Hand(hand);
        await sleep(300);

        // Étape 2 : déposer sur la cible (ré-arme juste avant, comme dans le script d'origine)
        try { zoneDepot.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
        armWedaCim10Hand(hand);
        await sleep(250);

        dispatchMouse(zoneDepot, 'mouseover');
        dispatchMouse(zoneDepot, 'mousemove');
        dispatchDrag(hand, 'dragstart');
        dispatchDrag(zoneDepot, 'dragenter');
        dispatchDrag(zoneDepot, 'dragover');
        dispatchDrag(zoneDepot, 'drop');
        dispatchMouse(zoneDepot, 'mouseup');
        dispatchMouse(zoneDepot, 'click');
        try { zoneDepot.click(); } catch (_) {}

        await sleep(800);
        const panneau = document.querySelector('#ContentPlaceHolder1_PanelModifyAntecedent');
        console.log('[test] Terminé. Panneau antécédent ouvert ?', !!panneau, panneau);
    }

    test();
})();
