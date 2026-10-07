# Hypothèses & Choix de Conception - KoraDevs + CodeFlash

1. **Test chez l utilisateur vs Serveur** :
   Le test automatique s exécute en environnement léger/simulé pour éviter l exécution de code arbitraire non sécurisé sur nos serveurs.

2. **Accès Temps Réel vs Mode Dégradé** :
   En cas de connexion instable ou faible, le WebSocket bascule automatiquement vers le mode asynchrone (code collé) sans planter l application.

3. **Confidentialité par Défaut** :
   Tous les tokens et mots de passe sont nettoyés côté client avant tout envoi réseau.

4. **Double Accord de Publication** :
   Une fiche de solution n est rendue publique que si le demandeur ET l aidant cliquent sur leur bouton d accord respectif.
