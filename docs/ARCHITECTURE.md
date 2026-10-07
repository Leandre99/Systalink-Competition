# Architecture Technique - KoraDevs + CodeFlash

```mermaid
graph TD
    Client[React + Vite + TanStack Query] -->|HTTP REST {ok, data}| Server[Express Server Node.js]
    Client -->|WebSocket /ws| WS[WebSocket Server]
    Server -->|Shared Schemas| Shared[Dossier shared/ Zod]
    Client -->|Shared Schemas| Shared
    Server -->|Read/Write| DB[DB Store In-memory / data.json]
```

## Single Source of Truth
Le dossier `shared/` contient tous les schémas Zod, types TypeScript et fonctions de masquage de secrets partagés entre le frontend et le backend.

## Modèle de Réponse API Uniforme
Toutes les réponses de l API REST suivent le format d enveloppe :
```json
{
  "ok": true,
  "data": { ... }
}
```
Ou en cas d erreur :
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Message explicatif en français"
  }
}
```
