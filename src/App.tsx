import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Helmet, HelmetProvider } from "https://esm.sh/react-helmet-async"; // Reverted this line

// Configuration pour l'impression
const printStyles = `
  @media print {
    .no-print { display: none !important; }
    .print-max-w { max-width: none !important; }
    .bg-gradient-to-b { background: #fff !important; }
    .shadow { box-shadow: none !important; border: 1px solid #ccc; }
    .bg-gray-50, .bg-gray-100 { background-color: #f8f8f8 !important; }
  }
`;

/*********************
 * UTILITAIRES GÉNÉRAUX
 *********************/
// Formatage monétaire FR
const fmt = (n: number, d = 2) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—";

// Parsing FR (gère virgule décimale, espaces, points)
const toNum = (v: string) => {
  let s = (v || "").toString().trim();
  s = s.replace(/\s/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "");
    s = s.replace(",", ".");
  }
  return Number(s) || 0;
};

// Frais de notaire (ancien) ~7.5%
function calculateNotaryFees(price: number) {
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
  decimals = 0,
}: {
  label: string;
  suffix?: string;
  value: string | number;
  onChange: (v: string) => void;
  help?: string;
  readOnly?: boolean;
  decimals?: number;
}) {
  const displayValue = readOnly ? fmt(Number(value), decimals) : value;

  return (
    <label className="flex items-start justify-between gap-3 w-full">
      <div className="w-1/2">
        <div className="text-sm text-gray-700 font-medium">{label}</div>
        {help ? <div className="text-xs text-gray-400">{help}</div> : null}
      </div>
      <span className="flex items-center gap-2 w-1/2">
        <input
          className={`w-full rounded-xl border p-2 focus:outline-none ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "focus:ring"}`}
          value={displayValue}
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
    // Ce conteneur permet aux onglets de prendre l'espace disponible et de défiler
    <div className="flex-1 min-w-0 overflow-x-auto no-print">
      <div className="inline-flex rounded-2xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            // "whitespace-nowrap" évite que le texte des onglets aille à la ligne
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              active === t ? "bg-white shadow" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Legend({ data, colors }: { data: { name: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3 text-xs">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></span>
          <span className="text-gray-600">{item.name}</span>
          <span className="text-gray-400">({fmt(item.value)}€)</span>
        </div>
      ))}
      <div className="font-bold text-gray-800 ml-4">Total: {fmt(total)} €</div>
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
  const displayData = data.filter((item) => item.value > 0);
  if (displayData.length === 0) {
    displayData.push({ name: "Aucune donnée", value: 1 });
  }

  return (
    <div className="flex flex-col items-center">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              dataKey="value"
              data={displayData}
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              fill={displayData.length === 1 && displayData[0].name === "Aucune donnée" ? "#ccc" : undefined}
            >
              {displayData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, _n, props: any) => [`${fmt(v)} €`, props?.payload?.name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-sm font-medium mt-2">{title}</div>
      <div className="text-lg font-bold text-gray-800">
        {totalTitle}: {fmt(total)} €
      </div>
      <Legend data={data} colors={COLORS} />
    </div>
  );
}

/*********************
 * FORMULES FINANCIÈRES
 *********************/
function annuityPayment(capital: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = Math.round(years * 12);
  if (n === 0 || capital === 0) return 0;
  if (r <= 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

function presentValueAnnuity(monthly: number, years: number, discountPct: number) {
  const r = discountPct / 100 / 12;
  const n = Math.round(years * 12);
  if (n === 0 || monthly === 0) return 0;
  if (r === 0) return monthly * n;
  return monthly * ((1 - Math.pow(1 + r, -n)) / r) * (1 + r);
}

function pvIndexedAnnuity(monthly: number, years: number, discountPct: number, indexPct: number) {
  const r = discountPct / 100 / 12;
  const g = indexPct / 100 / 12;
  const n = Math.round(years * 12);
  const q = (1 + g) / (1 + r);
  if (q === 1) return monthly * n;
  return (monthly * (1 - Math.pow(q, n))) / (1 - q);
}

function solveMonthlyFromPV(targetPV: number, years: number, discountPct: number, indexPct: number) {
  const ref = pvIndexedAnnuity(100, years, discountPct, indexPct);
  return ref ? (targetPV / ref) * 100 : 0;
}

/*********************
 * TABLE INSEE SIMPLIFIÉE
 *********************/
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
      return y0 + ((y1 - y0) * (age - a0)) / (a1 - a0);
    }
  }
  return 0;
}

const COLORS = ["#3559E0", "#F2C94C", "#E67E22", "#27AE60"];

/*********************
 * COMPOSANT LOCATION NUE
 *********************/
function LocationNue() {
  const [prix, setPrix] = useState("292000");
  const [apport, setApport] = useState("72000");
  const [taux, setTaux] = useState("2,5");
  const [assurance, setAssurance] = useState("0,35");
  const [duree, setDuree] = useState("20");
  const [loyer, setLoyer] = useState("740");
  const [charges, setCharges] = useState("1200");
  const [taxe, setTaxe] = useState("1300");
  // Nouveaux champs
  const [travauxInit, setTravauxInit] = useState("0"); // travaux initiaux payés cash
  const [tmiLoc, setTmiLoc] = useState("30");         // TMI IR %
  const [psLoc, setPsLoc] = useState("17,2");         // PS %

  const vPrix = toNum(prix);
  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssurance = toNum(assurance);
  const vDuree = toNum(duree);
  const vTrav = toNum(travauxInit);
  const vTMI = Math.max(0, toNum(tmiLoc)) / 100;
  const vPS = Math.max(0, toNum(psLoc)) / 100;

  const capital = Math.max(0, vPrix - vApport); // prêt pour le bien (travaux payés cash par défaut)
  const mensualite = annuityPayment(capital, vTaux, vDuree);
  const assuranceMens = (capital * (vAssurance / 100)) / 12;
  const totalRemboursementMensuel = mensualite + assuranceMens;

  const nbMois = vDuree * 12;
  const totalRembourseCapitalAndInterest = mensualite * nbMois;
  const coutTotalInterets = Math.max(0, totalRembourseCapitalAndInterest - capital);
  const coutTotalAssurance = assuranceMens * nbMois;

  const fraisNotaire = calculateNotaryFees(vPrix);

  const loyersAnn = toNum(loyer) * 12;
  const chargesAnn = toNum(charges) + toNum(taxe);
  const serviceDetteAnn = totalRemboursementMensuel * 12;

  const taxableBase = Math.max(0, loyersAnn - chargesAnn); // approximation simple
  const impotsAnn = taxableBase * (vTMI + vPS);
  const revenuAnnApresImpots = Math.max(0, loyersAnn - chargesAnn - impotsAnn);
  const cashflowAnnApresImpots = revenuAnnApresImpots - serviceDetteAnn;
  const cashflowMensApresImpots = cashflowAnnApresImpots / 12;

  const baseInvestie = vApport + fraisNotaire + vTrav; // ce que l'investisseur a réellement sorti au départ
  const rendementNetApresImpots = baseInvestie > 0 ? (revenuAnnApresImpots / baseInvestie) * 100 : 0;

  const donutCout = [
    { name: "Apport", value: vApport },
    { name: "Capital prêt", value: capital },
    { name: "Frais de notaire", value: fraisNotaire },
    { name: "Travaux initiaux", value: vTrav },
  ];

  const donutCharge = [
    { name: "Mensualité Prêt (C+I)", value: mensualite },
    { name: "Assurance Emprunteur", value: assuranceMens },
    { name: "Taxe foncière (mens.)", value: toNum(taxe) / 12 },
    { name: "Charges (mens.)", value: toNum(charges) / 12 },
  ];

  return (
    <>
      <Helmet>
        <title>Calculette Rendement Location Nue – Cashflow, TMI, Frais de Notaire</title>
        <meta name="description" content="Intégrez prêt, assurance, charges, taxe foncière, travaux, TMI/PS pour un rendement net réaliste." />
        <link rel="canonical" href="https://<your-domain-here>/#/location-nue" />
      </Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Location nue">
          <div className="space-y-3">
            <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} />
            <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
            <Field label="Travaux (initiaux, cash)" suffix="€" value={travauxInit} onChange={setTravauxInit} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
            <Field label="Assurance" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} />
            <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Loyer mensuel" suffix="€" value={loyer} onChange={setLoyer} />
            <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="TMI (IR)" suffix="%" value={tmiLoc} onChange={setTmiLoc} />
            <Field label="Prélèvements sociaux" suffix="%" value={psLoc} onChange={setPsLoc} />
          </div>
        </Section>

        <Section title="Résultats – Location nue">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Remboursement mensuel total</div>
              <div className="font-semibold">{fmt(totalRemboursementMensuel)} €/mois</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Revenu annuel après impôts (hors dette)</div>
              <div className="font-semibold">{fmt(revenuAnnApresImpots)} €</div>
            </div>
            <div className={`bg-gray-50 p-3 rounded-xl ${cashflowMensApresImpots < 0 ? "text-red-600" : "text-green-600"}`}>
              <div className="text-gray-500">Cashflow net après impôts</div>
              <div className="font-semibold">{fmt(cashflowMensApresImpots)} €/mois</div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
            <div className="text-gray-700 font-semibold mb-1">Coût de l'emprunt sur {fmt(vDuree, 0)} ans</div>
            <div className="flex justify-between"><span className="text-gray-500">Intérêts :</span><span className="font-medium text-red-700">{fmt(coutTotalInterets)} €</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Assurance :</span><span className="font-medium">{fmt(coutTotalAssurance)} €</span></div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span className="font-bold">Total :</span><span className="font-bold text-red-700">{fmt(coutTotalInterets + coutTotalAssurance)} €</span></div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
            <div className="flex justify-between"><span className="font-semibold">Rendement net après impôts :</span><span className="font-bold">{fmt(rendementNetApresImpots, 2)} %</span></div>
            <div className="text-xs text-gray-500">Base investie = Apport + Frais de notaire + Travaux (cash). Impôt approximé sur loyers nets de charges (sans distinction intérêts/assurance).</div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donutCout} colors={COLORS} title="Coût d'acquisition initial" totalTitle="Total initial" />
            <DonutWithTotal data={donutCharge} colors={COLORS.slice(2)} title="Dépenses récurrentes (mensuelles)" totalTitle="Total mensuel" />
          </div>
        </Section>
      </div>
    </>
  );
}

/*********************
 * COMPOSANT VIAGER
 *********************/
function Viager() {
  // Modes
  const modes = ["Viager occupé", "Viager libre", "Vente à terme"] as const;
  const [mode, setMode] = useState<typeof modes[number]>("Viager occupé");

  // Paramètres communs
  const [valeur, setValeur] = useState("292000"); // Valeur vénale
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [taux, setTaux] = useState("2"); // taux d'actualisation
  const [bouquetPct, setBouquetPct] = useState("30");
  const [index, setIndex] = useState("1,1"); // indexation rente
  const [charges, setCharges] = useState("1200");
  const [taxe, setTaxe] = useState("1300");
  // Spécifique occupé (DUH basé sur loyer) et libre (loyer optionnel pour info DUH=0)
  const [loyer, setLoyer] = useState("740");
  // Projection marché
  const [hausseImmo, setHausseImmo] = useState("1,5"); // %/an
  const [fraisVentePct, setFraisVentePct] = useState("6"); // % du prix de revente
  // Vente à terme
  const [dureeTerme, setDureeTerme] = useState("15"); // ans

  // Conversions
  const vV = toNum(valeur);
  const vAge = toNum(age);
  const vTaux = toNum(taux);
  const vBouquetPct = toNum(bouquetPct);
  const vIndex = toNum(index);
  const vCharges = toNum(charges);
  const vTaxe = toNum(taxe);
  const vHausse = Math.max(0, toNum(hausseImmo)) / 100;
  const vFraisVente = Math.max(0, toNum(fraisVentePct)) / 100;
  const vLoyer = toNum(loyer);
  const vDureeTerme = Math.max(1, toNum(dureeTerme));

  // Horizon : Occupé/Libre -> espérance de vie; Vente à terme -> durée du terme
  const yearsEV = getEsperanceVie(vAge, sexe);
  const horizonYears = mode === "Vente à terme" ? vDureeTerme : yearsEV;

  // DUH selon mode
  const valeurDUH = mode === "Viager occupé" ? presentValueAnnuity(vLoyer, yearsEV, vTaux) : 0;

  // Valeur occupée (pour occupé) ou pleine (libre/terme)
  const baseValeur = mode === "Viager occupé" ? Math.max(0, vV - valeurDUH) : vV;

  // Répartition bouquet / capital rente (ou capital à terme)
  const capBouquet = (vBouquetPct / 100) * baseValeur;
  const capRenteOuTerme = Math.max(0, baseValeur - capBouquet);

  // Rente mensuelle (Occupé/Libre) via VA -> flux indexé
  const renteMensuelle = mode !== "Vente à terme" ? solveMonthlyFromPV(capRenteOuTerme, yearsEV, vTaux, vIndex) : 0;

  // Vente à terme : mensualité fixe sur durée donnée (sans intérêt implicite), possibilité d'ajouter indice via info
  const mensualiteTerme = mode === "Vente à terme" ? (capRenteOuTerme / (vDureeTerme * 12)) : 0;

  // Frais de notaire sur la base achetée (occupé = valeur occupée)
  const fraisNotaire = calculateNotaryFees(baseValeur);

  // Coûts récurrents (débirentier)
  const depensesMensuelles = mode === "Vente à terme" ? (mensualiteTerme + (vCharges + vTaxe) / 12)
    : (renteMensuelle + (vCharges + vTaxe) / 12);

  // Totaux cumulés (non actualisés) sur l'horizon
  const totalRentesOuTermes = (mode === "Vente à terme" ? mensualiteTerme : renteMensuelle) * horizonYears * 12;
  const coutChargesTaxes = (vCharges + vTaxe) * horizonYears; // cumul simple
  const coutTotalInvestisseur = capBouquet + fraisNotaire + totalRentesOuTermes + coutChargesTaxes;

  // Valeur de revente au terme (EV ou durée fixe) avec hausse marché et frais de vente
  const prixFutur = vV * Math.pow(1 + vHausse, horizonYears);
  const produitNetVente = prixFutur * (1 - vFraisVente);

  // Rendement annualisé simple (type TRI approximatif)
  const rendementAnnualise = coutTotalInvestisseur > 0 ? (Math.pow(produitNetVente / coutTotalInvestisseur, 1 / horizonYears) - 1) * 100 : 0;

  // Décote affichage (seulement en occupé)
  const decotePct = vV > 0 ? (valeurDUH / vV) * 100 : 0;

  // Données donuts
  const donutCoutTotal = [
    ...(mode === "Viager occupé" ? [{ name: "Valeur DUH (Décote)", value: valeurDUH }] : []),
    { name: "Bouquet", value: capBouquet },
    { name: mode === "Vente à terme" ? "Capital à terme" : "Capital Rente", value: capRenteOuTerme },
    { name: "Frais de notaire", value: fraisNotaire },
  ];
  const donutCoutMensuels = [
    { name: mode === "Vente à terme" ? "Mensualité (terme)" : "Rente mensuelle", value: mode === "Vente à terme" ? mensualiteTerme : renteMensuelle },
    { name: "Charges (mens.)", value: vCharges / 12 },
    { name: "Taxe foncière (mens.)", value: vTaxe / 12 },
  ];

  return (
    <>
      <Helmet>
        <title>Simulateur Viager Occupé/Libre & Vente à Terme – Bouquet, Rente, DUH</title>
        <meta name="description" content="Calculez la décote DUH, bouquet, rente indexée, horizon (espérance de vie), revente à terme et rendement annualisé." />
        <link rel="canonical" href="https://<your-domain-here>/#/viager" />
      </Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Viager">
          {/* Div responsive pour les onglets Viager */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-3 no-print">
            <div className="text-sm text-gray-600">Configuration</div>
            <Tabs tabs={[...modes]} active={mode} onChange={(t) => setMode(t as typeof modes[number])} />
          </div>
          <div className="space-y-3">
            <Field label="Valeur vénale (marché)" suffix="€" value={valeur} onChange={setValeur} />
            <Field label="Âge du crédirentier" suffix="ans" value={age} onChange={setAge} />
            <Field label="Sexe" value={sexe} onChange={setSexe} />
            <Field label="Espérance de vie estimée" suffix="ans" value={yearsEV} onChange={() => {}} readOnly={true} decimals={1} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            {mode === "Viager occupé" && (
              <Field label="Loyer mensuel estimé (pour DUH)" suffix="€/mois" value={loyer} onChange={setLoyer} help="Utilisé pour calculer la décote DUH" />
            )}
            <Field label="Taux d'actualisation" suffix="%/an" value={taux} onChange={setTaux} help="Taux pour DUH (si occupé) et la rente" decimals={2} />
            <Field label="Bouquet (sur base)" suffix="%" value={bouquetPct} onChange={setBouquetPct} />
            {mode !== "Vente à terme" ? (
              <Field label="Taux de révision rente" suffix="%/an" value={index} onChange={setIndex} decimals={2} />
            ) : (
              <Field label="Durée de paiement (vente à terme)" suffix="ans" value={dureeTerme} onChange={setDureeTerme} />
            )}
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Hausse des prix immo" suffix="%/an" value={hausseImmo} onChange={setHausseImmo} />
            <Field label="Frais de vente à terme" suffix="%" value={fraisVentePct} onChange={setFraisVentePct} />
          </div>
        </Section>

        <Section title="Résultats – Viager">
          <div className="grid grid-cols-3 gap-3 text-sm">
            {mode === "Viager occupé" && (
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Décote (DUH)</div><div className="font-semibold">{fmt(decotePct, 1)} %</div></div>
            )}
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Montant du Bouquet</div><div className="font-semibold">{fmt(capBouquet)} €</div></div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">{mode === "Vente à terme" ? "Mensualité (terme)" : "Rente mensuelle"}</div>
              <div className="font-semibold">{fmt(mode === "Vente à terme" ? mensualiteTerme : renteMensuelle)} €/mois</div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
            <div className="text-gray-700 font-semibold mb-1">Projection à l'échéance ({fmt(horizonYears, 1)} ans)</div>
            <div className="flex justify-between"><span>Prix futur estimé :</span><span className="font-medium">{fmt(prixFutur)} €</span></div>
            <div className="flex justify-between"><span>Produit net de vente :</span><span className="font-medium">{fmt(produitNetVente)} €</span></div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span>Total déboursé (bouquet + frais + rentes/terme + charges/taxes) :</span><span className="font-medium">{fmt(coutTotalInvestisseur)} €</span></div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span className="font-bold">Rendement annualisé estimé :</span><span className="font-bold">{fmt(rendementAnnualise, 2)} %</span></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donutCoutTotal} colors={COLORS} title={mode === "Viager occupé" ? "Répartition de la Valeur Vénale" : "Structure de l'opération"} totalTitle="Total Vénale + Frais" />
            <DonutWithTotal data={donutCoutMensuels} colors={COLORS.slice(1)} title="Dépenses récurrentes (mensuelles)" totalTitle="Total mensuel" />
          </div>

          {mode !== "Vente à terme" && (
            <div className="text-center text-xs text-gray-500 mt-4">Coût total estimé de la rente (non actualisé) sur {fmt(yearsEV, 1)} ans: {fmt(renteMensuelle * yearsEV * 12)} €</div>
          )}
        </Section>
      </div>
    </>
  );
}

/*********************
 * COMPOSANT SCPI (corrigé)
 *********************/
function SCPI() {
  // Investissement (montant déboursé = capital net + frais de souscription)
  const [montant, setMontant] = useState("50000");
  const [td, setTd] = useState("5");
  const [fraisSous, setFraisSous] = useState("8");
  const [fraisAnn, setFraisAnn] = useState("0");
  const [delaiJouissanceMois, setDelaiJouissanceMois] = useState("3");

  // Mode d'investissement (PP vs NP)
  const scpiModes = ["Pleine propriété", "Nue-propriété"] as const;
  const [mode, setMode] = useState<typeof scpiModes[number]>("Pleine propriété");

  // Fiscalité (utile en pleine propriété)
  const [tmiIr, setTmiIr] = useState("30");
  const [ps, setPs] = useState("17,2");

  // Démembrement (nue-propriété)
  const [dureeNP, setDureeNP] = useState("10"); // ans
  const [decoteNP, setDecoteNP] = useState("30"); // % de décote
  const [revaloParts, setRevaloParts] = useState("1"); // %/an revalo

  // Financement (facultatif)
  const [apport, setApport] = useState("10000");
  const [taux, setTaux] = useState("3,1");
  const [assurance, setAssurance] = useState("0,30");
  const [duree, setDuree] = useState("15");

  // Conversion
  const vMontant = toNum(montant);
  const vTD = toNum(td) / 100;
  const vFraisSous = toNum(fraisSous) / 100;
  const vFraisAnn = toNum(fraisAnn) / 100;
  const vDelai = Math.max(0, Math.min(12, Math.round(toNum(delaiJouissanceMois))));
  const vTMI = Math.max(0, toNum(tmiIr)) / 100;
  const vPS = Math.max(0, toNum(ps)) / 100;
  const vDurNP = Math.max(0, Math.round(toNum(dureeNP)));
  const vDecoteNP = Math.max(0, toNum(decoteNP)) / 100;
  const vRevalo = Math.max(0, toNum(revaloParts)) / 100;

  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssur = toNum(assurance);
  const vDuree = toNum(duree);

  // Décomposition du montant déboursé (❗ Donut unique demandé)
  const capitalNetInvesti = vMontant / (1 + vFraisSous);
  const fraisSouscription = vMontant - capitalNetInvesti;
  const donutMontant = [
    { name: "Capital net investi", value: capitalNetInvesti },
    { name: "Frais de souscription", value: fraisSouscription },
  ];

  // Distributions (pleine propriété)
  const distBrutePleine = capitalNetInvesti * vTD;
  const distBruteAn1 = distBrutePleine * ((12 - vDelai) / 12);
  const fraisRecurAnn = capitalNetInvesti * vFraisAnn;
  const distNetteAn1 = Math.max(0, distBruteAn1 - fraisRecurAnn);
  const distNettePleine = Math.max(0, distBrutePleine - fraisRecurAnn);

  // Fiscalité (IR + PS) sur distributions (PP uniquement)
  const distApresImpotsAn1 = Math.max(0, distNetteAn1 - distNetteAn1 * (vTMI + vPS));
  const distApresImpotsPleine = Math.max(0, distNettePleine - distNettePleine * (vTMI + vPS));

  // Financement du montant déboursé
  const dette = Math.max(0, vMontant - vApport);
  const mensu = annuityPayment(dette, vTaux, vDuree);
  const assurMens = (dette * (vAssur / 100)) / 12;
  const serviceDetteMens = mensu + assurMens;

  // Logique NP (pas de revenus) — valeur reconstituée à terme
  const isNP = mode === "Nue-propriété";
  let valeurPPATerme = 0;
  let rendementNP = 0;
  if (isNP) {
    const pleinePropAujourd = capitalNetInvesti / (1 - vDecoteNP);
    valeurPPATerme = pleinePropAujourd * Math.pow(1 + vRevalo, vDurNP);
    rendementNP = vMontant > 0 && vDurNP > 0 ? (Math.pow(valeurPPATerme / vMontant, 1 / vDurNP) - 1) * 100 : 0;
  }

  // Résumés
  const cashflowMensAn1PP = (distApresImpotsAn1 - serviceDetteMens * 12) / 12;
  const cashflowMensPleinPP = (distApresImpotsPleine - serviceDetteMens * 12) / 12;

  return (
    <>
      <Helmet>
        <title>Simulateur SCPI (pleine & nue-propriété) – Rendement & cashflow</title>
        <meta name="description" content="Calculette SCPI: pleine propriété et nue-propriété, frais de souscription, financement, cashflow après impôts, rendement annualisé." />
        <link rel="canonical" href="https://<your-domain-here>/#/scpi" />
      </Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – SCPI">
          {/* Div responsive pour les onglets SCPI */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-3 no-print">
            <div className="text-sm text-gray-600">Mode d'investissement</div>
            <Tabs tabs={[...scpiModes]} active={mode} onChange={(t) => setMode(t as typeof scpiModes[number])} />
          </div>
          <div className="space-y-3">
            <Field label="Montant déboursé (brut)" suffix="€" value={montant} onChange={setMontant} />
            <Field label="Frais de souscription" suffix="%" value={fraisSous} onChange={setFraisSous} decimals={2} />

            {mode === "Pleine propriété" ? (
              <>
                <Field label="Taux de distribution (TD)" suffix="%/an" value={td} onChange={setTd} decimals={2} />
                <Field label="Frais récurrents additionnels" suffix="%/an" value={fraisAnn} onChange={setFraisAnn} decimals={2} />
                <Field label="Délai de jouissance" suffix="mois" value={delaiJouissanceMois} onChange={setDelaiJouissanceMois} />
                <div className="h-0.5 bg-gray-100 my-2"></div>
                <Field label="TMI (IR)" suffix="%" value={tmiIr} onChange={setTmiIr} />
                <Field label="Prélèvements sociaux" suffix="%" value={ps} onChange={setPs} />
              </>
            ) : (
              <>
                <Field label="Durée du démembrement" suffix="ans" value={dureeNP} onChange={setDureeNP} />
                <Field label="Décote nue-propriété" suffix="%" value={decoteNP} onChange={setDecoteNP} />
                <Field label="Revalo prix de part" suffix="%/an" value={revaloParts} onChange={setRevaloParts} />
              </>
            )}

            <div className="h-0.5 bg-gray-100 my-2"></div>
            <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
            <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
            <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} />
            <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
          </div>
        </Section>

        <Section title="Résultats – SCPI">
          {mode === "Pleine propriété" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Capital net investi</div><div className="font-semibold">{fmt(capitalNetInvesti)} €</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Dette (montant prêté)</div><div className="font-semibold">{fmt(dette)} €</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité (C+I+A)</div><div className="font-semibold">{fmt(serviceDetteMens)} €/mois</div></div>
              <div className={`bg-gray-50 p-3 rounded-xl ${cashflowMensAn1PP < 0 ? "text-red-700" : "text-green-700"}`}><div className="text-gray-500">Cashflow (an 1, après impôts)</div><div className="font-semibold">{fmt(cashflowMensAn1PP)} €/mois</div></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Valeur PP à terme</div><div className="font-semibold">{fmt(valeurPPATerme)} €</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Rendement NP (annualisé)</div><div className="font-semibold">{fmt(rendementNP, 2)} %</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité (C+I+A)</div><div className="font-semibold">{fmt(serviceDetteMens)} €/mois</div></div>
            </div>
          )}

          {/* Un SEUL donut demandé */}
          <div className="grid md:grid-cols-1 gap-6 mt-4">
            <DonutWithTotal data={donutMontant} colors={COLORS} title="Répartition du montant déboursé" totalTitle="Total déboursé" />
          </div>

          <div className="text-xs text-gray-500 mt-3">
            * Hypothèses simplifiées. Pleine propriété : revenus distribués imposés à TMI+PS. Nue-propriété : pas de revenus pendant la durée, rendement via valeur reconstituée à terme.
          </div>
        </Section>
      </div>
    </>
  );
}

/*********************
 * COMPOSANT LOCAL COMMERCIAL (nouveau)
 *********************/
function LocalCommercial() {
  // Hypothèses d'entrée
  const [prix, setPrix] = useState("250000");
  const [apport, setApport] = useState("50000");
  const [taux, setTaux] = useState("3");
  const [assurance, setAssurance] = useState("0,30");
  const [duree, setDuree] = useState("20");
  const [loyer, setLoyer] = useState("1500");   // €/mois
  const [charges, setCharges] = useState("2000"); // €/an
  const [taxe, setTaxe] = useState("1500");       // €/an

  const vPrix = toNum(prix);
  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssurance = toNum(assurance);
  const vDuree = toNum(duree);
  const vLoyer = toNum(loyer);
  const vCharges = toNum(charges);
  const vTaxe = toNum(taxe);

  const capital = Math.max(0, vPrix - vApport);
  const mensualite = annuityPayment(capital, vTaux, vDuree);
  const assuranceMens = (capital * (vAssurance / 100)) / 12;
  const mensualiteTotale = mensualite + assuranceMens;

  const fraisNotaire = calculateNotaryFees(vPrix);

  const revenuAnnuel = vLoyer * 12;
  const rendementBrut = vPrix > 0 ? (revenuAnnuel / vPrix) * 100 : 0;
  const chargesAnn = vCharges + vTaxe;
  const revenuNetAvantDette = Math.max(0, revenuAnnuel - chargesAnn);
  const rendementNet = vPrix > 0 ? (revenuNetAvantDette / vPrix) * 100 : 0;

  const cashflowMens = vLoyer - (vCharges + vTaxe) / 12 - mensualiteTotale;

  const donutCout = [
    { name: "Apport", value: vApport },
    { name: "Capital prêt", value: capital },
    { name: "Frais de notaire", value: fraisNotaire },
  ];

  const donutMensuels = [
    { name: "Mensualité Prêt (C+I)", value: mensualite },
    { name: "Assurance Emprunteur", value: assuranceMens },
    { name: "Charges (mens.)", value: vCharges / 12 },
    { name: "Taxe foncière (mens.)", value: vTaxe / 12 },
  ];

  return (
    <>
      <Helmet>
        <title>Simulateur Local Commercial – Rendement Brut, Net & Cashflow</title>
        <meta name="description" content="Estimez la rentabilité de votre investissement en local commercial. Calculez le rendement brut, net (hors dette) et le cashflow mensuel." />
        <link rel="canonical" href="https://<your-domain-here>/#/local-commercial" />
      </Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Local commercial">
          <div className="space-y-3">
            <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} />
            <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
            <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} />
            <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Loyer mensuel (HC)" suffix="€" value={loyer} onChange={setLoyer} />
            <Field label="Charges annuelles (PNO, syndic, vacance…)" suffix="€/an" value={charges} onChange={setCharges} />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
          </div>
        </Section>

        <Section title="Résultats – Local commercial">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Rendement brut</div>
              <div className="font-semibold">{fmt(rendementBrut, 2)} %</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Rendement net (hors dette)</div>
              <div className="font-semibold">{fmt(rendementNet, 2)} %</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Mensualité totale (crédit + assur.)</div>
              <div className="font-semibold">{fmt(mensualiteTotale)} €/mois</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Cashflow net estimé</div>
              <div className={`font-semibold ${cashflowMens < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(cashflowMens)} €/mois</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donutCout} colors={COLORS} title="Coût d'acquisition initial" totalTitle="Total initial" />
            <DonutWithTotal data={donutMensuels} colors={COLORS.slice(2)} title="Dépenses récurrentes (mensuelles)" totalTitle="Total mensuel" />
          </div>
        </Section>
      </div>
    </>
  );
}

/****************************************
 * COMPOSANT 10 COMMANDEMENTS (Nouveau)
 ****************************************/
function CommandementsInvestisseur() {
  // Mini-calculateur €/m²
  const [prix, setPrix] = useState("250000");
  const [surface, setSurface] = useState("50");
  const prixM2 = useMemo(() => {
    const p = parseFloat((prix || "0").replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    const s = parseFloat((surface || "0").replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    return s > 0 ? p / s : 0;
  }, [prix, surface]);

  // JSON-LD for FAQ Schema
  const faqJsonLd = {
    "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      {
        "@type":"Question",
        "name":"Comment calculer la rentabilité d’un viager ?",
        "acceptedAnswer":{"@type":"Answer","text":"Renseignez valeur vénale, bouquet, DUH/rente, charges et horizon. Le simulateur calcule cashflows, rentes cumulées et rendement annualisé."}
      },
      {
        "@type":"Question",
        "name":"Comment simuler une SCPI en nue-propriété ?",
        "acceptedAnswer":{"@type":"Answer","text":"Saisissez montant, décote, durée, revalorisation. La page SCPI calcule la valeur reconstituée à terme et le rendement annualisé sans revenus intermédiaires."}
      }
    ]
  };

  // Liens utiles
  const ressources = [
    {
      titre: "1) Évaluer le prix du bien",
      description:
        "Croisez DVF (transactions), baromètres, historiques d’annonces. Comparez votre €/m² au marché local.",
      liens: [
        { nom: "MeilleursAgents – prix/m²", url: "https://www.meilleursagents.com/prix-immobilier/" },
        { nom: "DVF – ventes réelles", url: "https://app.dvf.etalab.gouv.fr/" },
        { nom: "Castorus – historique d’annonces", url: "https://www.castorus.com/" },
        { nom: "SeLoger – estimation", url: "https://estimation.seloger.com/" },
      ],
    },
    {
      titre: "2) Vérifier les taux & le financement",
      description:
        "Comparez les taux de crédit, l’assurance emprunteur, la durée et la modularité pour optimiser le levier.",
      liens: [
        { nom: "Meilleurtaux", url: "https://www.meilleurtaux.com/" },
        { nom: "Pretto", url: "https://www.pretto.fr/" },
        { nom: "CAFPI", url: "https://www.cafpi.fr/" },
        { nom: "Banque de France – taux de référence", url: "https://www.banque-france.fr/statistiques/taux-et-cours/taux-dinteret-de-reference" },
      ],
    },
    {
      titre: "3) Plan cadastral & urbanisme",
      description:
        "Parcelles, superficies, servitudes, zonage et PLU : anticipez les contraintes de travaux/division.",
      liens: [
        { nom: "Cadastre.gouv.fr", url: "https://www.cadastre.gouv.fr/" },
        { nom: "Géoportail Urbanisme", url: "https://www.geoportail-urbanisme.gouv.fr/" },
        { nom: "Service-Public – urbanisme", url: "https://www.service-public.fr/particuliers/vosdroits/F1986" },
      ],
    },
    {
      titre: "4) Marché locatif (loyers & tension)",
      description:
        "Estimez loyers, vacance et profils de demande selon le quartier pour fiabiliser le cashflow.",
      liens: [
        { nom: "Clameur – loyers observés", url: "https://www.clameur.fr/" },
        { nom: "SeLoger – loyers moyens", url: "https://www.seloger.com/prix-de-l-immo/location.htm" },
        { nom: "LocService – loyers par ville", url: "https://www.locservice.fr/stats-location.html" },
      ],
    },
    {
      titre: "5) Fiscalité de l’investissement",
      description:
        "Projetez l’impact selon votre TMI et le régime (micro, réel, LMNP, SCPI). Testez plusieurs scénarios.",
      liens: [
        { nom: "Simulateurs – impots.gouv", url: "https://www.impots.gouv.fr/simulateurs" },
        { nom: "PAP – fiscalité location", url: "https://www.pap.fr/bailleur/fiscalite" },
        { nom: "Legifrance – textes officiels", url: "https://www.legifrance.gouv.fr/" },
      ],
    },
    {
      titre: "6) Contexte économique & démographie",
      description:
        "Emploi, démographie, projets urbains : la liquidité future dépend de la dynamique locale.",
      liens: [
        { nom: "INSEE – indicateurs locaux", url: "https://www.insee.fr/fr/statistiques/1405599" },
        { nom: "France Stratégie – attractivité", url: "https://www.strategie.gouv.fr/" },
      ],
    },
    {
      titre: "7) Frais & charges à anticiper",
      description:
        "Frais de notaire, PNO, syndic, taxe foncière, entretien, CAPEX : intégrez-les dans le rendement net.",
      liens: [
        { nom: "Service-Public – frais de notaire", url: "https://www.service-public.fr/particuliers/vosdroits/F32360" },
        { nom: "ANIL – charges & droits du bail", url: "https://www.anil.org/" },
      ],
    },
    {
      titre: "8) Choisir la bonne stratégie",
      description:
        "Nue/meublée, viager (occupé/libre/terme), SCPI, local pro : comparez rendement, fiscalité et gestion.",
      liens: [
        { nom: "Guide investissement – Boursorama", url: "https://www.boursorama.com/patrimoine/guide/immobilier/" },
        { nom: "SCPI vs immobilier – Finance Héros", url: "https://finance-heros.fr/scpi-ou-immobilier-physique/" },
      ],
    },
    {
      titre: "9) Assurance emprunteur",
      description:
        "Comparez les délégations d’assurance et les garanties (décès, PTIA, ITT).",
      liens: [
        { nom: "Les Furets – assurance prêt", url: "https://www.lesfurets.com/assurance-pret" },
        { nom: "Meilleurtaux – assurance de prêt", url: "https://www.meilleurtaux.com/assurance-de-pret.html" },
      ],
    },
    {
      titre: "10) S’entourer & valider",
      description:
        "Faites relire votre dossier (notaire, expert, CCI) et croisez toujours plusieurs sources.",
      liens: [
        { nom: "Notaires de France", url: "https://www.notaires.fr/" },
        { nom: "Experts immobiliers (FNAIM)", url: "https://www.experts-fnaim.org/" },
        { nom: "CCI – accompagnement", url: "https://www.cci.fr/" },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>Les 10 Commandements de l’investisseur – Outils & Sources</title>
        <meta name="description" content="Une page pour tout vérifier avant d’investir : prix/m², DVF, cadastre, taux, fiscalité, loyers, charges. Liens vers les meilleures sources." />
        <link rel="canonical" href="https://<your-domain-here>/#/commandements" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <div className="max-w-6xl mx-auto p-0">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
          Les 10 commandements de l’investisseur avisé
        </h1>
        <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
          Une page, toutes les étapes-clés : évaluer, vérifier, comparer et sécuriser votre investissement avec des sources fiables.
        </p>

        {/* Mini-calculateur €/m² */}
        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold mb-3">Calcul rapide du prix au m²</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <label className="flex flex-col">
              <span className="text-sm text-gray-600">Prix du bien (€)</span>
              <input value={prix} onChange={(e) => setPrix(e.target.value)} className="border rounded-lg p-2" inputMode="decimal" />
            </label>
            <label className="flex flex-col">
              <span className="text-sm text-gray-600">Surface (m²)</span>
              <input value={surface} onChange={(e) => setSurface(e.target.value)} className="border rounded-lg p-2" inputMode="decimal" />
            </label>
            <div className="bg-gray-50 rounded-lg p-3 flex flex-col justify-center">
              <div className="text-gray-500 text-sm">Prix au m² estimé</div>
              <div className="text-xl font-semibold">{Number.isFinite(prixM2) ? prixM2.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—"} €/m²</div>
            </div>
            <div className="flex items-center">
              <a href="https://www.meilleursagents.com/prix-immobilier/" target="_blank" rel="noopener noreferrer" className="w-full text-center rounded-lg p-3 border hover:bg-gray-50 transition">Ouvrir MeilleursAgents →</a>
            </div>
          </div>
        </div>

        {/* Cartes didactiques */}
        <div className="grid md:grid-cols-2 gap-5">
          {ressources.map((r, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-5 hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-blue-700 mb-2">{r.titre}</h3>
              <p className="text-gray-600 text-sm mb-3 leading-relaxed">{r.description}</p>
              <ul className="space-y-1 text-sm">
                {r.liens.map((l, j) => (
                  <li key={j}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {l.nom}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a href="#contact" className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition">
            Contacter l’équipe (formulaire)
          </a>
        </div>
      </div>
    </>
  );
}


/****************************************
 * COMPOSANT CONTACT (Lazy Load)
 ****************************************/
function ContactSection() {
  const [showForm, setShowForm] = useState(false);

  return (
    <section id="contact" className="mt-16 px-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4 text-center">Contact</h2>
      <p className="text-gray-600 text-center mb-6">
        Une question, une suggestion ou un cas à partager ?
        <br />
        {showForm
          ? "Remplissez le formulaire ci-dessous, nous vous répondrons rapidement."
          : "Cliquez sur le bouton pour afficher le formulaire."}
      </p>

      {showForm ? (
        <>
          {/* L'iframe n'est rendu qu'après le clic */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSdXirX0dD0kXFXnGHGIu6nCEvbMGtOg8oTMbqg69QPHqoip6A/viewform?embedded=true"
              width="100%"
              height="900"
              frameBorder={0}
              marginHeight={0}
              marginWidth={0}
              title="Formulaire de contact Viager vs Location"
            >
              Chargement…
            </iframe>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Ce formulaire est protégé par Google Forms (validation automatique et anti-spam intégrés).
          </p>
        </>
      ) : (
        // Bouton qui remplace le formulaire au chargement initial
        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
          >
            Afficher le formulaire de contact
          </button>
        </div>
      )}
    </section>
  );
}


/*********************
 * APP PRINCIPALE
 *********************/
export default function App() {
  const [tab, setTab] = useState("Viager"); // default

  // This useEffect is now for side-effects other than title, if any.
  // Title management is handled by Helmet in each component.
  useEffect(() => {
    // Potentially for other side-effects based on tab change
  }, [tab]);

  const handlePrint = () => window.print();

  const renderTabContent = () => {
    switch (tab) {
      case "Location nue":
        return <LocationNue />;
      case "Viager":
        return <Viager />;
      case "SCPI":
        return <SCPI />;
      case "Local commercial":
        return <LocalCommercial />;
      case "10 Commandements":
        return <CommandementsInvestisseur />;
      default:
        return null;
    }
  };
  
  const tabs = ["Location nue", "Viager", "SCPI", "Local commercial", "10 Commandements"];

  const webAppJsonLd = {
    "@context":"https://schema.org",
    "@type":"WebApplication",
    "name":"Simulateur immobilier – Viager, SCPI, Location",
    "url":"https://<your-domain-here>/",
    "applicationCategory":"FinanceApplication",
    "operatingSystem":"Any",
    "offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"}
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Simulateur Immobilier: Viager, SCPI, Location | Calculette Gratuite</title>
        <meta name="description" content="Calculette immobilière gratuite: comparez viager (occupé, libre, vente à terme), SCPI, location nue et local commercial. Graphiques clairs, frais de notaire, cashflow, rendement." />
        <script type="application/ld+json">{JSON.stringify(webAppJsonLd)}</script>
      </Helmet>
      <style>{printStyles}</style>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6 space-y-6 print-max-w">
          {/* Header mis à jour, responsive */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            {/* Titre */}
            <div>
              <h1 className="text-2xl font-bold">Simulateur Immobilier Complet</h1>
              <p className="text-sm text-gray-500">Comparez, analysez et planifiez vos investissements</p>
            </div>
            
            {/* Conteneur pour Bouton + Onglets */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              {/* Bouton d'impression (justifié au centre sur mobile) */}
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12M18 14v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4"/></svg>
                Version Imprimable PDF
              </button>
              {/* Le composant Tabs (qui a déjà le fix de scroll) s'insère ici */}
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
            </div>
          </header>

          {/* Titre pour l'impression */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">Rapport de Simulation ({tab})</h1>
            <p className="text-sm text-gray-500">Date du rapport : {new Date().toLocaleDateString("fr-FR")}</p>
          </div>

          {renderTabContent()}

          {/* À PROPOS */}
          <section id="apropos" className="mt-16 px-4 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">À propos</h2>
            <div className="bg-white rounded-lg shadow p-6 leading-relaxed">
              <p className="mb-4">
                <strong>Viager vs Location</strong> est un outil d’aide à la décision conçu pour les
                <strong> investisseurs immobiliers</strong> qui souhaitent comparer clearly la rentabilité
                entre plusieurs stratégies : <em>viager, location, local commercial et SCPI</em>.
              </p>
              <p className="mb-4">
                Notre objectif : rendre les calculs d’investissement <strong>clairs, rapides et transparents</strong>.
                L’outil est <strong>gratuit, neutre et indépendant</strong> : aucune affiliation à une plateforme commerciale.
              </p>
              <p className="mb-4">
                La méthodologie s’appuie sur des hypothèses explicites (taux, fiscalité, charges,
                horizon de détention) et des <strong>formules vérifiables</strong> affichées dans le simulateur.
                Les résultats proposés ne constituent pas un conseil financier ; ils servent de base
                pour structurer votre réflexion et vos discussions avec vos conseils.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="border rounded-md p-4"><div className="font-semibold mb-1">Indépendance</div><div className="text-sm text-gray-600">Aucune commission ni rétrocession.</div></div>
                <div className="border rounded-md p-4"><div className="font-semibold mb-1">Transparence</div><div className="text-sm text-gray-600">Hypothèses et calculs explicites.</div></div>
                <div className="border rounded-md p-4"><div className="font-semibold mb-1">Pédagogie</div><div className="text-sm text-gray-600">Comparaisons côte à côte et graphiques lisibles.</div></div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 border rounded-md">
                <div className="font-medium mb-1">Qui est derrière l’outil ?</div>
                <p className="text-sm text-gray-700">
                  Une équipe passionnée d’immobilier et de finance basée à Nantes, dédiée à la
                  démocratisation des stratégies patrimoniales de long terme, avec un focus sur le viager
                  et les actifs générateurs de revenus.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#simulateur" className="bg-blue-600 text-white px-5 py-2.5 rounded-md shadow hover:bg-blue-700 transition">Comparer maintenant</a>
                <a href="#contact" className="px-5 py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 transition">Contacter l’équipe</a>
              </div>
            </div>
          </section>

          {/* CONTACT (chargement à la demande) */}
          <ContactSection />

          <footer className="text-xs text-gray-400 text-center mt-8 no-print">
            Données indicatives — calculs simplifiés. Consultez un notaire / CGP / expert pour un conseil personnalisé.
            <br />
            <a
              href="https://wizzwid.github.io/viager-vs-location/sitemap.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 underline mt-1 inline-block"
            >
              Plan du site
            </a>
          </footer>
        </div>
      </div>
    </HelmetProvider>
  );
}

"

