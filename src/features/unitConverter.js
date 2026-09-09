/**
 * Dans certaines zones de Weda, existent des tableaux .hprimgrid qui contiennent
 * des résultats d'examen dans des unités parfois inadaptées aux usages du praticien
 * Les principales problématiques concernent le cholestérol
 * 
 * On va gérer ici la possibilité de mettre des conversions d'unités affichées au survol
 * de la souris.
 * 
 * On va en prévoir quelques-unes classiques, et permettre à l'utilisateur de personnaliser
 * ceux qu'ils veulent.
 */

addTweak("*", "unitConverter", async function () {
    const selector = ".hprimgrid"
    const hprimTablesElements = document.querySelectorAll(selector)

    const conversionTableOption = await getOptionPromise("unitConverterTable")
    let conversionTable;
    try {
        conversionTable = typeof conversionTableOption === "string" ? JSON.parse(conversionTableOption) : conversionTableOption;
    } catch (e) {
        console.log("[unitConverter] Impossible de parser la table de conversion d'unités", e);
        return;
    }

    if (!conversionTable || conversionTable.length === 0) {
        console.log("[unitConverter] Pas de conversions d'unités configurées");
        return;
    }

    // normalise les nombres écrits avec une virgule et retire les espaces insécables
    function parseHprimValue(text) {
        const cleaned = text.replace(/\u00a0/g, "").trim().replace(",", ".");
        const value = parseFloat(cleaned);
        return isNaN(value) ? null : value;
    }

    // trouve la première règle de conversion dont le libellé et l'unité source correspondent à la ligne
    // structure attendue (format TYPE_JSON) : [libelleMatch, [uniteSource, facteur, uniteCible, decimales?]]
    function findMatchingConversion(libelle, unite) {
        return conversionTable.find(([libelleMatch, [uniteSource]]) =>
            libelle.toUpperCase().includes(libelleMatch.toUpperCase()) &&
            unite.toLowerCase() === uniteSource.toLowerCase()
        );
    }

    // ajoute les styles nécessaires à l'affichage de la popup de conversion (une seule fois)
    function addUnitConverterStyles() {
        if (document.getElementById("unit-converter-styles")) return;
        const styles = document.createElement("style");
        styles.id = "unit-converter-styles";
        styles.textContent = `
            .unit-converter-icon {
                cursor: help;
                position: relative;
                display: inline-block;
                margin-left: 4px;
                color: #284E98;
                font-weight: bold;
            }
            .unit-converter-tooltip {
                display: none;
                position: absolute;
                left: 15px;
                top: -5px;
                background: white;
                color: black;
                padding: 4px 8px;
                border-radius: 4px;
                width: max-content;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                z-index: 1000;
                font-size: 12px;
                font-weight: normal;
                white-space: nowrap;
            }
            .unit-converter-icon:hover .unit-converter-tooltip {
                display: block;
            }
        `;
        document.head.appendChild(styles);
    }

    // crée l'icône "?" avec sa popup de conversion, à insérer à côté de la valeur
    function createConversionIcon(tooltipText) {
        const icon = document.createElement("span");
        icon.className = "unit-converter-icon";
        icon.textContent = "?";

        const tooltip = document.createElement("span");
        tooltip.className = "unit-converter-tooltip";
        tooltip.textContent = tooltipText;

        icon.appendChild(tooltip);
        return icon;
    }

    addUnitConverterStyles();

    hprimTablesElements.forEach((table) => {
        const rows = table.querySelectorAll("tr");
        rows.forEach((row, index) => {
            if (index === 0) return; // ligne d'en-tête

            const cells = row.querySelectorAll("td");
            if (cells.length < 3) return;

            const [libelleCell, valueCell, uniteCell] = cells;
            const libelle = (libelleCell.title || libelleCell.textContent).trim();
            const unite = uniteCell.textContent.replace(/\u00a0/g, "").trim();
            const value = parseHprimValue(valueCell.textContent);

            if (!libelle || !unite || value === null) return;

            const conversion = findMatchingConversion(libelle, unite);
            if (!conversion) return;

            const [, [, facteur, uniteCible, decimales = 2]] = conversion;
            const convertedValue = (value * parseFloat(facteur)).toFixed(decimales);
            const tooltip = `${convertedValue} ${uniteCible}`;

            valueCell.appendChild(createConversionIcon(tooltip));
        });
    });
});