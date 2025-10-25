import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Helmet, HelmetProvider } from "https://esm.sh/react-helmet-async";

// Configuration pour l'impression
const printStyles = `
  @media print {
    .no-print { display: none !important; }
    .print-max-w { max-width: none !important; }
    .bg-gradient-to-b { background: #fff !important; }
    .shadow { box-shadow: none !important; border: 1px solid #ccc; }
    .bg-gray-50, .bg-gray-100 { background-color: #f8f8f8 !important; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
  }
`;

/*********************
 * UTILITAIRES GÉNÉRAUX
 *********************/
const fmt = (n: number, d = 2) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—";

const toNum = (v: string) => {
  let s = (v || "").toString().trim();
  s = s.replace(/\s/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "");
    s = s.replace(",", ".");
  }
  return Number(s) || 0;
};

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

function SelectField({
  label,
  value,
  onChange,
  options,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  help?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-3 w-full">
      <div className="w-1/2">
        <div className="text-sm text-gray-700 font-medium">{label}</div>
        {help ? <div className="text-xs text-gray-400">{help}</div> : null}
      </div>
      <span className="flex items-center gap-2 w-1/2">
        <select
          className="w-full rounded-xl border p-2 focus:outline-none focus:ring bg-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </span>
    </label>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex-1 min-w-0 overflow-x-auto no-print">
      <div className="inline-flex rounded-2xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${active === t ? "bg-white shadow" : "text-gray-600 hover:text-gray-900"}`}
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

const COLORS = ["#3559E0", "#F2C94C", "#E67E22", "#27AE60"];

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
  if (displayData.length === 0) displayData.push({ name: "Aucune donnée", value: 1 });

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
 * TABLE INSEE SIMPLIFIÉE (EV)
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
      const a0 = keys[i - 1], a1 = keys[i];
      const y0 = tbl[a0], y1 = tbl[a1];
      return y0 + ((y1 - y0) * (age - a0)) / (a1 - a0);
    }
  }
  return 0;
}

/*********************
 * LOCATION NUE
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
  const [travauxInit, setTravauxInit] = useState("0");
  const [tmiLoc, setTmiLoc] = useState("30");
  const [psLoc, setPsLoc] = useState("17,2");

  const vPrix = toNum(prix), vApport = toNum(apport), vTaux = toNum(taux), vAssurance = toNum(assurance);
  const vDuree = toNum(duree), vTrav = toNum(travauxInit), vTMI = Math.max(0, toNum(tmiLoc)) / 100, vPS = Math.max(0, toNum(psLoc)) / 100;

  const capital = Math.max(0, vPrix - vApport);
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

  const taxableBase = Math.max(0, loyersAnn - chargesAnn);
  const impotsAnn = taxableBase * (vTMI + vPS);
  const revenuAnnApresImpots = Math.max(0, loyersAnn - chargesAnn - impotsAnn);
  const cashflowAnnApresImpots = revenuAnnApresImpots - serviceDetteAnn;
  const cashflowMensApresImpots = cashflowAnnApresImpots / 12;

  const baseInvestie = vApport + fraisNotaire + vTrav;
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
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/location-nue" />
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
            <div className="text-gray-700 font-semibold mb-1">Coût de l'emprunt sur {fmt(toNum(duree), 0)} ans</div>
            <div className="flex justify-between"><span className="text-gray-500">Intérêts :</span><span className="font-medium text-red-700">{fmt(coutTotalInterets)} €</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Assurance :</span><span className="font-medium">{fmt(coutTotalAssurance)} €</span></div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span className="font-bold">Total :</span><span className="font-bold text-red-700">{fmt(coutTotalInterets + coutTotalAssurance)} €</span></div>
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
 * VIAGER (avec garde-fous + sexe dropdown)
 *********************/
function Viager() {
  const modes = ["Viager occupé", "Viager libre", "Vente à terme"] as const;
  const [mode, setMode] = useState<typeof modes[number]>("Viager occupé");

  const [valeur, setValeur] = useState("292000");
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [taux, setTaux] = useState("2");
  const [bouquetPct, setBouquetPct] = useState("30");
  const [index, setIndex] = useState("1,1");
  const [charges, setCharges] = useState("1200");
  const [taxe, setTaxe] = useState("1300");
  const [loyer, setLoyer] = useState("740");
  const [hausseImmo, setHausseImmo] = useState("1,5");
  const [fraisVentePct, setFraisVentePct] = useState("6");
  const [dureeTerme, setDureeTerme] = useState("15");

  const safe = (n: number, def = 0) => (Number.isFinite(n) ? n : def);
  const nz = (n: number, min = 0) => (Number.isFinite(n) ? Math.max(min, n) : min);

  const vV = safe(toNum(valeur));
  const vAge = nz(toNum(age), 1);
  const vTaux = nz(toNum(taux), 0);
  const vBouquetPct = nz(toNum(bouquetPct), 0);
  const vIndex = nz(toNum(index), 0);
  const vCharges = nz(toNum(charges), 0);
  const vTaxe = nz(toNum(taxe), 0);
  const vLoyer = nz(toNum(loyer), 0);
  const vHausse = nz(toNum(hausseImmo), 0) / 100;
  const vFraisVente = nz(toNum(fraisVentePct), 0) / 100;
  const vDureeTerme = nz(toNum(dureeTerme), 1);

  const rawEV = safe(getEsperanceVie(vAge, sexe), 0);
  const yearsEV = nz(rawEV, 1);
  const horizonYears = mode === "Vente à terme" ? vDureeTerme : yearsEV;

  const valeurDUH = mode === "Viager occupé" ? nz(presentValueAnnuity(vLoyer, yearsEV, vTaux), 0) : 0;
  const baseValeur = mode === "Viager occupé" ? Math.max(0, vV - valeurDUH) : vV;

  const capBouquet = (vBouquetPct / 100) * baseValeur;
  const capRenteOuTerme = Math.max(0, baseValeur - capBouquet);

  const renteMensuelle = mode !== "Vente à terme" ? nz(solveMonthlyFromPV(capRenteOuTerme, yearsEV, vTaux, vIndex), 0) : 0;
  const mensualiteTerme = mode === "Vente à terme" ? capRenteOuTerme / (vDureeTerme * 12) : 0;

  const fraisNotaire = calculateNotaryFees(baseValeur);

  const totalRentesOuTermes = (mode === "Vente à terme" ? mensualiteTerme : renteMensuelle) * horizonYears * 12;
  const coutChargesTaxes = (vCharges + vTaxe) * horizonYears;
  const coutTotalInvestisseur = capBouquet + fraisNotaire + totalRentesOuTermes + coutChargesTaxes;

  const prixFutur = vV * Math.pow(1 + vHausse, horizonYears);
  const produitNetVente = prixFutur * (1 - vFraisVente);
  const rendementAnnualise = coutTotalInvestisseur > 0 ? (Math.pow(produitNetVente / coutTotalInvestisseur, 1 / horizonYears) - 1) * 100 : 0;
  const decotePct = vV > 0 ? (valeurDUH / vV) * 100 : 0;

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
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/viager" />
      </Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Viager">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-3 no-print">
            <div className="text-sm text-gray-600">Configuration</div>
            <Tabs tabs={[...modes]} active={mode} onChange={(t) => setMode(t as typeof modes[number])} />
          </div>
          <div className="space-y-3">
            <Field label="Valeur vénale (marché)" suffix="€" value={valeur} onChange={setValeur} />
            <Field label="Âge du crédirentier" suffix="ans" value={age} onChange={setAge} />
            <SelectField label="Sexe" value={sexe} onChange={setSexe} options={["Femme", "Homme"]} />
            <Field label="Espérance de vie estimée" suffix="ans" value={yearsEV} onChange={() => {}} readOnly={true} decimals={1} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            {mode === "Viager occupé" && (
              <Field label="Loyer mensuel estimé (pour DUH)" suffix="€/mois" value={loyer} onChange={setLoyer} help="Utilisé pour calculer la décote DUH" />
            )}
            {mode !== "Vente à terme" ? (
              <>
                <Field label="Taux d'actualisation" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
                <Field label="Bouquet (sur base)" suffix="%" value={bouquetPct} onChange={setBouquetPct} />
                <Field label="Taux de révision rente" suffix="%/an" value={index} onChange={setIndex} decimals={2} />
              </>
            ) : (
              <>
                <Field label="Taux d'actualisation" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
                <Field label="Bouquet (sur base)" suffix="%" value={bouquetPct} onChange={setBouquetPct} />
                <Field label="Durée de paiement (vente à terme)" suffix="ans" value={dureeTerme} onChange={setDureeTerme} />
              </>
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
 * SCPI (placeholder conservé)
 *********************/
function SCPI() {
  return (
    <div className="rounded-2xl bg-white shadow p-5">
      <div className="text-gray-500">SCPI – Conserve ton composant complet ici.</div>
    </div>
  );
}

/*********************
 * LOCAL COMMERCIAL (placeholder conservé)
 *********************/
function LocalCommercial() {
  return (
    <div className="rounded-2xl bg-white shadow p-5">
      <div className="text-gray-500">Local commercial – Conserve ton composant complet ici.</div>
    </div>
  );
}

/*********************
 * NOUVEAU : CREDIT IMMOBILIER (avec tableau d'amortissement repliable)
 *********************/
function CreditImmo() {
  const [capital, setCapital] = useState("250000");
  const [taux, setTaux] = useState("3,20");
  const [assurance, setAssurance] = useState("0,30");
  const [duree, setDuree] = useState("25");

  const vCap = toNum(capital);
  const vTaux = toNum(taux);
  const vAss = toNum(assurance);
  const vDur = toNum(duree);

  const mensuHorsAss = annuityPayment(vCap, vTaux, vDur);
  const assMens = (vCap * (vAss / 100)) / 12;
  const mensuTot = mensuHorsAss + assMens;

  const n = vDur * 12;
  const totalInterets = Math.max(0, mensuHorsAss * n - vCap);
  const totalAssurance = assMens * n;
  const coutTotal = totalInterets + totalAssurance;

  // Comparateur express par stratégie
  const [tLoc, setTLoc] = useState("3,2");
  const [tVia, setTVia] = useState("3,0");
  const [tScpi, setTScpi] = useState("3,6");
  const [tCom, setTCom] = useState("4,0");
  const mkMensu = (rate: number) => annuityPayment(vCap, rate, vDur) + assMens;

  const donut = [
    { name: "Intérêts", value: totalInterets },
    { name: "Assurance", value: totalAssurance },
    { name: "Capital", value: vCap },
  ];

  // Amortissement (mois par mois)
  const [showAmort, setShowAmort] = useState(false);
  type Row = { mois: number; echeanceHorsAss: number; assurance: number; interets: number; principal: number; restant: number };
  const schedule: Row[] = (() => {
    const rows: Row[] = [];
    let restant = vCap;
    const r = vTaux / 100 / 12;
    for (let i = 1; i <= n; i++) {
      const interets = r > 0 ? restant * r : 0;
      const principal = Math.max(0, mensuHorsAss - interets);
      restant = Math.max(0, restant - principal);
      rows.push({
        mois: i,
        echeanceHorsAss: mensuHorsAss,
        assurance: assMens,
        interets,
        principal,
        restant,
      });
    }
    return rows;
  })();

  return (
    <>
      <Helmet>
        <title>Calculateur de prêt immobilier – Mensualité, intérêts & assurance</title>
        <meta name="description" content="Simulez un crédit immobilier : mensualité, intérêts totaux et assurance. Comparez les taux par stratégie et affichez le tableau d'amortissement." />
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/credit-immobilier" />
      </Helmet>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Crédit">
          <div className="space-y-3">
            <Field label="Capital emprunté" suffix="€" value={capital} onChange={setCapital} />
            <Field label="Taux nominal" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
            <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} />
            <Field label="Durée" suffix="ans" value={duree} onChange={setDuree} />
          </div>
        </Section>

        <Section title="Résultats – Crédit">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité (hors assur.)</div><div className="font-semibold">{fmt(mensuHorsAss)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Assurance (mensuelle)</div><div className="font-semibold">{fmt(assMens)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité totale</div><div className="font-semibold">{fmt(mensuTot)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Coût total (int.+ass.)</div><div className="font-semibold">{fmt(coutTotal)} €</div></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donut} colors={COLORS} title="Décomposition du prêt" totalTitle="Total (capital+coûts)" />
            <div className="bg-white rounded-2xl shadow p-4 text-sm">
              <div className="font-semibold mb-2">Comparateur express par stratégie (même capital/durée)</div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <span className="text-xs text-gray-500">Stratégie</span>
                <span className="text-xs text-gray-500">Taux %</span>
                <span className="text-xs text-gray-500">Mensualité (C+I+A)</span>
              </div>

              {[
                { label: "Location nue", v: tLoc, set: setTLoc },
                { label: "Viager", v: tVia, set: setTVia },
                { label: "SCPI", v: tScpi, set: setTScpi },
                { label: "Local commercial", v: tCom, set: setTCom },
              ].map((row, i) => {
                const r = toNum(row.v);
                const m = mkMensu(r);
                return (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center py-1">
                    <div>{row.label}</div>
                    <input
                      className="border rounded-lg p-1 text-right"
                      value={row.v}
                      onChange={(e) => row.set(e.target.value)}
                      inputMode="decimal"
                    />
                    <div className="text-right font-medium">{fmt(m)} €/mois</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggle & Tableau d'amortissement */}
          <div className="mt-6">
            <button
              onClick={() => setShowAmort(s => !s)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow"
            >
              {showAmort ? "Masquer le tableau d'amortissement" : "Afficher le tableau d'amortissement"}
            </button>

            {showAmort && (
              <div className="mt-4 bg-white rounded-2xl shadow p-4">
                <div className="text-sm font-semibold mb-3">Tableau d'amortissement (mensuel)</div>
                <div className="overflow-auto max-h-[480px] border rounded-xl">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Mois</th>
                        <th className="text-right p-2">Échéance hors assur.</th>
                        <th className="text-right p-2">Assurance</th>
                        <th className="text-right p-2">Intérêts</th>
                        <th className="text-right p-2">Principal</th>
                        <th className="text-right p-2">CRD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row) => (
                        <tr key={row.mois} className="odd:bg-white even:bg-gray-50">
                          <td className="p-2">{row.mois}</td>
                          <td className="p-2 text-right">{fmt(row.echeanceHorsAss)}</td>
                          <td className="p-2 text-right">{fmt(row.assurance)}</td>
                          <td className="p-2 text-right">{fmt(row.interets)}</td>
                          <td className="p-2 text-right">{fmt(row.principal)}</td>
                          <td className="p-2 text-right">{fmt(row.restant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Hypothèses : assurance calculée au pourcentage du capital initial, mensualité constante (amortissement à annuités constantes).
                </div>
              </div>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}

/****************************************
 * 10 COMMANDEMENTS (placeholder)
 ****************************************/
function CommandementsInvestisseur() {
  return (
    <div className="rounded-2xl bg-white shadow p-5">
      <div className="text-gray-500">10 Commandements – Conserve ton contenu existant ici.</div>
    </div>
  );
}

/****************************************
 * CONTACT (placeholder)
 ****************************************/
function ContactSection() {
  return (
    <section className="rounded-2xl bg-white shadow p-5">
      <div className="text-gray-500">Contact – Conserve ta section existante ici.</div>
    </section>
  );
}

/*********************
 * APP PRINCIPALE
 *********************/
export default function App() {
  const [tab, setTab] = useState("Location nue");
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
      case "Crédit immobilier":
        return <CreditImmo />;
      case "10 Commandements":
        return <CommandementsInvestisseur />;
      default:
        return null;
    }
  };

  const tabs = ["Location nue", "Viager", "SCPI", "Local commercial", "Crédit immobilier", "10 Commandements"];

  const webAppJsonLd = {
    "@context":"https://schema.org",
    "@type":"WebApplication",
    "name":"Simulateur immobilier – Viager, SCPI, Location",
    "url":"https://wizzwid.github.io/viager-vs-location/",
    "applicationCategory":"FinanceApplication",
    "operatingSystem":"Any",
    "offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"}
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Simulateur Immobilier: Viager, SCPI, Location | Calculette Gratuite</title>
        <meta name="description" content="Calculette immobilière gratuite: comparez viager (occupé, libre, vente à terme), SCPI, location nue et local commercial. Graphiques clairs, frais de notaire, cashflow, rendement." />
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/" />
        <script type="application/ld+json">{JSON.stringify(webAppJsonLd)}</script>
      </Helmet>
      <style>{printStyles}</style>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6 space-y-6 print-max-w">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div>
              <h1 className="text-2xl font-bold">Simulateur Immobilier Complet</h1>
              <p className="text-sm text-gray-500">Comparez, analysez et planifiez vos investissements</p>
            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12M18 14v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4"/></svg>
                Version Imprimable PDF
              </button>
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
            </div>
          </header>

          <div className="hidden print:block text-center mb-6">
            <h2 className="text-2xl font-bold">Rapport de Simulation ({tab})</h2>
            <p className="text-sm text-gray-500">Date du rapport : {new Date().toLocaleDateString("fr-FR")}</p>
          </div>

          {renderTabContent()}
        </div>
      </div>
    </HelmetProvider>
  );
}
