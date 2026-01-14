---
name: Demande de diffusion d'alertes au Pole/Cabinet/Groupement
about: Permet de demander de diffuser des alertes
title: ''
labels: Alertes à diffuser
assignees: ''

---

Bonjour @Refhi,

je souhaite diffuser mes alertes personnalisées à mon Pôle/Cabinet/Groupement, dont le numéro est "0000" (mettre ici le numéro de votre cabinet que vous trouverez dans Weda en haut à droite).

Voici les alertes que j'ai déjà testé par mes soins :
```
{
    titre: "Alerte avec coloration CSS personnalisée",
    optionsCible: {
        cible: "atcd",
        coloration: "orange",
        icone: "warning",
        texteSurvol: "Exemple d'alerte avec coloration CSS personnalisée (orange)"
    },
    alerteWeda: {
        icone: "warning",
        typeAlerte: "success",
        dureeAlerte: 10,
        texteAlerte: "Attention : antécédent important détecté"
    },
    conditions: {
        ageMin: 18,
        ageMax: 65,
        sexes: "N",
        motsCles: ["exemple1", "test1"]
    }
},
{
    titre: "Alerte état civil avec conditions d'âge et sexe",
    optionsCible: {
        cible: "etatCivil",
        coloration: "lightblue",
        icone: "person",
        texteSurvol: "Alerte spécifique pour les femmes de plus de 50 ans"
    },
    alerteWeda: {
        icone: "info",
        typeAlerte: "success",
        dureeAlerte: 15,
        texteAlerte: "Protocole de dépistage disponible"
    },
    conditions: {
        ageMin: 50,
        sexes: "F",
        motsCles: ["exemple2", "test2"]
    }
},
{
    titre: "Alerte critique sans limite de temps",
    optionsCible: {
        cible: "atcd",
        coloration: "red",
        icone: "error",
        texteSurvol: "Alerte critique nécessitant une attention immédiate"
    },
    alerteWeda: {
        icone: "error",
        typeAlerte: "fail",
        dureeAlerte: 0,
        texteAlerte: "⚠️ Attention : contre-indication absolue détectée"
    },
    conditions: {
        motsCles: ["exemple3", "test3"]
    }
},
{
    titre: "Alerte temporaire avec période de validité",
    optionsCible: {
        cible: "atcd",
        coloration: "yellow",
        icone: "schedule",
        texteSurvol: "Alerte active seulement pendant une période définie"
    },
    alerteWeda: {
        icone: "schedule",
        typeAlerte: "undefined",
        dureeAlerte: 8,
        texteAlerte: "Campagne de prévention en cours"
    },
    conditions: {
        dateDebut: "01/01/2026",
        dateFin: "31/12/2026",
        motsCles: ["exemple4", "test4"]
    }
},
{
    titre: "Alerte simple sans notification",
    optionsCible: {
        cible: "atcd",
        coloration: true,
        icone: "lightbulb",
        texteSurvol: "Cette alerte colore l'antécédent mais n'affiche pas de notification"
    },
    conditions: {
        motsCles: ["exemple5", "test5"]
    }
},
{
    titre: "Alerte pédiatrique spécifique",
    optionsCible: {
        cible: "atcd",
        coloration: "pink",
        icone: "child_care",
        texteSurvol: "Protocole pédiatrique disponible"
    },
    alerteWeda: {
        icone: "child_care",
        typeAlerte: "success",
        dureeAlerte: 12,
        texteAlerte: "Suivi pédiatrique recommandé - voir protocole"
    },
    conditions: {
        ageMax: 18,
        sexes: "N",
        motsCles: ["exemple6", "test6"]
    }
}
```

- J'ai bien compris que ces alertes seront visibles publiquement, tant dans ce ticket, que directement dans le code de Weda, et qu'elles obtiendrons le même status de license libre que le code source de Weda.
- J'ai fait attention à ce qu'elles ne contiennent aucune information confidentielle.
- J'ai également fait attention à ne pas surcharger les alertes pour mes pairs : trop d'info tue l'info !
- Je m'engage à avoir l'accord des pairs avec qui je travaille dans le groupement.
- Enfin, j'ai compris que cette demande pouvait mettre du temps avant d'être diffusée : aux alentour de deux semaines en moyenne.
