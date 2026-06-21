/**
 * @file src/features/vueTraitements.js
 * @description Ajoute la possibilité d’une impression de la vue des traitement
 * 
 */

addTweak('/FolderMedical/PopUpPanneauSynthetiqueForm.aspx', '*TweakVueTraitements', function () {
    const buttonToAnnexButton = document.querySelector('#PanneauClassTheraGraphiqueUCForm1_LabelTitleSatisfaction');
    
    /**
     * Prépare et formate le DOM pour une impression multi-pages
     */
    function prepareAndPrint() {
        // Récupérer les informations du patient
        const patientName = document.querySelector('#PanneauClassTheraGraphiqueUCForm1_LabelPatient')?.textContent || '';
        const patientBirthDate = document.querySelector('#PanneauClassTheraGraphiqueUCForm1_LabelPatientDateNaissance')?.textContent || '';
        const patientAge = document.querySelector('#PanneauClassTheraGraphiqueUCForm1_LabelPatientAge')?.textContent || '';
        
        // Récupérer tous les éléments de titre de médicaments (lignes)
        const medicationTitles = document.querySelectorAll('.objectCTTitle');
        
        // Récupérer tous les éléments de prescription (barres colorées)
        const prescriptions = document.querySelectorAll('.objectCT');
        
        // Récupérer les mois (entêtes temporelles)
        const months = document.querySelectorAll('.objectCTMonthYear');
        
        // Créer un nouveau document HTML pour l'impression
        let printContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Vue des traitements - ${patientName}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 1cm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            margin: 0;
            padding: 10px;
        }
        
        .header {
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #606060;
            background-color: #f5f5f5;
            page-break-after: avoid;
        }
        
        .patient-name {
            font-weight: bold;
            font-size: 12pt;
        }
        
        .medication-section {
            margin-bottom: 15px;
            page-break-inside: avoid;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
        }
        
        .medication-title {
            font-weight: bold;
            background-color: #ffffff;
            padding: 5px;
            margin-bottom: 5px;
            border-left: 3px solid #000;
        }
        
        .prescription-item {
            margin: 5px 0;
            padding: 8px;
            border-left: 4px solid;
            background-color: #f9f9f9;
            page-break-inside: avoid;
        }
        
        .prescription-date {
            font-weight: bold;
            color: #00218F;
        }
        
        .prescription-detail {
            margin-top: 3px;
            font-size: 9pt;
        }
        
        .timeline {
            margin-bottom: 20px;
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #fffef0;
            page-break-inside: avoid;
        }
        
        .timeline-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .month-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        
        .month-item {
            padding: 3px 6px;
            background-color: #FFE270;
            color: #00218F;
            font-size: 8pt;
            border-radius: 3px;
        }
        
        @media print {
            .medication-section {
                page-break-inside: avoid;
            }
            
            .prescription-item {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="patient-name">${patientName}</div>
        <div>${patientBirthDate} ${patientAge}</div>
    </div>
`;
        
        // Ajouter la timeline des mois
        if (months.length > 0) {
            printContent += `
    <div class="timeline">
        <div class="timeline-title">Période couverte :</div>
        <div class="month-list">`;
            
            months.forEach(month => {
                const monthText = month.textContent.replace(/\s+/g, ' ').trim();
                printContent += `<span class="month-item">${monthText}</span>`;
            });
            
            printContent += `
        </div>
    </div>`;
        }
        
        // Créer un mapping des médicaments et leurs prescriptions
        const medicationMap = new Map();
        
        medicationTitles.forEach(title => {
            const titleText = title.textContent.trim();
            const titleTop = parseInt(title.style.top) || 0;
            
            medicationMap.set(titleTop, {
                title: titleText,
                prescriptions: []
            });
        });
        
        // Associer les prescriptions aux médicaments
        prescriptions.forEach(presc => {
            const prescTop = parseInt(presc.style.top) || 0;
            const prescText = presc.textContent.trim();
            
            // Trouver le médicament le plus proche (même ligne ou légèrement différent)
            let closestTop = null;
            let minDiff = Infinity;
            
            for (const [top, data] of medicationMap) {
                const diff = Math.abs(top - prescTop);
                if (diff < minDiff && diff < 30) { // Tolérance de 30px
                    minDiff = diff;
                    closestTop = top;
                }
            }
            
            if (closestTop !== null) {
                // Chercher le tooltip associé pour plus d'infos
                const prescId = presc.id;
                const tooltipId = 'Over' + prescId;
                const tooltip = document.getElementById(tooltipId);
                let detailText = prescText;
                
                if (tooltip) {
                    const tooltipContent = tooltip.innerHTML
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<b>(.*?)<\/b>/gi, '$1')
                        .replace(/<[^>]*>/g, '')
                        .trim();
                    detailText = tooltipContent;
                }
                
                medicationMap.get(closestTop).prescriptions.push({
                    text: prescText,
                    detail: detailText,
                    color: presc.style.backgroundColor || '#917D00'
                });
            }
        });
        
        // Générer le HTML pour chaque médicament
        const sortedMedications = Array.from(medicationMap.entries()).sort((a, b) => a[0] - b[0]);
        
        sortedMedications.forEach(([top, data]) => {
            if (data.prescriptions.length > 0) {
                printContent += `
    <div class="medication-section">
        <div class="medication-title">${data.title}</div>`;
                
                data.prescriptions.forEach(presc => {
                    const lines = presc.detail.split('\n').filter(line => line.trim());
                    const dateMatch = lines[0]?.match(/\d{2}\/\d{2}\/\d{4}/);
                    const date = dateMatch ? dateMatch[0] : '';
                    
                    printContent += `
        <div class="prescription-item" style="border-color: ${presc.color}">
            ${date ? `<div class="prescription-date">${date}</div>` : ''}
            <div class="prescription-detail">`;
                    
                    lines.forEach(line => {
                        if (!line.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            printContent += `${line}<br>`;
                        }
                    });
                    
                    printContent += `
            </div>
        </div>`;
                });
                
                printContent += `
    </div>`;
            }
        });
        
        printContent += `
</body>
</html>`;
        
        // Ouvrir une nouvelle fenêtre pour l'impression
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Attendre que le contenu soit chargé avant d'imprimer
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    // La fenêtre restera ouverte pour permettre à l'utilisateur de vérifier le résultat
                }, 250);
            };
        } else {
            alert("Impossible d'ouvrir la fenêtre d'impression. Veuillez autoriser les pop-ups pour ce site.");
        }
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