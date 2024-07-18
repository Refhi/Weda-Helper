addTweak('https://secure.weda.fr/FolderAgenda/AgendaForm.aspx', '*RightClickAgenda', function () {
	function openPatient(rdvElement) {
		rdvElement.click(); // Clic sur l'élement
		lightObserver('input[type="submit"][name="ctl00$ContentPlaceHolder1$ButtonGotoPatient"]', function(button) { //Clic sur le bouton d'ouverture du dossier patient
			button[0].click();
		} ,parentElement = document,justOnce = true);
	}

    lightObserver('div.agendardv', function(elements) { // Ajoute une fonction sur le clic droit d'un RDV dans l'agenda
		for (let element of elements) {
			element.addEventListener('contextmenu', function(event) {
    			event.preventDefault();
    			openPatient(element);
    			recordMetrics({ clicks: 2, drags: 1 });
    		});
    	}
    });
});