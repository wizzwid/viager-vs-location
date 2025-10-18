import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/*********************
 * UTILITAIRES
 *********************/
const fmt = (n: number, d = 0) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—";
const toNum = (v: string) => Number((v || "").toString().replace(/\s/g, "").replace(",", ".")) || 0;
// ... (Les fonctions Section, Field, Tabs restent inchangées)

/*********************
 * FORMULES FINANCIÈRES
 *********************/
function annuityPayment(capital: number, ratePct: number, years: number) {
// ... (Reste inchangée)
}

// Fonction pour calculer la Valeur Actuelle d'une rente constante, utilisée pour le DUH
function presentValueAnnuity(monthly: number, years: number, discountPct: number) {
    const r = discountPct / 100 / 12; // Taux mensuel
    const n = Math.round(years * 12); // Nombre de mois
    if (r === 0) return monthly * n;
    const v = monthly * ((1 - Math.pow(1 + r, -n)) / r);
    return v;
}

function pvIndexedAnnuity(monthly: number, years: number, discountPct: number, indexPct: number) {
// ... (Reste inchangée)
}

function solveMonthlyFromPV(targetPV: number, years: number, discountPct: number, indexPct: number) {
// ... (Reste inchangée)
}

/*********************
 * TABLE INSEE SIMPLIFIÉE
 *********************/
function getEsperanceVie(age: number, sexe: string) {
// ... (Reste inchangée)
}

// ... (Les composants Legend et LocationNue restent inchangés)

/*********************
 * VIAGER
 *********************/
function Viager() {
  const [valeur, setValeur] = useState("292000");
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [taux, setTaux] = useState("2");
  // NOUVEAU: Remplacement de decote par loyer et taux d'actualisation DUH
  const [loyer, setLoyer] = useState("740"); 
  const [bouquetPct, setBouquetPct] = useState("40"); // Bouquet en % de la Valeur Occupée
  const [index, setIndex] = useState("1.1");
  
  // Utilisation de toNum(taux) comme taux d'actualisation pour le DUH
  const vV = toNum(valeur);
  const years = getEsperanceVie(Number(age), sexe);
  const vLoyer = toNum(loyer);
  
  // 1. Calcul de la Valeur du Droit d'Usage et d'Habitation (DUH)
  const valeurDUH = presentValueAnnuity(vLoyer, years, toNum(taux));
  
  // 2. Calcul de la Valeur Occupée
  const valeurOccupee = vV - valeurDUH;

  // 3. Décote en pourcentage (pour l'affichage)
  const decotePct = isFinite(valeurDUH / vV) ? (valeurDUH / vV) * 100 : 0;
  
  // 4. Répartition en Bouquet et Capital Rente
  // Le bouquet et la rente sont maintenant calculés en % de la Valeur Occupée
  const capBouquet = (toNum(bouquetPct) / 100) * valeurOccupee;
  const capRente = valeurOccupee - capBouquet; // Le reste devient le capital de la rente
  
  // 5. Calcul de la Rente Mensuelle
  const renteMensuelle = solveMonthlyFromPV(capRente, years, toNum(taux), toNum(index));

  // Données pour les graphiques
  const donutViager = [
    { name: "Bouquet", value: capBouquet },
    { name: "Capital Rente", value: capRente },
  ];
  // Ajout de la valeur du DUH pour une meilleure répartition visuelle du prix total
  const donutCoutTotal = [
    { name: "Valeur DUH (Décote)", value: valeurDUH },
    ...donutViager
  ];
  
  const COLORS = ["#3559E0", "#F2994A", "#F2C94C", "#E67E22"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Viager">
        <div className="space-y-3">
          <Field label="Valeur vénale" suffix="€" value={valeur} onChange={setValeur} />
          <Field label="Âge" suffix="ans" value={age} onChange={setAge} />
          <Field label="Sexe" value={sexe} onChange={setSexe} />
          <Field label="Espérance de vie (INSEE)" suffix="ans" value={years.toFixed(1)} onChange={() => {}} />
          <Field 
            label="Loyer mensuel estimé" 
            suffix="€/mois" 
            value={loyer} 
            onChange={setLoyer} 
            help="Utilisé pour calculer le DUH par capitalisation"
          />
          <Field label="Taux d'actualisation" suffix="%/an" value={taux} onChange={setTaux} help="Taux utilisé pour le DUH et la rente" />
          <Field label="Décote d'occupation" suffix="%" value={decotePct.toFixed(1)} onChange={() => {}} help={`Calculé à partir du loyer et de l'espérance de vie`} />
          <Field label="Bouquet (sur valeur occupée)" suffix="%" value={bouquetPct} onChange={setBouquetPct} />
          <Field label="Tx révision rente" suffix="%/an" value={index} onChange={setIndex} />
        </div>
      </Section>

      <Section title="Résultats – Viager">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Valeur DUH (Décote)</div>
            <div className="font-semibold">{fmt(valeurDUH)} €</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Valeur occupée</div>
            <div className="font-semibold">{fmt(valeurOccupee)} €</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Rente mensuelle</div>
            <div className="font-semibold">{fmt(renteMensuelle)} €/mois</div>
          </div>
        </div>

        <div className="h-56 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="value" data={donutCoutTotal} innerRadius={50} outerRadius={80} paddingAngle={2}>
                {donutCoutTotal.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center text-sm mt-2 font-medium">Répartition du prix total (V. Vénale)</div>
          <Legend data={donutCoutTotal} colors={COLORS} />
        </div>
      </Section>
    </div>
  );
}

*********************
 * APP PRINCIPALE
 *********************/
export default function App() {
  const [tab, setTab] = useState("Location nue");
  useEffect(() => {
    document.title = `Simulateur ${tab} – Viager & Location`;
  }, [tab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Simulateur Viager & Location</h1>
            <p className="text-sm text-gray-500">Comparateur interactif avec graphiques et légendes</p>
          </div>
          <Tabs tabs={["Location nue", "Viager"]} active={tab} onChange={setTab} />
        </header>

        {tab === "Location nue" ? <LocationNue /> : <Viager />}

        <footer className="text-xs text-gray-400 text-center">
          Données indicatives — calculs simplifiés. Version avec graphiques Recharts et légendes.
        </footer>
      </div>
    </div>
  );
}
