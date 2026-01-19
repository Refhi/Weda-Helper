// Fonctions permettant de mettre automatiquement la date à J+1 d'une noémie automatique d'un fichier transmis par le Companion
addTweak('/FolderGestion/NoemieForm.aspx', '*noemieDate', function() {
    waitForElement({
        selector: "select[id='ContentPlaceHolder1_ListBoxSelection']",
        callback: function (elements) {
            let noemieSelect = elements[0];
            noemieSelect.onchange = (event) => {
                
                setTimeout(() => {
                    var nomInput = document.getElementById("ContentPlaceHolder1_TextBoxRecetteLibelle");
                    var name = nomInput.value;
                    var nameArray = {
                        "TOULOUSE": "CPAM TOULOUSE",
                        "ALBI": "CPAM ALBI",
                        "MONT DE MARSAN":"CPAM MONT DE MARSAN",
                        "CPAM de Rouen-Elbeuf-Dieppe-Seine-Maritime":"CPAM R.E.D.76",
                        "PAU":"CPAM PAU",
                        "PARIS":"CPAM 75 PRESTATIONS",
                        "AGEN":"CPAM AGEN",
                        "NICE":"CPAM 061 NICE",
                        "BAYONNE":"CPAM DE BAYONNE",
                        "LA ROCHELLE":"CPAM DE LA ROCHELLE",
                        "RODEZ":"CPAM RODEZ",
                        "PERIGUEUX":"CPAM PERIGUEUX",
                        "CARCASSONNE":"CPAM CARCASSONNE",
                        "VANNES":"CPAM DU MORBIHAN - COURANT",
                        "TARBES":"CPAM TARBES",
                        "TULLE":"CPAM TULLE",
                        "Organisme 901":"CAVIMAC",
                        "NANTERRE":"CPAM HAUTS DE SEINE SEPA",
                        "Organisme 004110000":"CAISSE PREVOYANCE ET RETRAIT",
                        "MGP BOURG EN BRESSE":"SECURITE SOCIALE MGP",
                        "Organisme SO0010000":"CETIP CETIP",
                        "Organisme AL0010000": "ALMERYS",
                        "Organisme SP0080000" : "CETIP CETIP",
                        "Organisme VM0030000":"HARMONIE MUTUELLES",
                        "Organisme VM0010000":"KORELIO PRESTATIONS",
                        "Organisme AC0010000":"ACTIL SAS",
                        "Caisse de Ret.et Prev. Clercs et Emp. Notaires":"CRPCEN M",
                        "Organisme 091007311":"MGEN",
                        "Organisme 091007971" : "MGEN",
                        "Organisme 091007861" : "MGEN",
                        "Organisme 91919000" : "MGEN",
                        "Organisme 01908000":"CPRPF RG",
                        "CNMSS Affilies":"DDFIP DU VAR",
                        "Organisme CB1010000":"SWISSLIFE PREVOYANCE ET SANT"
                    };
                    var isMGEN = false;
                    var isCetip = false;
                    for (const [key, value] of Object.entries(nameArray)) {
                        if (name == key) {
                            nomInput.value = value;
                            if (value == "MGEN")
                            {
                                isMGEN = true;
                            }
                            if (value == "CETIP CETIP")
                            {
                                isCetip = true;
                            }

                        }
                    }
                    var selectedDate = event.target.value;
                    var dateInput = document.getElementById("ContentPlaceHolder1_TextBoxRecetteDate");
                    if (isMGEN) {
                        dateInput.value = ajouterJour(selectedDate, 3);
                    }
                    else if (isCetip) {
                        dateInput.value = selectedDate;
                    }  
                    else {
                        dateInput.value = ajouterJour(selectedDate, 1);
                    }
                    
                    var change = new Event('change');
                    dateInput.dispatchEvent(change);

                    
                }, "500");
            }
        }
    });  
});

function ajouterJour(dateStr, numDay) {
  // On découpe la chaîne en jour, mois, année
  const [jour, mois, annee] = dateStr.split('/').map(num => parseInt(num, 10));

  // On crée une nouvelle date avec les valeurs extraites
  let date = new Date(annee, mois - 1, jour); // Le mois commence à 0 en JS

  // On ajoute un jour à la date
  date.setDate(date.getDate() + numDay);
  if (date.getDay() == 6) { //Si date tombe un samedi, ajouter 2 jours
    date.setDate(date.getDate()+2);
  }
  else if (date.getDay() == 0) {//Si date tombe un dimanche, ajouter 1 jour
    date.setDate(date.getDate()+1);
  }

  // On formate la nouvelle date au format jj/mm/yyyy
  const jourAjoute = String(date.getDate()).padStart(2, '0');
  const moisAjoute = String(date.getMonth() + 1).padStart(2, '0');
  const anneeAjoute = date.getFullYear();

  return `${jourAjoute}/${moisAjoute}/${anneeAjoute}`;
}