/** Recherche d'un patient dans le formulaire asynchrone de la messagerie sécurisée. */
const echangesPatientSearch = (() => {
    const formSelector = '[id$="_PanelFindPatient"], [id$="_PanelPatient"]';
    const modeSelector = 'select[id$="_DropDownListRechechePatient"]';
    const resultSelector = 'a[id*="_LinkButtonPatientGetNomPrenom_"], a[id*="_LinkButtonOldPatientGetNomPrenom_"]';
    const birthSelector = '[id*="PatienDateNaissance_"], [id*="PatientDateNaissance_"]';
    const visible = element => !!element?.getClientRects().length && getComputedStyle(element).visibility !== "hidden";

    function labels() {
        const result = [...document.querySelectorAll("#messageContainer .messageClassement, #messageList .selected .messageClassement")]
            .map(element => element.innerText.trim()).filter(text => /^patient\s*:/i.test(text));
        const line = document.querySelector("#messageList .messageListItem.selected .messageLineItem");
        const patient = line?.querySelector(".patientLine")?.cloneNode(true);
        patient?.querySelectorAll(".dossierChip").forEach(chip => chip.remove());
        const name = patient?.textContent.trim().replace(/^patient\s*:\s*/i, "");
        const subject = line?.querySelector(".subjectLine")?.textContent.trim() || "";
        if (name && /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(name) && nameKey(name).includes(" ")) {
            // Certains expéditeurs accolent la naissance au nom en fin d'objet. La date
            // d'envoi du message et les dates isolées de compte rendu ne sont pas des DDN.
            const birth = subject.match(/(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\s*\)?$/);
            const beforeDate = birth && subject.slice(0, birth.index)
                .replace(/[\s(,-]*(?:\bn[ée](?:e|\(e\))?\s+le|\bddn|\bdate de naissance)\s*:?\s*$/i, "").replace(/[\s(]+$/, "");
            const nameLength = nameKey(name).split(" ").length;
            const hasName = birth && /[\p{L}\p{M}]$/u.test(beforeDate)
                && sameName(nameKey(beforeDate).split(" ").slice(-nameLength).join(" "), name);
            result.push("Patient : " + name + (hasName ? " " + birth[1] : ""));
        }
        // Sans ligne patient, les envois MSSanté portent souvent les traits dans
        // l'objet, après le type de document. Ne pas lire une date d'envoi isolée.
        const suffix = subject.match(/\b(?:pour\s+(?:monsieur|madame|mme|mr|m\.)\s+|(?:CR (?:d['’](?:examens? biologiques?|imagerie médicale)|opératoire|ou fiche de consultation ou de visite)|lettre de liaison à la sortie d['’]un établ(?:issement)?|courrier du \d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s+)([\p{L}\p{M}'’ -]+?)\s*(?:[,(-]?\s*n[ée](?:e|\(e\))?\s+le\s*)?(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\s*\)?$/iu);
        if (suffix && nameKey(suffix[1]).includes(" ")) result.push("Patient : " + suffix[1].trim() + " " + suffix[2]);
        return [...new Set(result)];
    }

    function nameKey(name) {
        return normalizeString(name || "").replace(/[^\p{L}]+/gu, " ").trim();
    }

    function sameName(a, b) {
        return nameKey(a).split(" ").sort().join(" ") === nameKey(b).split(" ").sort().join(" ");
    }

    // Conserver ensemble les noms et prénoms de chaque source. Le corps du message peut
    // porter toute l'identité alors que le PDF contient uniquement un compte rendu.
    function readNames(text, references = []) {
        const families = [...text.matchAll(/(?:^|\n)\s*nom(?:\s+d['’ ]usage|\s+de\s+naissance)?\s*:\s*([^\n;:]+)/gi)].map(m => m[1].trim());
        const given = text.match(/(?:^|\n)\s*pr[ée]noms?\s*:\s*([^\n;:]+)/i)?.[1].trim();
        const aliases = given ? families.map(family => family + " " + given) : [];
        const labelled = /\bpatiente?\s*:\s*([\p{L}][\p{L}\p{M}'’ -]*?)(?=\s*[-,(]?\s*(?:n[ée](?:e|\(e\))?\s+le\b|\d{1,2}[/.-]|$))/gimu;
        // « Monsieur Prénom NOM né NOM DE NAISSANCE / Né le … » peut être répété
        // dans le même PDF. Le nom de naissance est un trait distinct du nom affiché.
        const civil = [...text.matchAll(/\b(?:Mme|Madame|Monsieur|M\.)[ \t]+([\p{L}][\p{L}\p{M}'’ -]*?)[\s(,–-]+n[ée](?:e|\(e\))?[ \t]+(?:([\p{L}][\p{L}\p{M}'’ -]*?)[,)]?\s+(?:n[ée](?:e|\(e\))?\s+)?)?le\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\b/giu)];
        const hospital = [...text.matchAll(/\bvotre\s+patient(?:\(e\)|e)?\s+([\p{L}\p{M} .'’-]+?)\s+n[ée](?:\(e\)|e)?\s+(?:([\p{L}\p{M} '’-]+?)\s+)?le\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\b/giu)];
        const withBirth = [...hospital, ...civil];
        // « Mme USAGE née NAISSANCE Prénom(s) le … » : le deuxième groupe est
        // l'identité complète seulement si l'objet Weda confirme ce nom et cette DDN.
        const usual = civil.filter(match => !nameKey(match[1]).includes(" ") && match[2] && references.some(ref =>
            displayedBirthDate(match[3]) === ref.birth && sameName(match[2], ref.full)));
        const named = [...withBirth, ...text.matchAll(labelled)].map(match => (usual.includes(match) ? match[2] : match[1]).trim());
        const full = aliases.length ? aliases : named.slice(0, 1);
        const conflict = named.some(name => !full.some(alias => sameName(name, alias)));
        return { families, full, conflict, births: withBirth.map(match => match[3]),
            usual: usual.map(match => ({ family: nameKey(match[1]), full: nameKey(match[2]) })),
            birthFamilies: withBirth.filter(match => !usual.includes(match)).map(match => match[2]).filter(Boolean).map(nameKey) };
    }

    async function identity(data, base) {
        const sources = [base.pdfText || "", base.messageBody || "", ...base.patientLabels];
        const references = base.patientLabels.flatMap(label => {
            const match = label.match(/^patiente?\s*:\s*([\p{L}\p{M}'’ -]+?)\s*\(?(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\)?\s*$/iu);
            return match && nameKey(match[1]).includes(" ") ? [{ full: match[1], birth: displayedBirthDate(match[2]) }] : [];
        });
        const groups = sources.map((text, index) => readNames(text, index === 0 ? references : []));
        const matrix = data.dataMatrix;
        if (matrix?.Nom && matrix.Prenoms) groups.unshift({ families: [matrix.Nom], full: [matrix.Nom + " " + matrix.Prenoms] });
        const named = groups.filter(group => group.full.length);
        const fullNames = named.length ? named[0].full : (data.nameMatches || []).filter(name => nameKey(name).includes(" "));
        const conflictingNames = named.some(group => group.conflict || !group.full.some(name => fullNames.some(other => sameName(name, other))));
        const dates = sources.flatMap(text => [...text.matchAll(PDF_PATIENT_BIRTH_DATE)].map(match => match[1]))
            .concat(groups.flatMap(group => group.births || []));
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
        const conflicts = [];
        if (conflictingNames) conflicts.push("nom et prénom");
        if (new Set(groups.flatMap(group => group.birthFamilies || [])).size > 1) conflicts.push("nom de naissance");
        if (birthDates.size > 1) conflicts.push("date de naissance");
        if (insNumbers.size > 1) conflicts.push("identifiant national de santé");
        return { fullNames, families, birthDate, documentedNameAndBirth: named.length > 0 && birthDates.size === 1,
            usual: groups.flatMap(group => group.usual || []), ins: [...insNumbers][0], conflicts };
    }

    function form() {
        const mode = [...document.querySelectorAll(modeSelector)].find(visible);
        const panel = mode?.closest(formSelector);
        return panel?.parentElement.closest(formSelector) || panel;
    }

    // Les changements de mode, la grille et le compteur sont des mises à jour DOM distinctes.
    function waitFor(read, isCurrent, timeout = 9000) {
        return new Promise(resolve => {
            const finish = value => { observer.disconnect(); clearTimeout(timer); resolve(value); };
            const check = () => {
                if (!isCurrent()) return finish(null);
                const value = read();
                if (value) finish(value);
            };
            const observer = new MutationObserver(check);
            const timer = setTimeout(() => finish(null), timeout);
            observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
            check();
        });
    }

    function controls(panel, type) {
        const input = panel?.querySelector(type === "Naissance" ? '[id$="_TextBoxRecherchePatientByDate"]' : '[id$="_TextBoxRecherche"]');
        const button = panel?.querySelector('[id$="_ButtonRecherchePatient"]');
        if (visible(input) && !input.disabled && visible(button) && !button.disabled) return { input, button };
    }

    // MSSanté propose aussi les dossiers directement dans le formulaire d'import.
    // Les colonnes supplémentaires (ville, statut INS…) varient suivant la version.
    function candidateColumns(table) {
        for (const row of table?.rows || []) {
            const headers = [...row.cells].map(cell => normalizeString(cell.textContent).replace(/\s+/g, " "));
            const name = headers.indexOf("patient"), birth = headers.indexOf("date de naissance"), action = headers.indexOf("action");
            if ([name, birth, action].every(index => index >= 0)) return { name, birth, action };
        }
    }

    function candidateFromAction(action, columns) {
        if (!action || !/^importer\s+le\s+message$/i.test(action.textContent.trim())) return null;
        const row = action.closest("tr");
        columns ||= candidateColumns(row?.closest("table"));
        if (columns && action.closest("td") !== row.cells[columns.action]) return null;
        const link = row?.cells[columns?.name ?? 1]?.querySelector("a");
        const birth = row?.cells[columns?.birth ?? 2]?.textContent.trim() || "";
        return link?.textContent.trim() ? { link, name: link.textContent.trim(), birth, action } : null;
    }

    function candidates() {
        const result = [];
        for (const table of document.querySelectorAll("#messageContainer .docImportBody table")) {
            const columns = visible(table) && candidateColumns(table);
            if (!columns) continue;
            for (const row of [...table.rows].slice(1)) {
                const action = row.cells[columns.action]?.querySelector("a");
                const candidate = visible(action) && candidateFromAction(action, columns);
                if (candidate) result.push(candidate);
            }
        }
        return result.length ? result : null;
    }

    function matchingSuggestions(rows, patient) {
        if (!patient.documentedNameAndBirth) return [];
        return rows.filter(row => patient.fullNames.some(name => sameName(name, row.name))
            && displayedBirthDate(row.birth) === patient.birthDate);
    }

    function displayedBirthDate(text) {
        const date = text?.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
        return date ? [date[1].padStart(2, "0"), date[2].padStart(2, "0"), date[3]].join("/") : null;
    }

    // La grille affiche « NOM Prénom » et range le nom de naissance dans une
    // autre colonne. Vérifier le prénom entier et la DDN avant d'utiliser cet alias.
    function matchesFullName(link, patient, displayedBirth) {
        const display = link.textContent.trim();
        if (patient.fullNames.some(name => sameName(name, display))) return true;
        if (!patient.documentedNameAndBirth || displayedBirth !== patient.birthDate) return false;
        const row = link.closest("tr");
        const birthFamily = row?.querySelector('[id*="PatientNomJeuneFille_"]')?.textContent.trim();
        if (!birthFamily) return false;
        const pieces = display.split(/\s+/);
        const given = row.querySelector('[id*="PatientPrenom_"]')?.textContent.trim() || (pieces.length === 2 ? pieces[1] : null);
        return !!given && patient.fullNames.some(name => sameName(name, birthFamily + " " + given));
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
        document.querySelectorAll(".whEchangesUsageHint").forEach(hint => hint.remove());
        const patient = await identity(data, base);
        if (patient.conflicts.length) return { notice: "Les identités indiquées dans ce courrier divergent (" + patient.conflicts.join(", ") + "). Vérifiez le patient." };
        let source = await waitFor(() => form() ? "form" : candidates(), isCurrent);
        // La grille de suggestions reste visible DERRIÈRE le sélecteur WebForms.
        // Sur une analyse en cache elle est prête avant même l'ouverture du sélecteur.
        if (Array.isArray(source)) {
            source = await waitFor(form, isCurrent, 1800) ? "form" : candidates();
        }
        if (!source) return { waitForPicker: true, notice: "Pour rouvrir la recherche, cliquez sur « Annuler » dans l’import puis sur « Un patient »." };
        if (source !== "form") {
            const matches = matchingSuggestions(source, patient);
            if (matches.length === 1) {
                // « Importer le message » appartient à Weda. L'utilisateur déclenche cette
                // action après avoir relu le courrier. Le formulaire peut entre-temps être recréé.
                return { waitForPicker: true, focusSuggestion() {
                    const current = matchingSuggestions(candidates() || [], patient);
                    if (current.length !== 1 || current[0].link.href !== matches[0].link.href) return false;
                    const action = current[0].action;
                    const previousOutline = action.style.outline;
                    action.focus();
                    if (document.activeElement !== action) return false;
                    action.style.outline = "2px solid currentColor";
                    action.addEventListener("blur", () => { action.style.outline = previousOutline; }, { once: true });
                    return true;
                } };
            }
            return { waitForPicker: true, notice: matches.length > 1 ? "Plusieurs dossiers correspondent. Choisissez le patient dans le tableau Weda."
                : "Vérifiez le nom et la date de naissance avant de choisir le dossier dans Weda." };
        }
        const failure = await searchForm(patient, isCurrent);
        return failure ? { notice: failure } : null;
    }

    async function searchForm(patient, isCurrent) {
        const names = patient.families.length ? patient.families : patient.fullNames.map(name => {
            const family = name.match(/^([\p{Lu}][\p{Lu}'’ -]*)(?=\s+\p{Lu}\p{Ll})/u);
            return family ? family[1].trim() : name;
        });
        const ins = [["InsSearch", patient.ins], ["Nom", patient.ins?.slice(0, 13)]];
        const birth = ["Naissance", patient.birthDate];
        const attempts = [...(patient.documentedNameAndBirth ? [birth, ...ins] : [...ins, birth]),
            ...[...new Set(names)].map(name => ["Nom", name])].filter(([, value]) => value);
        if (!attempts.length) return "Aucune identité exploitable dans ce courrier. Recherche manuelle requise.";
        for (const [type, value] of attempts) {
            const result = await query(type, value, isCurrent);
            if (!result) return "Weda n’a pas confirmé la mise à jour de la recherche. Rouvrez la recherche patient.";
            if (result.unavailable) continue;
            const byIns = type === "InsSearch" || (type === "Nom" && value === patient.ins?.slice(0, 13));
            const matches = result.links.filter(link => {
                const row = link.closest("tr");
                const displayedBirth = displayedBirthDate(row?.querySelector(birthSelector)?.textContent);
                if (patient.birthDate && (displayedBirth || !byIns) && displayedBirth !== patient.birthDate) return false;
                const candidate = link.textContent.trim();
                if (patient.fullNames.length) return matchesFullName(link, patient, displayedBirth);
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
            // Avec un nom complet et une DDN documentés, tous les résultats de
            // cette date ont été examinés. Les laisser visibles pour la vérification.
            if (type === "Naissance" && patient.documentedNameAndBirth) {
                if (!result.links.length) return "Aucun dossier trouvé à la date de naissance du courrier. Vérifiez l’identité dans Weda.";
                const suggested = result.links.filter(link => {
                    if (displayedBirthDate(link.closest("tr")?.querySelector(birthSelector)?.textContent) !== patient.birthDate) return false;
                    const name = nameKey(link.textContent);
                    return patient.usual.some(({family, full}) => {
                        if (!name.startsWith(family + " ")) return false;
                        const given = name.slice(family.length + 1);
                        return full.endsWith(" " + given) || full.startsWith(given + " ");
                    });
                });
                for (const link of suggested) {
                    const hint = document.createElement("small");
                    hint.className = "whEchangesUsageHint";
                    hint.style.marginInlineStart = "0.5em";
                    hint.textContent = "Nom de naissance à vérifier";
                    link.after(hint);
                }
                if (suggested.length === 1) return "Le nom d’usage, le prénom et la date correspondent sur une ligne. Vérifiez le nom de naissance avant de choisir ce dossier.";
                if (suggested.length > 1) return suggested.length + " dossiers correspondent au nom d’usage, au prénom et à la date. Vérifiez les lignes indiquées avant de choisir.";
                return "Aucun dossier ne réunit le nom et la date de naissance du courrier. Vérifiez les dossiers affichés pour cette date.";
            }
        }
        return "Aucun dossier ne correspond aux éléments d’identité du courrier. Recherche manuelle requise.";
    }

    function clickedResult(target) {
        const action = target.closest?.("a[id*='_LinkButton']");
        const row = action?.closest("tr");
        if (!row || !form()?.contains(row) || !(action.matches(resultSelector) || action.matches(birthSelector))) return null;
        const link = row.querySelector(resultSelector);
        return link && { link, name: link.textContent.trim(), birth: row.querySelector(birthSelector)?.textContent.trim(), classic: true };
    }

    return { labels, form, waitFor, candidateFromAction, candidates, clickedResult, search };
})();
