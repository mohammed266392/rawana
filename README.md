# Rawana — Premier chapitre, interaction réactive

Décompresser puis ouvrir index.html. Aucun build ni dépendance. Conserver frames/ et assets/ à côté du HTML.

Arrivée stable : frame 001, logo officiel, « Tout commence par ce que l’on ressent. ».
Un geste vers le bas lance la lecture automatique vers la frame 061, en 2,3 secondes pour le parcours complet. Le texte final apparaît seulement à l'arrivée : « Derrière chaque tombé, une matière choisie avec exigence. ».

## Correction de réactivité

- Suppression du délai de lecture obligatoire de 700 ms et du verrou de fin de geste.
- Scroll vers le haut accepté pendant la lecture, pendant la révélation du texte ou dès l'arrivée. Il inverse le parcours depuis la position courante, sans saut à une extrémité.
- La direction peut être changée de nouveau immédiatement. Une seule boucle requestAnimationFrame reste active.
- Les événements répétés dans le même sens ne redémarrent pas l'animation et ne changent pas sa vitesse.
- Aucun geste n'est mis en file d'attente. Le dernier sens confirmé détermine la destination.
- Petits mouvements de trackpad accumulés avec un seuil de 6 pixels normalisés ; aucun silence préalable requis. Un délai de 160 ms efface uniquement les micro-deltas accumulés.
- Sur tactile : changement de sens accepté sans lever le doigt, seuil de 12 pixels. Clavier : flèches, PageUp/PageDown, espace/majuscule-espace.

La vitesse reste fixe : 60 intervalles en 2,3 secondes. Une inversion partielle prend un temps proportionnel à la distance restante. Les textes s'effacent en 220 ms et se révèlent en 550 ms aux arrivées ; ces animations ne bloquent plus l'interaction.

Les 61 images, le logo officiel, le cadrage et le design restent inchangés. Le canvas respecte les proportions et utilise un DPR plafonné à 2. Préchargement complet avant interaction. L'état initial reste stable sans geste.

## Vérification

Tests simulés : inversion en lecture visible en moins de 50 ms à 60 Hz ; inversion pendant la révélation ; rafales continues sans redémarrage ; 120 inversions rapides sans blocage ; petits deltas de trackpad ; changement de sens tactile ; une seule boucle RAF et arrêt aux états stables. Syntaxe JavaScript vérifiée.

Ces contrôles ne remplacent pas un essai sur un vrai trackpad : le rendu et les gestes réels n'ont pas été vérifiés dans un navigateur dans cet environnement.
