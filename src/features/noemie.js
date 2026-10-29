// Fonctions permettant de mettre automatiquement la date à J+1 d'une noémie automatique d'un fichier transmis par le Companion
addTweak('/FolderGestion/NoemieForm.aspx', 'autoNoemie',  function() {
    waitForElement({
        selector: "select[id='ContentPlaceHolder1_ListBoxSelection']",
        callback: function (elements) {
            let noemieSelect = elements[0];
            noemieSelect.onchange = (event) => {
                setTimeout(() => {
                    //Tiemout pour laisser le temps au DOM de s'actualiser
                    ajustNoemie(event);
                }, "500");
            };
        }
    });  
});

async function ajustNoemie(event)
{
    var noemieInput = document.getElementById("ContentPlaceHolder1_TextBoxRecetteLibelle");
    var dateInput = document.getElementById("ContentPlaceHolder1_TextBoxRecetteDate");
    var noemieName = noemieInput.value;
    var selectedDate = event.target.value;
    var substitute = null;

    var noemieSubstitutionTable = await getOptionPromise('autoNoemieSubstitutionTable');
    noemieSubstitutionTable=JSON.parse(noemieSubstitutionTable);
    for (const element of noemieSubstitutionTable) {
        const organismeName = element[0] ?? "";
        if (organismeName.toUpperCase() == noemieName.toUpperCase()) {
            substitute = element;
            break;
        }
    }
    if (substitute) {
        noemieInput.value = substitute[1][0] ?? ""; //Substitution du nom de l'organisme pour le nom de substitution
        var delaiJours = Number(substitute[1][1]) ?? 0; 
        dateInput.value = ajouterJour(selectedDate, delaiJours);
        var change = new Event('change');
        dateInput.dispatchEvent(change);
    }
    
}

function ajouterJour(dateStr, numDay) {

  const [jour, mois, annee] = dateStr.split('/').map(num => parseInt(num, 10));
  const date = new Date(annee, mois - 1, jour); // Le mois commence à 0 en JS

  date.setDate(date.getDate() + numDay);
  if(date.getDay() == 0) { //Si dimanche ajout de 1 jour car virements des caisses ne se font que du lundi au vendredi
    date.setDate(date.getDate() + 1);
  }
  else if (date.getDay() == 6){ //Si samedi ajout de 2 jours
    date.setDate(date.getDate() + 2);
  }
  const jourAjoute = String(date.getDate()).padStart(2, '0');
  const moisAjoute = String(date.getMonth() + 1).padStart(2, '0');
  const anneeAjoute = date.getFullYear();

  return `${jourAjoute}/${moisAjoute}/${anneeAjoute}`;
}