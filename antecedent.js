addTweak('https://secure.weda.fr/FolderMedical/AntecedentForm.aspx', '*trimCIM10', function () {
    function addCheckBox() {
        let checkbox = document.querySelector('#trim');
        if (!checkbox) {
            getOption('trimCIM10', function (trimCIM10) {
                // Ajoute une checkbox nommée "trim" à côté de '#ContentPlaceHolder1_CheckBoxUserPreferenceShowFavoriCIM10'
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'trim';
                checkbox.title = 'Weda-Helper : permet de masquer les CIM10 secondaires pour faciliter la recherche';
                checkbox.checked = trimCIM10;
                checkbox.style = 'margin-left: 10px;';
                let label = document.createElement('label');
                label.htmlFor = 'trim';
                label.appendChild(document.createTextNode('Trim'));
                label.title = 'Weda-Helper : permet de masquer les CIM10 secondaires pour faciliter la recherche';
                let parent = document.querySelector('#ContentPlaceHolder1_CheckBoxUserPreferenceShowFavoriCIM10').parentNode.parentNode;
                parent.appendChild(checkbox);
                parent.appendChild(label);

                // Enregistre la valeur de la checkbox dans le local storage en cas de changement
                checkbox.addEventListener('change', function () {
                    console.log('checkbox changed', checkbox.checked);
                    chrome.storage.local.set({ 'trimCIM10': checkbox.checked });
                    if (checkbox.checked) {
                        removeSecondaryCIM10();
                        sortAtcd();
                    } else {
                        let searchButton = document.querySelector('#ContentPlaceHolder1_ButtonFind');
                        searchButton.click();
                    }
                });
            });
        }
    }

    function addSortCheckBox() {
        let checkbox = document.querySelector('#sort');
        if (!checkbox) {
            getOption('sortCIM10', function (sortCIM10) {
                // Ajoute une checkbox nommée "sort" à côté de '#ContentPlaceHolder1_CheckBoxUserPreferenceShowFavoriCIM10'
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'sort';
                checkbox.title = 'Weda-Helper : permet de trier les ATCD par ordre alphabétique';
                checkbox.checked = sortCIM10;
                checkbox.style = 'margin-left: 10px;';
                let label = document.createElement('label');
                label.htmlFor = 'sort';
                label.appendChild(document.createTextNode('Sort'));
                label.title = 'Weda-Helper : permet de trier les ATCD par ordre alphabétique';
                let parent = document.querySelector('#ContentPlaceHolder1_CheckBoxUserPreferenceShowFavoriCIM10').parentNode.parentNode;
                parent.appendChild(checkbox);
                parent.appendChild(label);

                // Enregistre la valeur de la checkbox dans le local storage en cas de changement
                checkbox.addEventListener('change', function () {
                    console.log('checkbox changed', checkbox.checked);
                    chrome.storage.local.set({ 'sortCIM10': checkbox.checked });
                    if (checkbox.checked) {
                        sortAtcd();
                    } else {
                        let searchButton = document.querySelector('#ContentPlaceHolder1_ButtonFind');
                        searchButton.click();
                    }
                });
            });
        }
    }

    function removeSecondaryCIM10() {
        getOption('trimCIM10', function (trimCIM10) {
            if (!trimCIM10) {
                return;
            }
            let atcdsToTrim = document.querySelectorAll('#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10n1Nodes table');
            atcdsToTrim.forEach(function (atcd) {
                let elementContainingCIM10 = atcd.querySelector('table > tbody > tr > td > a > span:nth-child(3)');
                if (elementContainingCIM10) {
                    let cim10 = elementContainingCIM10.innerText;
                    // RegExp pour détecter une deuxième décimale
                    let regex = /\[\w+\.\d{2,}\]/;
                    if (regex.test(cim10)) {
                        // Supprime l'élément atcd si la valeur CIM10
                        // contient une deuxième décimale
                        atcd.remove();

                    }
                };
            });
        });
    }

    function sortAtcd() {
        let atcds = document.querySelectorAll('#ContentPlaceHolder1_ArbreCim10UCForm1_TreeViewCim10n1Nodes table');
        getOption('sortCIM10', function (sortCIM10) {
            if (atcds.length > 0 && sortCIM10) {
                // Supposons que atcds est une NodeList ou un tableau d'éléments DOM
                // et que chaque atcd a un parent commun direct.

                // 1. Sélectionner le parent (supposons que tous les atcds ont le même parent direct)
                const parent = atcds[0].parentNode;
                if (parent.dataset.sorted === 'true') {
                    return;
                }
                // 2. Convertir NodeList en Array si nécessaire
                const atcdsArray = Array.from(atcds);

                // 3. Trier le tableau d'éléments
                atcdsArray.sort(function (a, b) {
                    let aText = a.querySelector('span:nth-child(2)').innerText;
                    let bText = b.querySelector('span:nth-child(2)').innerText;
                    return aText.localeCompare(bText);
                });

                // 4. Supprimer les éléments existants du DOM
                atcdsArray.forEach(atcd => parent.removeChild(atcd));

                // 5. Réinsérer les éléments triés
                atcdsArray.forEach(atcd => parent.appendChild(atcd));

                // 6. Ajouter un marqueur au parent pour indiquer que les éléments ont été triés
                parent.dataset.sorted = 'true';
            }
        });
    }

    function shrinkFavText() {
        let element = document.querySelector('[for="ContentPlaceHolder1_CheckBoxUserPreferenceShowFavoriCIM10"]');
        element.innerText = 'Fav.';
    }


    addCheckBox();
    addSortCheckBox();
    shrinkFavText();
    // Ajoute la checkbox à chaque fois que l'arbre CIM10 est mis à jour
    let refractory = false;
    afterMutations(200, function () {
        if (refractory) {
            return;
        }
        if (!refractory) {
            refractory = true;
            shrinkFavText();
            addCheckBox();
            addSortCheckBox();
            removeSecondaryCIM10();
            sortAtcd();
            setTimeout(function () {
                refractory = false;
            }, 200);
        }
    }, 'adding checkbox', true);
});