# OpenClaw SaaS — Spécifications Complètes du Projet

> Version 4.0.0 — Mise à jour le 20 mars 2026

---

## ⚠️ Règle de développement fondamentale

**Le code se construit étape par étape. Chaque étape doit être testée et validée avant de passer à la suivante.**

| Règle | Détail |
|-------|--------|
| 1 étape = 1 fonctionnalité | Ne jamais coder deux choses en même temps |
| Tester avant de continuer | Chaque étape a un critère de validation précis |
| Ne jamais sauter d'étape | Les étapes sont dans un ordre logique de dépendances |
| Commit après chaque étape | Un git commit par étape validée |

### Ordre des étapes de développement

```
Étape 1  → Next.js tourne sur localhost:3000              ✅ FAIT
Étape 2  → Clerk auth (inscription/connexion)             ⏳ EN COURS
Étape 3  → PostgreSQL + Prisma connecté
Étape 4  → Dashboard protégé (routes privées)
Étape 5  → Page config agent + enregistrement carte Stripe
Étape 6  → Provisionnement Docker agent sur EC2
Étape 7  → Rotation clés Gemini + connexion agent LLM
Étape 8  → WebSocket temps réel
Étape 9  → Connexion WhatsApp QR code
Étape 10 → Auth OpenClaw (lien terminal)
Étape 11 → Page chat sur le site
Étape 12 → Billing + usage tracker
Étape 13 → Landing page bilingue FR/EN + animations vidéo
Étape 14 → RGPD (privacy page, suppression compte, consentement)
Étape 15 → Sécurité finale (headers, rate limiting, WAF Cloudflare)
Étape 16 → Déploiement EC2 + GitHub Actions CI/CD
```

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Infrastructure & Hébergement](#2-infrastructure--hébergement)
3. [LLM — Gemini API x8 clés](#3-llm--gemini-api-x8-clés)
4. [Architecture agents — Docker sur EC2](#4-architecture-agents--docker-sur-ec2)
5. [Stack Technique](#5-stack-technique)
6. [Modèle de Facturation](#6-modèle-de-facturation)
7. [Architecture des Fichiers](#7-architecture-des-fichiers)
8. [Pages du Site](#8-pages-du-site)
9. [Temps Réel — WebSocket](#9-temps-réel--websocket)
10. [Connexions de l'Agent](#10-connexions-de-lagent)
11. [Sécurité](#11-sécurité)
12. [RGPD & Conformité](#12-rgpd--conformité)
13. [Principes de Code](#13-principes-de-code)
14. [Atomic Design](#14-atomic-design)
15. [Flux Utilisateur](#15-flux-utilisateur)
16. [Coûts Estimés](#16-coûts-estimés)
17. [Variables d'environnement](#17-variables-denvironnement)

---

## 1. Vue d'ensemble

**Produit** : SaaS permettant à des utilisateurs de créer, configurer et utiliser un agent OpenClaw personnel, accessible via le site web et via WhatsApp.

**LLM** : Gemini API (Google) — 8 clés en rotation — coût tokens $0.

**Modèle** : Pay-as-you-go — plafonné à $10/mois par agent.

**Langue** : Bilingue Français / Anglais (next-intl).

**Design** : Clair et professionnel, style Stripe / Vercel. Animations Framer Motion sur la landing.

**Période d'essai** : 7 jours gratuits dès la première configuration de l'agent (carte bancaire requise mais non débitée).

**Infrastructure** : 1 seule EC2 t3.medium — site + DB + agents Docker — $31/mois.

---

## 2. Infrastructure & Hébergement

### Région AWS

| Paramètre | Valeur |
|-----------|--------|
| Région | eu-north-1 (Stockholm) |
| Motif | Moins cher que Paris, 100% énergie renouvelable, RGPD conforme |

### Instance unique — tout sur une EC2

| Ressource | Détail |
|-----------|--------|
| Instance | EC2 t3.medium |
| vCPU | 2 |
| RAM | 4 GB |
| Coût/mois | ~$31 |
| Contenu | Next.js + Nginx + PM2 + PostgreSQL + Docker agents |
| LLM | Gemini API (cloud) — pas de GPU requis |

### Plan de scale

| Phase | Users | Instance | Coût/mois | Agents actifs simultanés |
|-------|-------|----------|-----------|--------------------------|
| Lancement | 0–50 | t3.medium | $31 | 2–3 |
| Croissance | 50–200 | t3.xlarge | $120 | 8–10 |
| Scale | 200+ | t3.2xlarge | $240 | 15–20 |

**Migration** : Stop instance → changer type → Start (2 minutes, zéro perte de données).

### Répartition RAM sur t3.medium (4 GB)

| Service | RAM |
|---------|-----|
| Next.js + API | ~600 MB |
| PostgreSQL | ~300 MB |
| Nginx + OS | ~200 MB |
| Agent Docker #1 (actif) | ~1.2 GB |
| Agent Docker #2 (actif) | ~1.2 GB |
| Marge | ~500 MB |

Agents inactifs : `docker pause` → RAM libérée instantanément, reprise en 2–3 secondes.

### Stockage

| Ressource | Détail |
|-----------|--------|
| Base de données | PostgreSQL sur EC2 (même instance) |
| ORM | Prisma |
| Stockage fichiers | S3 — 1 bucket isolé par user (UUID) |
| Secrets | AWS Secrets Manager |
| Backup DB | Snapshot quotidien automatique |

---

## 3. LLM — Gemini API x8 clés

### Pourquoi Gemini gratuit

| Avantage | Détail |
|----------|--------|
| Coût tokens | $0 — tier gratuit Google |
| Pas de GPU | Zéro EC2 GPU requis — économie $400+/mois |
| Qualité | Gemini 2.5 Flash — excellent pour agents |
| Mise à jour | Google met à jour le modèle automatiquement |
| Vitesse | Très rapide — inférence sur les serveurs Google |

### Limites du tier gratuit par clé

| Limite | Par clé | x8 clés |
|--------|---------|---------|
| Requêtes/minute (RPM) | 15 | **120 req/min** |
| Requêtes/jour (RPD) | 1 500 | **12 000 req/jour** |
| Tokens/minute | 1 000 000 | **8 000 000 tok/min** |
| Coût | $0 | **$0** |

120 req/min → supporte **20–30 agents actifs simultanément** à $0.

### Rotation automatique des clés

```
Requête agent → KeyRotator
  → Clé 1 disponible ? → Utiliser clé 1
  → Clé 1 rate limited ? → Passer à clé 2
  → Clé 2 rate limited ? → Passer à clé 3
  → ... jusqu'à clé 8
  → Toutes limitées ? → File d'attente 60s → retry
```

### Configuration OpenClaw

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "google/gemini-2.5-flash-preview",
        "fallbacks": ["google/gemini-2.5-pro-preview"]
      }
    }
  }
}
```

### Note RGPD importante

Les conversations des agents passent par les serveurs Google (Gemini API). Cela doit être mentionné explicitement dans la politique de confidentialité `/privacy`.

---

## 4. Architecture agents — Docker sur EC2

### Isolation des données entre agents

Chaque agent est totalement isolé — aucune fuite possible entre users :

| Couche | Isolation |
|--------|-----------|
| Réseau | Docker bridge séparé par user — les conteneurs ne se voient pas |
| Fichiers | Volume Docker séparé par user |
| Stockage cloud | S3 bucket séparé par user (UUID) |
| LLM | Gemini sans état — ne stocke rien entre requêtes |
| Secrets | IAM role AWS séparé par user |

### Cycle de vie d'un agent

```
Message reçu de l'user
  → Agent en pause ? → docker resume (2–3s)
  → Agent traite la demande via Gemini API
  → Agent répond (WhatsApp ou chat site)
  → 15 min sans activité → docker pause (RAM libérée)
```

### Lancement d'un conteneur agent

```bash
docker run \
  --name agent-{userId} \
  --memory=1.2g \
  --memory-swap=1.2g \
  --cpus=0.5 \
  --network=bridge-{userId} \
  --env USER_ID={userId} \
  --env S3_BUCKET=openclaw-{userId} \
  --env GEMINI_API_KEY={keyFromRotation} \
  openclaw:latest
```

### Optimisations Chromium (navigateur headless)

OpenClaw utilise Chromium pour l'authentification et les actions web :

```javascript
const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--memory-pressure-off',
    '--disable-images',
  ]
})
```

---

## 5. Stack Technique

### Frontend

| Outil | Usage |
|-------|-------|
| Next.js 16+ (App Router) | Framework principal |
| TypeScript (strict) | Typage |
| Tailwind CSS v4 | Styles |
| Framer Motion | Animations landing |
| next-intl | i18n FR/EN |
| Clerk | Authentification |

### Backend

| Outil | Usage |
|-------|-------|
| Next.js API Routes | Routes API |
| Prisma | ORM |
| PostgreSQL | Base de données |
| Stripe | Paiement pay-as-you-go |
| WebSocket (ws) | Temps réel agent ↔ dashboard |
| Zod | Validation des entrées |
| AWS SDK v3 | S3, Secrets Manager |
| Docker SDK (dockerode) | Gestion conteneurs agents |

### Authentification

- Provider : Clerk
- Email + mot de passe
- Google OAuth
- JWT RS256, expiration 15 minutes
- Refresh token avec rotation

---

## 6. Modèle de Facturation

### Période d'essai — 7 jours gratuits

| Règle | Détail |
|-------|--------|
| Déclenchement | Dès que l'agent est configuré et actif pour la première fois |
| Durée | 7 jours calendaires |
| Condition | Carte bancaire enregistrée obligatoire (Stripe SetupIntent) |
| Débit | Aucun débit pendant les 7 jours |
| Après 7 jours | Facturation pay-as-you-go démarre automatiquement |
| Accès sans carte | Impossible — config agent bloquée sans carte valide |

### Flux Stripe

```
1. User configure l'agent
2. Stripe SetupIntent → enregistrement carte (pas de débit)
3. Stripe crée Subscription avec trial_end = now + 7 jours
4. Pendant 7 jours → agent actif, $0 facturé
5. J+7 → Stripe active la facturation metered
6. Fin du mois → invoice générée (plafonnée à $10)
```

### Tarification

| Métrique | Valeur |
|----------|--------|
| Prix facturé | $0.003/minute d'agent actif |
| Plafond mensuel | $10/mois |
| Coût infra / user | ~$0.62/mois (part EC2) |
| Marge typique | ~$9.38/user/mois |
| Stripe fees | 2.9% + $0.30/transaction |

---

## 7. Architecture des Fichiers

```
src/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx                    # Landing page
│   │   ├── dashboard/page.tsx
│   │   ├── agent/
│   │   │   ├── config/page.tsx         # Config + carte Stripe
│   │   │   └── chat/page.tsx           # Chat temps réel
│   │   ├── billing/page.tsx
│   │   ├── profile/page.tsx
│   │   └── privacy/page.tsx            # RGPD
│   └── api/
│       ├── agent/start/route.ts
│       ├── agent/stop/route.ts
│       ├── agent/status/route.ts
│       ├── billing/usage/route.ts
│       ├── billing/portal/route.ts
│       ├── webhooks/stripe/route.ts
│       └── ws/route.ts
│
├── components/
│   ├── atoms/          # Button, Input, Badge, Avatar, Spinner...
│   ├── molecules/      # FormField, ApiKeyInput, StatusBadge...
│   ├── organisms/      # AgentConfigForm, WhatsAppQRPanel, Navbar...
│   └── templates/      # DashboardLayout, AuthLayout...
│
├── lib/
│   ├── repositories/   # user, agent, usage, billing
│   ├── services/       # agent, billing, whatsapp, gemini
│   ├── factories/      # gemini-key-rotator, container, storage
│   ├── validators/     # Zod schemas
│   └── aws/            # s3, secrets
│
├── hooks/              # useAgent, useWebSocket, useWhatsApp, useBilling
├── types/              # agent, billing, user, ws
├── config/             # app.config, stripe.config, gemini.config
└── i18n/               # fr.json, en.json
```

---

## 8. Pages du Site

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Présentation, use cases vidéo, pricing, CTA |
| Dashboard | `/dashboard` | Statut agent, connexions, actions rapides |
| Config agent | `/agent/config` | Paramètres, carte Stripe (obligatoire avant activation) |
| Chat | `/agent/chat` | Conversation directe avec l'agent |
| Billing | `/billing` | Usage, factures, gestion carte |
| Profil | `/profile` | Infos compte, suppression (RGPD) |
| Privacy | `/privacy` | Politique de confidentialité RGPD |

### Use cases vidéo sur la landing

1. **WhatsApp automation** — répondre, envoyer, filtrer les conversations
2. **Recherche & veille** — surveiller le web, résumer, alerter
3. **Agenda & emails** — planifier, rédiger, rappels automatiques

---

## 9. Temps Réel — WebSocket

Tout ce qui change d'état sur le dashboard est mis à jour en temps réel.

### Événements temps réel

| Événement | Type WS | Composant mis à jour |
|-----------|---------|----------------------|
| Agent démarre / s'arrête | `AGENT_STATUS` | Badge statut dashboard |
| Secondes actives | `USAGE_UPDATE` | Compteur live + billing |
| QR WhatsApp prêt | `WHATSAPP_QR` | Panel QR (countdown 60s) |
| WhatsApp connecté | `WHATSAPP_CONNECTED` | Badge "Connecté" |
| Lien auth OpenClaw | `AUTH_LINK` | Bouton cliquable |
| Messages chat | `CHAT_MESSAGE` | Streaming token par token |

### Sécurité WebSocket

- Token JWT vérifié à la connexion (fermeture 4001 si invalide)
- userId vérifié sur chaque message entrant
- Accès au canal d'un autre user → fermeture 4003
- Reconnexion automatique (backoff exponentiel)

---

## 10. Connexions de l'Agent

### Auth OpenClaw (lien navigateur)

- Le conteneur génère un lien d'auth dans stdout
- Le wrapper Node.js intercepte stdout et capture l'URL
- Le lien est envoyé au dashboard via WebSocket
- Le user clique → authentification dans son navigateur

### WhatsApp QR Code

- Le conteneur génère un QR via l'event `qr` d'OpenClaw
- QR encodé en base64 (PNG) envoyé via WebSocket
- Dashboard affiche le QR avec countdown 60 secondes
- Scan → event `ready` → statut "connecté"

### LLM — Gemini via rotation de clés

- 8 clés Gemini stockées dans AWS Secrets Manager
- `GeminiKeyRotator` distribue les clés aux agents
- Fallback automatique si une clé est rate limited
- Clé injectée dans le conteneur Docker au démarrage

---

## 11. Sécurité

### Réseau

- Cloudflare WAF (gratuit) : anti-injection, rate limiting, DDoS
- Security Groups : SSH limité IP fixe, HTTP/HTTPS via Cloudflare
- Agents : réseau bridge Docker isolé par user

### Application

- Validation Zod sur chaque route API
- Rate limiting : 10 req/min sur /auth/*, 100 req/min par user
- Headers : X-Frame-Options DENY, CSP strict, HSTS, nosniff
- JWT RS256, expiration 15 min, refresh token rotation

### Données

- Clés Gemini : AWS Secrets Manager (jamais en clair)
- DB : requêtes préparées Prisma, chiffrement at-rest
- S3 : accès public bloqué, SSE-S3, IAM role par user
- Logs : aucun secret loggué, rétention 90 jours

### Conteneurs Docker

- User non-root dans le Dockerfile
- Limite mémoire : --memory=1.2g par conteneur
- Réseau bridge isolé par user
- Image minimale Alpine

---

## 12. RGPD & Conformité

### Données personnelles traitées

- Email, nom, numéro WhatsApp, IP de connexion
- Conversations WhatsApp de l'agent
- Historique des actions et logs
- **Conversations envoyées à Gemini API (Google)** ← à mentionner explicitement

### Obligations et mise en œuvre

| Obligation | Statut | Étape |
|------------|--------|-------|
| Hébergement EU | ✅ eu-north-1 Stockholm | Fait |
| Chiffrement | ✅ AES-256 + S3 SSE + Secrets Manager | Fait |
| Isolation données | ✅ S3 + IAM role par user | Fait |
| Mention Gemini/Google | ⏳ Page /privacy | Étape 14 |
| Politique confidentialité | ⏳ Page /privacy | Étape 14 |
| Droit à l'effacement | ⏳ Bouton suppression compte | Étape 14 |
| Consentement explicite | ⏳ Case à cocher inscription | Étape 14 |

---

## 13. Principes de Code

### SOLID appliqué

| Principe | Application concrète |
|----------|---------------------|
| Single Responsibility | AgentService ne touche pas Stripe |
| Open/Closed | Ajouter un LLM provider = nouvelle classe uniquement |
| Dependency Inversion | Services injectés, jamais instanciés en dur |

### Design Patterns

| Pattern | Usage |
|---------|-------|
| Repository | Tout accès DB via repo — jamais Prisma dans les routes |
| Factory | GeminiKeyRotatorFactory, ContainerFactory, StorageFactory |
| Observer | Events WS : QR, auth link, usage, chat tokens |
| Strategy | Billing interchangeable |
| Middleware Chain | Auth → Rate limit → Validation → Handler |

### Style de code

- Nommage expressif : `provisionUserAgent()` pas `doThing()`
- Fonctions max 20 lignes, 1 responsabilité
- Erreurs typées, jamais `any`, Result pattern `{data, error}`
- Zéro logique dans les composants UI
- Zéro Prisma hors repositories
- Zéro secrets hardcodés

---

## 14. Atomic Design

| Niveau | Exemples |
|--------|---------|
| Atoms | Button, Input, Badge, Avatar, Spinner, Label, Divider, Tooltip |
| Molecules | FormField, StatusBadge, PricingCard, AlertBanner |
| Organisms | AgentConfigForm, WhatsAppQRPanel, BillingUsageChart, ChatInterface, Navbar, Footer |
| Templates | DashboardLayout, AuthLayout, LandingLayout, SettingsLayout |

---

## 15. Flux Utilisateur

### Inscription → Agent actif

```
1. Inscription via Clerk (email ou Google)
   └── Case à cocher consentement RGPD (non pré-cochée)
2. Accès au Dashboard
3. Clic "Configurer mon agent"
4. Enregistrement carte Stripe (SetupIntent — pas de débit)
5. Scan QR code WhatsApp
6. Agent actif → période d'essai 7 jours démarre
   └── Clé Gemini assignée via rotation
   └── WebSocket connecté → dashboard en temps réel
```

### Temps réel sur le dashboard

```
Agent démarre     → badge "En cours" instantané
Secondes actives  → compteur live toutes les secondes
QR WhatsApp prêt  → QR affiché sans recharger la page
WhatsApp connecté → badge "Connecté" en temps réel
Message de chat   → tokens streamés mot par mot
```

### Période d'essai → Facturation

```
J+0  : Agent configuré → 7 jours gratuits
J+7  : Facturation pay-as-you-go active
Fin du mois : Facture générée (plafonnée $10)
              └── Débit automatique carte enregistrée
              └── Facture PDF dans /billing
```

### Cycle de vie de l'agent

```
Message reçu      → docker resume si en pause (2–3s)
Agent répond      → requête Gemini via clé en rotation
15 min inactivité → docker pause (RAM libérée)
```

---

## 16. Coûts Estimés

### Infrastructure fixe mensuelle

| Ressource | Coût |
|-----------|------|
| EC2 t3.medium (tout-en-un) | $31.00 |
| S3 stockage | $1.00 |
| AWS Secrets Manager (8 clés) | $0.32 |
| Cloudflare | $0 |
| Clerk auth | $0 (gratuit < 10k users) |
| GitHub Actions | $0 |
| Gemini API (8 clés tier gratuit) | $0 |
| **Total fixe** | **~$32.32/mois** |

### Revenus et marges

| Scénario | Coût infra | Revenu ($10/user) | Marge |
|----------|-----------|-------------------|-------|
| 4 users | $32 | $40 | $8 — seuil rentabilité |
| 10 users | $32 | $100 | $68 |
| 20 users | $32 | $200 | $168 |
| 50 users | $32 | $500 | $468 |
| 100 users | $32 | $1 000 | $968 |
| 200 users | $120* | $2 000 | $1 880 |

*Migration vers t3.xlarge à 50+ users simultanés

---

## 17. Variables d'environnement

```env
# App
NEXT_PUBLIC_APP_URL=https://tonsite.com

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# AWS
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/openclaw

# Encryption (générer : openssl rand -hex 32)
ENCRYPTION_KEY=

# WebSocket
WS_SECRET=

# Gemini (8 clés en rotation — stockées dans AWS Secrets Manager)
GEMINI_API_KEY_1=AIza...
GEMINI_API_KEY_2=AIza...
GEMINI_API_KEY_3=AIza...
GEMINI_API_KEY_4=AIza...
GEMINI_API_KEY_5=AIza...
GEMINI_API_KEY_6=AIza...
GEMINI_API_KEY_7=AIza...
GEMINI_API_KEY_8=AIza...

# Docker
DOCKER_SOCKET=/var/run/docker.sock
```

---

*OpenClaw SaaS — Spécifications v4.0.0 — 20 mars 2026*
