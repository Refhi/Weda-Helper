chrome.commands.onCommand.addListener(function(command) {
  switch (command) {
    case 'push_valider':
    case 'push_annuler':
    case 'print_meds':
    case 'download_document':
    case 'upload_latest_file':
    case 'push_enregistrer':
    case 'push_delete':
    case 'shortcut_w':
    case 'shortcut_consult':
    case 'shortcut_certif':
    case 'shortcut_demande':
    case 'shortcut_prescription':
    case 'shortcut_formulaire':
    case 'shortcut_courrier':
    case 'shortcut_fse':
    case 'shortcut_search':
    case 'shortcut_atcd':
    case 'shortcut_carte_vitale':
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: command});
      });
      break;
    default:
      console.log('Unknown command:', command);
  }
});
