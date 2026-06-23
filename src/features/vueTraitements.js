/**
 * @file src/features/vueTraitements.js
 * @description Ajoute la possibilité d’une impression de la vue des traitement
 * 
 */

addTweak('/FolderMedical/PopUpPanneauSynthetiqueForm.aspx', '*TweakVueTraitements', function () {
    const buttonToAnnexButton = document.querySelector('#PanneauClassTheraGraphiqueUCForm1_LabelTitleSatisfaction');
    
    function prepareAndPrint() {
        // Injection des règles CSS pour l'impression
        const styleId = 'weda-print-fix';
        let style = document.getElementById(styleId);
        
        // Supprimer l'ancien style s'il existe
        if (style) {
            style.remove();
        }
        
        // Créer et injecter les nouvelles règles
        style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @media print {
                /* Reset du body */
                body {
                    margin: 0;
                    padding: 0;
                    overflow: visible !important;
                }
                
                /* Adaptation de la div principale */
                #PanneauClassTheraGraphiqueUCForm1_DivFond {
                    width: 100% !important;
                    height: auto !important;
                    transform: scale(0.9) !important;
                    transform-origin: top left !important;
                    page-break-after: auto !important;
                }
                
                /* Header fixe converti en static pour impression */
                div[style*="position: fixed"] {
                    position: static !important;
                    margin-bottom: 10px !important;
                }
                
                /* Masquer les boutons d'interface */
                input[type="submit"],
                input[type="button"],
                #PanneauClassTheraGraphiqueUCForm1_UpdateProgress1,
                #PanneauClassTheraGraphiqueUCForm1_PanelShowSatisfaction {
                    display: none !important;
                }
                
                /* Optimisation du tableau header */
                table.frameback {
                    width: 100% !important;
                    font-size: 10pt !important;
                }
                
                /* Ajuster les tooltips (non visibles à l'impression) */
                .objectCTToolip {
                    display: none !important;
                }
                
                /* Page en paysage recommandée */
                @page {
                    size: A4 landscape;
                    margin: 10mm;
                }
            }
        `;
        
        document.head.appendChild(style);
        
        // Lancer l'impression
        window.print();
    }
    
    // Ajout d'un bouton avec l'emoji 🖨️ pour imprimer la vue des traitements
    const printButton = document.createElement('button');
    printButton.innerHTML = '🖨️';
    printButton.title = 'Imprimer la vue des traitements';
    printButton.style.marginLeft = '10px';
    
    printButton.addEventListener('click', function () {
        prepareAndPrint();
    });

    buttonToAnnexButton.parentNode.insertBefore(printButton, buttonToAnnexButton.nextSibling);
    
});

/**
 * TODO :
 * - affiner la mise en page pour l’impression via l’édition du CSS
 * - récupérer le pdf généré ?
 */