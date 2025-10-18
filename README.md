Calculateur immobilier Location Viager SCPI

Ce projet est une application **React + TypeScript** qui permet de comparer de manière interactive l’investissement en **location nue** et l’achat en **viager**. Il a été conçu avec **Vite**, **TailwindCSS** et **Recharts** pour un rendu rapide et visuel.

## 🚀 Fonctionnalités principales
- Calcul automatique des mensualités, loyers et rentabilités pour un investissement locatif classique.
- Simulation complète d’un viager avec calcul du bouquet, de la rente et de la valeur occupée.
- Estimation automatique de l’espérance de vie à partir des tables simplifiées **INSEE** selon l’âge et le sexe.
- Graphiques interactifs en camembert pour visualiser la répartition des coûts et des flux.
- Interface claire, responsive et modifiable facilement.

## 🧩 Technologies
- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)

## ⚙️ Installation locale
1. Clonez le dépôt :
   ```bash
   git clone https://github.com/wizzwid/viager-vs-location.git
   cd viager-vs-location
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
4. Ouvrez [http://localhost:5173](http://localhost:5173)

## 🌐 Déploiement automatique (GitHub Pages)
Le projet inclut un workflow **GitHub Actions** (`.github/workflows/deploy.yml`) qui :
- construit le site avec `npm run build`,
- publie automatiquement le dossier `dist` sur **GitHub Pages**.

### 🔗 URL du site en ligne
> [https://wizzwid.github.io/viager-vs-location](https://wizzwid.github.io/viager-vs-location)

À chaque modification (commit + push sur la branche `main`), la page se met à jour automatiquement.

## ✏️ Personnalisation
- Le fichier principal du simulateur se trouve dans `src/App.tsx`.
- Les styles globaux sont dans `src/index.css`.
- Les paramètres INSEE sont définis dans la fonction `getEsperanceVie` (modifiables selon les millésimes souhaités).

## 🧪 Tests rapides
- Des auto-tests simples vérifient la cohérence des interpolations INSEE dans la console navigateur.

## 📄 Licence
Projet librement modifiable à des fins pédagogiques ou professionnelles.

---
Développé par **wizzwid** – Simulateur interactif Viager vs Location.
