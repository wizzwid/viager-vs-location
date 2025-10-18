import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Configuration pour l'impression
const printStyles = `
  @media print {
    /* Cache les éléments non essentiels */
    .no-print { display: none !important; }
    /* Force l'affichage du contenu sur toute la largeur */
    .print-max-w { max-width: none !important; }
    /* Supprime les fonds ombrés pour économiser l'encre */
    .bg-gradient-to-b { background: #fff !important; }
    .shadow { box-shadow: none !important; border: 1px solid #ccc; }
    .bg-gray-50, .bg-gray-100 { background-color: #f8f8f8 !important; }
  }
`;

/*********************
 * UTILITAIRES GÉNÉRAUX
 *********************/
// Formatage en monétaire français (ex: 123 456)
const fmt = (n: number, d = 0) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—";
// Conversion de la saisie (retire les espaces/virgules)
const toNum = (v: string) => Number((v || "").toString().replace(/\s/g, "").replace(",", ".")) || 0;

/**
 * Estimation simplifiée des frais de notaire (environ 7.5% du prix dans l'ancien, tous frais compris)
 * @param price - Le montant du bien ou de la valeur à taxer (e.g. valeur nue)
 * @returns Montant estimé des frais de notaire
 */
function calculateNotaryFees(price: number) {
  // Taux indicatif pour un bien ancien (7.5%)
  if (price <= 0) return 0;
  const FEE_RATE_OLD = 0.075;
  return price * FEE_RATE_OLD;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white shadow p-5">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  help,
  readOnly = false,
}: {
  label: string;
  suffix?: string;
  value: string | number;
  onChange: (v: string) => void;
  help?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-3 w-full">
      <div className="w-1/2">
        <div className="text-sm text-gray-700 font-medium">{label}</div>
        {help ? <div className="text-xs text-gray-400">{help}</div> : null}
      </div>
      <span className="flex items-center gap-2 w-1/2">
        <input
          className={`w-full rounded-xl border p-2 focus:outline-none ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "focus:ring"}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          type="text"
          readOnly={readOnly}
        />
        {suffix ? <span className="text-gray-500 text-sm">{suffix}</span> : null}
      </span>
    </label>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="inline-flex rounded-2xl bg-gray-100 p-1 no-print">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            active === t ? "bg-white shadow" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Legend({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3 text-xs">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></span>
          <span className="text-gray-600">{item.name}</span>
          <span className="text-gray-400">({fmt(item.value)}€)</span>
        </div>
      ))}
    </div>
  );
}

function DonutWithTotal({
  data,
  colors,
  title,
  totalTitle,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  title: string;
  totalTitle: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie dataKey="value" data={data} innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-sm font-medium mt-2">
        {title}
        <div className="text-lg font-bold text-gray-800">{totalTitle}: {fmt(total)} €</div>
      </div>
      <Legend data={data} colors={colors} />
    </div>
  );
}


/*********************
 * FORMULES FINANCIÈRES
 *********************/

/**
 * Calcule le versement mensuel constant pour un prêt amortissable.
 */
function annuityPayment(capital: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = Math.round(years * 12);
  if (r === 0 || n === 0) return 0;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Calcule la Valeur Actuelle d'une série de flux constants (DUH/loyers).
 */
function presentValueAnnuity(monthly: number, years: number, discountPct: number) {
  const r = discountPct / 100 / 12; // Taux mensuel
  const n = Math.round(years * 12); // Nombre de mois
  if (r === 0) return monthly * n;
  
  // Formule de la valeur actuelle d'une annuité (paiements en début de période)
  const v = monthly * ((1 - Math.pow(1 + r, -n)) / r) * (1 + r);
  return v;
}

/**
 * Calcule la Valeur Actuelle d'une série de flux indexés (Rente Viagère).
 */
function pvIndexedAnnuity(monthly: number, years: number, discountPct: number, indexPct: number) {
  const r = discountPct / 100 / 12;
  const g = indexPct / 100 / 12;
  const n = Math.round(years * 12);
  const q = (1 + g) / (1 + r);
  if (q === 1) return monthly * n;
  
  const v = (monthly * (1 - Math.pow(q, n))) / (1 - q);
  return v;
}

/**
 * Résout le montant de la rente mensuelle à partir du Capital Rente désiré (PV).
 */
function solveMonthlyFromPV(targetPV: number, years: number, discountPct: number, indexPct: number) {
  const ref = pvIndexedAnnuity(100, years, discountPct, indexPct);
  return ref ? (targetPV / ref) * 100 : 0;
}

/*********************
 * TABLE INSEE SIMPLIFIÉE
 *********************/
/**
 * Fournit l'espérance de vie résiduelle par interpolation linéaire.
 */
function getEsperanceVie(age: number, sexe: string) {
  const tableF: Record<number, number> = { 50: 36, 55: 31.5, 60: 27, 65: 22.5, 70: 18.8, 75: 15, 80: 11.5, 85: 8.5, 90: 6.2, 95: 4.5, 100: 3.5 };
  const tableM: Record<number, number> = { 50: 32, 55: 28, 60: 24, 65: 20, 70: 16.5, 75: 13, 80: 10, 85: 7.5, 90: 5.5, 95: 4, 100: 3 };
  const keys = Object.keys(tableF).map(Number).sort((a, b) => a - b);
  const tbl = sexe.toLowerCase().startsWith("h") ? tableM : tableF;
  
  if (age <= keys[0]) return tbl[keys[0]];
  if (age >= keys[keys.length - 1]) return tbl[keys[keys.length - 1]];
  
  for (let i = 1; i < keys.length; i++) {
    if (age <= keys[i]) {
      const a0 = keys[i - 1];
      const a1 = keys[i];
      const y0 = tbl[a0];
      const y1 = tbl[a1];
      // Interpolation linéaire
      return y0 + ((y1 - y0) * (age - a0)) / (a1 - a0);
    }
  }
  return 0;
}

/*********************
 * COMPOSANT LOCATION NUE
 *********************/
function LocationNue() {
  const [prix, setPrix] = useState("292000");
  const [apport, setApport] = useState("72000");
  const [taux, setTaux] = useState("2.5");
  const [assurance, setAssurance] = useState("0.35");
  const [duree, setDuree] = useState("20");
  const [loyer, setLoyer] = useState("740");
  const [charges, setCharges] = useState("1200");
  const [taxe, setTaxe] = useState("1300");

  const vPrix = toNum(prix);
  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssurance = toNum(assurance);
  const vDuree = toNum(duree);
  
  const capital = vPrix - vApport;
  const mensualite = annuityPayment(capital, vTaux, vDuree);
  const assuranceMens = (capital * (vAssurance / 100)) / 12;
  const totalRemboursementMensuel = mensualite + assuranceMens;

  // Calculs totaux
  const nbMois = vDuree * 12;
  const totalRembourse = totalRemboursementMensuel * nbMois;
  const coutTotalInterets = totalRembourse - capital;
  const coutTotalAssurance = assuranceMens * nbMois;
  
  // Frais de notaire (basé sur le prix du bien)
  const fraisNotaire = calculateNotaryFees(vPrix);

  const totalChargeMens = (toNum(charges) + toNum(taxe)) / 12 + totalRemboursementMensuel;
  const cashflowMens = toNum(loyer) - totalChargeMens;

  // Donut 1 : Coût initial (pour les totaux)
  const donutCout = [
    { name: "Apport", value: vApport },
    { name: "Capital prêt", value: capital },
    { name: "Frais de notaire", value: fraisNotaire },
  ];
  
  // Donut 2 : Charges récurrentes mensuelles
  const donutCharge = [
    { name: "Mensualité Prêt", value: mensualite },
    { name: "Assurance Emprunteur", value: assuranceMens },
    { name: "Taxe foncière (mens.)", value: toNum(taxe) / 12 },
    { name: "Charges (mens.)", value: toNum(charges) / 12 },
  ];

  const COLORS = ["#3559E0", "#F2C94C", "#E67E22", "#27AE60"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Location nue">
        <div className="space-y-3">
          <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} />
          <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} />
          <Field label="Assurance" suffix="%/an" value={assurance} onChange={setAssurance} />
          <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Loyer mensuel" suffix="€" value={loyer} onChange={setLoyer} />
          <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} />
          <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
        </div>
      </Section>

      <Section title="Résultats – Location nue">
        {/* Résultat 1: Cashflow */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Remboursement mensuel</div>
            <div className="font-semibold">{fmt(totalRemboursementMensuel)} €/mois</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Cashflow net estimé</div>
            <div className={`font-semibold ${cashflowMens < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(cashflowMens)} €/mois</div>
          </div>
        </div>

        {/* Résultat 2: Coûts totaux du prêt */}
        <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
          <div className="text-gray-700 font-semibold mb-1">Coût total sur {vDuree} ans</div>
          <div className="flex justify-between">
            <span className="text-gray-500">Intérêts du prêt :</span>
            <span className="font-medium text-red-700">{fmt(coutTotalInterets)} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Coût total assurance :</span>
            <span className="font-medium">{fmt(coutTotalAssurance)} €</span>
          </div>
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
            <span className="font-bold">Total Emprunt & Assurance :</span>
            <span className="font-bold text-red-700">{fmt(coutTotalInterets + coutTotalAssurance)} €</span>
          </div>
        </div>
        
        {/* Graphiques */}
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <DonutWithTotal
            data={donutCout}
            colors={COLORS}
            title="Coût d'acquisition initial"
            totalTitle="Total initial"
          />
          <DonutWithTotal
            data={donutCharge}
            colors={COLORS.slice(2)}
            title="Dépenses récurrentes mensuelles"
            totalTitle="Total mensuel"
          />
        </div>
      </Section>
    </div>
  );
}

/*********************
 * COMPOSANT VIAGER
 *********************/
function Viager() {
  const [valeur, setValeur] = useState("292000"); // Valeur vénale
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [loyer, setLoyer] = useState("740"); // Loyer mensuel estimé
  const [taux, setTaux] = useState("2"); // Taux d'actualisation (DUH et rente)
  const [bouquetPct, setBouquetPct] = useState("30"); // Bouquet en % de la Valeur Occupée
  const [index, setIndex] = useState("1.1"); // Taux de révision de la rente
  // Nouveaux champs pour le débirentier
  const [charges, setCharges] = useState("1200");
  const [taxe, setTaxe] = useState("1300");

  // Valeurs numériques
  const vV = toNum(valeur);
  const vAge = Number(age);
  const vLoyer = toNum(loyer);
  const vTaux = toNum(taux);
  const vCharges = toNum(charges);
  const vTaxe = toNum(taxe);
  
  // 1. Calcul de l'espérance de vie (en années)
  const years = getEsperanceVie(vAge, sexe);
  
  // 2. Calcul de la Valeur du Droit d'Usage et d'Habitation (DUH)
  const valeurDUH = presentValueAnnuity(vLoyer, years, vTaux);
  
  // 3. Calcul de la Valeur Occupée
  const valeurOccupee = vV - valeurDUH;

  // 4. Décote en pourcentage (pour l'affichage)
  const decotePct = isFinite(valeurDUH / vV) ? (valeurDUH / vV) * 100 : 0;
  
  // 5. Répartition en Bouquet et Capital Rente
  const vBouquetPct = toNum(bouquetPct);
  const capBouquet = (vBouquetPct / 100) * valeurOccupee;
  const capRente = valeurOccupee - capBouquet; // Le reste devient le capital à convertir en rente
  
  // 6. Calcul de la Rente Mensuelle
  const renteMensuelle = solveMonthlyFromPV(capRente, years, vTaux, toNum(index));

  // 7. Calcul des frais de notaire sur la valeur occupée (ou valeur nue)
  const fraisNotaire = calculateNotaryFees(valeurOccupee);
  
  // Coût total de la rente sur l'espérance de vie (non actualisé, pour information)
  const coutTotalRente = renteMensuelle * years * 12;

  // Données pour les graphiques
  const donutCoutTotal = [
    { name: "Valeur DUH (Décote)", value: valeurDUH },
    { name: "Bouquet", value: capBouquet },
    { name: "Capital Rente", value: capRente },
    { name: "Frais de notaire", value: fraisNotaire },
  ];
  
  const COLORS = ["#3559E0", "#F2994A", "#F2C94C", "#E67E22"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Viager">
        <div className="space-y-3">
          <Field label="Valeur vénale (marché)" suffix="€" value={valeur} onChange={setValeur} />
          <Field label="Âge du crédirentier" suffix="ans" value={age} onChange={setAge} />
          <Field label="Sexe" value={sexe} onChange={setSexe} />
          <Field 
            label="Espérance de vie estimée" 
            suffix="ans" 
            value={years.toFixed(1)} 
            onChange={() => {}} 
            readOnly={true}
          />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field 
            label="Loyer mensuel estimé" 
            suffix="€/mois" 
            value={loyer} 
            onChange={setLoyer} 
            help="Utilisé pour calculer le DUH"
          />
          <Field 
            label="Taux d'actualisation" 
            suffix="%/an" 
            value={taux} 
            onChange={setTaux} 
            help="Taux pour le DUH et la rente (souvent 2-4%)"
          />
          <Field 
            label="Bouquet (sur valeur occupée)" 
            suffix="%" 
            value={bouquetPct} 
            onChange={setBouquetPct} 
            help="Pourcentage de la valeur occupée versé au comptant"
          />
          <Field label="Taux de révision rente" suffix="%/an" value={index} onChange={setIndex} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} />
          <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
        </div>
      </Section>

      <Section title="Résultats – Viager">
        {/* Résultat 1: Montants clés */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Décote (DUH)</div>
            <div className="font-semibold">{decotePct.toFixed(1)} %</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Montant du Bouquet</div>
            <div className="font-semibold">{fmt(capBouquet)} €</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Rente mensuelle</div>
            <div className="font-semibold">{fmt(renteMensuelle)} €/mois</div>
          </div>
        </div>

        {/* Résultat 2: Coûts récurrents */}
        <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
          <div className="text-gray-700 font-semibold mb-1">Coûts récurrents pour le débirentier</div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rente mensuelle :</span>
            <span className="font-medium text-red-700">{fmt(renteMensuelle)} €/mois</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Charges + Taxes Foncières :</span>
            <span className="font-medium">{fmt((vCharges + vTaxe) / 12)} €/mois</span>
          </div>
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
            <span className="font-bold">Total mensuel :</span>
            <span className="font-bold text-red-700">{fmt(renteMensuelle + (vCharges + vTaxe) / 12)} €/mois</span>
          </div>
        </div>

        {/* Graphique */}
        <div className="mt-4">
          <DonutWithTotal
            data={donutCoutTotal}
            colors={COLORS}
            title="Répartition de la Valeur Vénale"
            totalTitle="Valeur Vénale + Frais"
          />
          <div className="text-center text-xs text-gray-500 mt-4">
            Coût total estimé de la rente sur {years.toFixed(1)} ans: {fmt(coutTotalRente)} €
          </div>
        </div>
      </Section>
    </div>
  );
}

/*********************
 * APP PRINCIPALE
 *********************/
export default function App() {
  const [tab, setTab] = useState("Viager"); // Viager est souvent le plus intéressant à voir en premier

  useEffect(() => {
    document.title = `Simulateur ${tab} – Viager & Location`;
  }, [tab]);
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Styles pour l'impression */}
      <style>{printStyles}</style>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto p-6 space-y-6 print-max-w">
          <header className="flex justify-between items-center no-print">
            <div>
              <h1 className="text-2xl font-bold">Simulateur Viager & Location</h1>
              <p className="text-sm text-gray-500">Comparateur interactif avec frais de notaire</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12M18 14v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4"/></svg>
                Version Imprimable
              </button>
              <Tabs tabs={["Location nue", "Viager"]} active={tab} onChange={setTab} />
            </div>
          </header>

          {/* Titre pour l'impression */}
          <div className="hidden print:block text-center mb-6">
             <h1 className="text-2xl font-bold">Rapport de Simulation Viager vs Location ({tab})</h1>
             <p className="text-sm text-gray-500">Date du rapport : {new Date().toLocaleDateString('fr-FR')}</p>
          </div>

          {tab === "Location nue" ? <LocationNue /> : <Viager />}

          <footer className="text-xs text-gray-400 text-center mt-8 no-print">
            Données indicatives — tables et calculs simplifiés. Consultez un notaire ou un expert viager pour un calcul précis.
          </footer>
        </div>
      </div>
    </>
  );
}
