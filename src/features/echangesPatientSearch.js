/** Recherche d'un patient dans le formulaire asynchrone de la messagerie sécurisée. */
const echangesPatientSearch = (() => {
    const formSelector = '[id$="_PanelFindPatient"], [id$="_PanelPatient"]';
    const modeSelector = 'select[id$="_DropDownListRechechePatient"]';
    const resultSelector = 'a[id*="_LinkButtonPatientGetNomPrenom_"], a[id*="_LinkButtonOldPatientGetNomPrenom_"]';
    const birthSelector = '[id*="PatienDateNaissance_"], [id*="PatientDateNaissance_"]';
    const visible = element => !!element?.getClientRects().length && getComputedStyle(element).visibility !== "hidden";

    function labels() {
        return [...document.querySelectorAll("#messageContainer .messageClassement, #messageList .selected .messageClassement")]
            .map(element => element.innerText.trim()).filter(text => /^patient\s*:/i.test(text));
    }

    function nameKey(name) {
        return normalizeString(name || "").replace(/[^\p{L}]+/gu, " ").trim();
    }

    function sameName(a, b) {
        return nameKey(a).split(" ").sort().join(" ") === nameKey(b).split(" ").sort().join(" ");
    }

    // Conserver ensemble les noms et prénoms de chaque source. Le corps du message peut
    // porter toute l'identité alors que le PDF contient uniquement un compte rendu.
    function readNames(text) {
        const families = [...text.matchAll(/(?:^|\n)\s*nom(?:\s+d['’ ]usage|\s+de\s+naissance)?\s*:\s*([^\n;:]+)/gi)].map(m => m[1].trim());
        const given = text.match(/(?:^|\n)\s*pr[ée]noms?\s*:\s*([^\n;:]+)/i)?.[1].trim();
        const aliases = given ? families.map(family => family + " " + given) : [];
        const labelled = /\bpatiente?\s*:\s*([\p{L}][\p{L}\p{M}'’ -]*?)(?=\s*[-,(]?\s*(?:n[ée](?:e|\(e\))?\s+le\b|\d{1,2}[/.-]|$))/gimu;
        const civil = /\b(?:Mme|Madame|Monsieur|M\.)\s+([\p{L}][\p{L}\p{M}'’ -]*?)\s*[-,(]?\s*n[ée](?:e|\(e\))?\s+le\b/giu;
        const named = [...text.matchAll(labelled), ...text.matchAll(civil)].map(match => match[1].trim());
        const full = aliases.length ? aliases : named.slice(0, 1);
        const conflict = named.some(name => !full.some(alias => sameName(name, alias)));
        return { families, full, conflict };
    }

    async function identity(data, base) {
        const sources = [base.pdfText || "", base.messageBody || "", ...base.patientLabels];
        const groups = sources.map(readNames);
        const matrix = data.dataMatrix;
        if (matrix?.Nom && matrix.Prenoms) groups.unshift({ families: [matrix.Nom], full: [matrix.Nom + " " + matrix.Prenoms] });
        const named = groups.filter(group => group.full.length);
        const fullNames = named.length ? named[0].full : (data.nameMatches || []).filter(name => nameKey(name).includes(" "));
        const conflictingNames = named.some(group => group.conflict || !group.full.some(name => fullNames.some(other => sameName(name, other))));
        const dates = sources.flatMap(text => [...text.matchAll(PDF_PATIENT_BIRTH_DATE)].map(match => match[1]));
        for (const label of base.patientLabels) {
            const date = label.match(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/);
            if (date) dates.push(date[0]);
        }
        if (matrix?.DateNaissance) dates.push(matrix.DateNaissance);
        const birthDates = new Set((await Promise.all(dates.map(parseDate))).filter(Boolean).map(formatDate));
        // La plus ancienne date du PDF peut être une date de consultation. Elle
        // ne permet pas d'écarter un patient dont le nom correspond au courrier.
        const aiDate = data.echangesAIBirthDate && await parseDate(data.echangesAIBirthDate);
        const birthDate = [...birthDates][0] || (aiDate && formatDate(aiDate));
        const insNumbers = new Set([matrix?.INS, ...[data.nirMatches || []].flat(),
            ...sources.flatMap(text => text.match(/\b[12]\d{12}\s?\d{2}\b/g) || [])]
            .map(value => String(value || "").replace(/\s/g, "")).filter(value => /^[12]\d{14}$/.test(value)));
        const families = [...new Set(groups.flatMap(group => group.families))];
        return { fullNames, families, birthDate, ins: [...insNumbers][0],
            conflict: conflictingNames || birthDates.size > 1 || insNumbers.size > 1 };
    }

    function form() {
        const mode = [...document.querySelectorAll(modeSelector)].find(visible);
        const panel = mode?.closest(formSelector);
        return panel?.parentElement.closest(formSelector) || panel;
    }

    // Les changements de mode, la grille et le compteur sont des mises à jour DOM distinctes.
    function waitFor(read, isCurrent) {
        return new Promise(resolve => {
            const finish = value => { observer.disconnect(); clearTimeout(timer); resolve(value); };
            const check = () => {
                if (!isCurrent()) return finish(null);
                const value = read();
                if (value) finish(value);
            };
            const observer = new MutationObserver(check);
            const timer = setTimeout(() => finish(null), 9000);
            observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
            check();
        });
    }

    function controls(panel, type) {
        const input = panel?.querySelector(type === "Naissance" ? '[id$="_TextBoxRecherchePatientByDate"]' : '[id$="_TextBoxRecherche"]');
        const button = panel?.querySelector('[id$="_ButtonRecherchePatient"]');
        if (visible(input) && !input.disabled && visible(button) && !button.disabled) return { input, button };
    }

    function ready(isCurrent, confirmed = false) {
        return waitFor(() => {
            if (confirmed) {
                const button = document.querySelector("#messageContainer .button.valid");
                return visible(button) && !button.disabled;
            }
            const panel = form();
            return controls(panel, panel?.querySelector(modeSelector)?.value);
        }, isCurrent);
    }

    function grid(panel) {
        const table = panel?.querySelector('[id$="_PatientsGridOld"], [id$="_PatientsGrid"]');
        const links = [...(table?.querySelectorAll(resultSelector) || [])].filter(visible);
        const count = panel?.querySelector('[id$="_LabelPatientCount"]');
        return { table, links, count, total: count?.textContent.trim(), text: table?.textContent };
    }

    async function query(type, value, isCurrent) {
        const panel = await waitFor(form, isCurrent);
        if (!panel) return null;
        const mode = panel.querySelector(modeSelector);
        if (![...mode.options].some(option => option.value === type)) return { unavailable: true };
        const changed = mode.value !== type;
        const previous = controls(panel, type);
        const previousTitle = previous?.button.title;
        if (changed) {
            mode.value = type;
            mode.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const fields = await waitFor(() => {
            const current = form();
            if (current?.querySelector(modeSelector)?.value !== type) return null;
            const fields = controls(current, type);
            if (changed && previous && fields?.input === previous.input && fields?.button === previous.button
                && fields.button.title === previousTitle) return null;
            return fields;
        }, isCurrent);
        if (!fields || !isCurrent()) return null;
        const current = form();
        if (type === "Naissance") {
            for (const filter of current.querySelectorAll('[id$="_TextBoxNomForDN"], [id$="_TextBoxPrenomForDN"]')) {
                filter.value = "";
                filter.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        fields.input.value = value;
        fields.input.dispatchEvent(new Event("input", { bubbles: true }));
        const before = grid(current);
        fields.button.click();
        return waitFor(() => {
            const panel = form();
            if (!panel || [...panel.querySelectorAll('[id*="_UpdateProgress"]')].some(visible)) return null;
            const after = grid(panel);
            if (after.total === "0" && (after.count !== before.count || before.total !== "0") && !after.links.length) return after;
            if (!after.links.length || (after.table === before.table && after.links[0] === before.links[0] && after.text === before.text)) return null;
            if (/^\d+$/.test(after.total) && Number(after.total) !== after.links.length) return null;
            return after;
        }, isCurrent);
    }

    async function search(data, base, isCurrent) {
        const patient = await identity(data, base);
        if (patient.conflict) return "Les identités indiquées dans ce courrier divergent. Vérifiez le patient.";
        const names = patient.families.length ? patient.families : patient.fullNames.map(name => {
            const family = name.match(/^([\p{Lu}][\p{Lu}'’ -]*)(?=\s+\p{Lu}\p{Ll})/u);
            return family ? family[1].trim() : name;
        });
        const attempts = [["InsSearch", patient.ins], ["Nom", patient.ins?.slice(0, 13)], ["Naissance", patient.birthDate],
            ...names.map(name => ["Nom", name])].filter(([, value]) => value);
        if (!attempts.length) return "Aucune identité exploitable dans ce courrier. Recherche manuelle requise.";
        for (const [type, value] of attempts) {
            const result = await query(type, value, isCurrent);
            if (!result) return "Weda n’a pas confirmé la mise à jour de la recherche. Rouvrez la recherche patient.";
            if (result.unavailable) continue;
            const byIns = type === "InsSearch" || (type === "Nom" && value === patient.ins?.slice(0, 13));
            const matches = result.links.filter(link => {
                const row = link.closest("tr");
                const dob = row?.querySelector(birthSelector)?.textContent.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
                const displayedBirth = dob && [dob[1].padStart(2, "0"), dob[2].padStart(2, "0"), dob[3]].join("/");
                if (patient.birthDate && (displayedBirth || !byIns) && displayedBirth !== patient.birthDate) return false;
                const candidate = link.textContent.trim();
                if (patient.fullNames.length) return patient.fullNames.some(name => sameName(name, candidate));
                if (patient.families.length) return !!patient.birthDate && patient.families.some(name =>
                    nameKey(candidate).startsWith(nameKey(name) + " "));
                return byIns;
            });
            if (matches.length > 1) return "Plusieurs dossiers correspondent à cette identité. Sélectionnez le patient manuellement.";
            if (matches.length === 1 && isCurrent()) {
                const link = matches[0];
                const name = [link.textContent.trim(), link.closest("tr")?.querySelector(birthSelector)?.textContent.trim()].filter(Boolean).join(" ");
                clicCSPLockedElement("#" + CSS.escape(link.id));
                const applied = await waitFor(() => !form() && visible(document.querySelector("#messageContainer .button.valid")), isCurrent);
                if (applied && isCurrent()) addPatientNameDisplay(name, link);
                return applied ? null : "Weda n’a pas confirmé le dossier sélectionné. Vérifiez le patient.";
            }
        }
        return "Aucun dossier ne correspond aux éléments d’identité du courrier. Recherche manuelle requise.";
    }

    return { labels, form, ready, search };
})();
