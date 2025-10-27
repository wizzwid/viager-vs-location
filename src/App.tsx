import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Helmet, HelmetProvider } from "https://esm.sh/react-helmet-async";

// Configuration pour l'impression
const printStyles = `
  @media print {
    .no-print { display: none !important; }
    .print-max-w { max-width: none !important; }
    .bg-gradient-to-b { background: #fff !important; }
    .shadow { box-shadow: none !important; border: 1px solid #ccc; }
    .bg-gray-50, .bg-gray-100 { background-color: #f8f8f8 !important; }
    table { page-break-inside:auto }
    tr { page-break-inside:avoid; page-break-after:auto }
    thead { display:table-header-group }
    tfoot { display:table-footer-group }
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

// NOUVEAU : Composant Tooltip d'aide
function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center ml-1 cursor-help no-print">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {/* Tooltip text (invisible par défaut, visible au survol du groupe) */}
      <span
        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-md shadow-lg 
                   opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none"
      >
        {text}
      </span>
    </span>
  );
}

// MODIFIÉ : Field avec Tooltip
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
        <div className="flex items-center">
          <span className="text-sm text-gray-700 font-medium">{label}</span>
          {help && <HelpTooltip text={help} />}
        </div>
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

// MODIFIÉ : SelectField avec Tooltip
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
        <div className="flex items-center">
          <span className="text-sm text-gray-700 font-medium">{label}</span>
          {help && <HelpTooltip text={help} />}
        </div>
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

// NOUVEAU : CheckboxField avec Tooltip
function CheckboxField({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (c: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 w-full cursor-pointer">
      <div className="w-1/2">
        <div className="flex items-center">
          <span className="text-sm text-gray-700 font-medium">{label}</span>
          {help && <HelpTooltip text={help} />}
        </div>
      </div>
      <span className="flex items-center justify-start gap-2 w-1/2">
        <input
          type="checkbox"
          className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
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

// NOUVEAU : Type pour l'état global
type AppState = {
  locationNue: {
    prix: string;
    apport: string;
    taux: string;
    assurance: string;
    duree: string;
    loyer: string;
    charges: string;
    taxe: string;
    travauxInit: string;
    tmiLoc: string;
    psLoc: string;
  };
  viager: {
    mode: "Viager occupé" | "Viager libre" | "Vente à terme";
    valeur: string;
    age: string;
    sexe: string;
    taux: string;
    bouquetPct: string;
    index: string;
    charges: string;
    taxe: string;
    loyer: string;
    hausseImmo: string;
    fraisVentePct: string;
    dureeTerme: string;
  };
  scpi: {
    montant: string;
    td: string;
    fraisSous: string;
    fraisAnn: string;
    delaiJouissanceMois: string;
    mode: "Pleine propriété" | "Nue-propriété";
    tmiIr: string;
    ps: string;
    dureeNP: string;
    decoteNP: string;
    revaloParts: string;
    apport: string;
    taux: string;
    assurance: string;
    duree: string;
  };
  localCommercial: {
    prix: string;
    apport: string;
    taux: string;
    assurance: string;
    duree: string;
    loyer: string;
    charges: string;
    taxe: string;
  };
  creditImmo: {
    capital: string;
    taux: string;
    assurance: string;
    duree: string;
    assuranceSurCRD: boolean; // NOUVEAU
  };
};

// NOUVEAU : État par défaut de l'application
const DEFAULT_STATE: AppState = {
  locationNue: {
    prix: "292000",
    apport: "72000",
    taux: "2,5",
    assurance: "0,35",
    duree: "20",
    loyer: "740",
    charges: "1200",
    taxe: "1300",
    travauxInit: "0",
    tmiLoc: "30",
    psLoc: "17,2",
  },
  viager: {
    mode: "Viager occupé",
    valeur: "292000",
    age: "71",
    sexe: "Femme",
    taux: "2",
    bouquetPct: "30",
    index: "1,1",
    charges: "1200",
    taxe: "1300",
    loyer: "740",
    hausseImmo: "1,5",
    fraisVentePct: "6",
    dureeTerme: "15",
  },
  scpi: {
    montant: "50000",
    td: "5",
    fraisSous: "8",
    fraisAnn: "0",
    delaiJouissanceMois: "3",
    mode: "Pleine propriété",
    tmiIr: "30",
    ps: "17,2",
    dureeNP: "10",
    decoteNP: "30",
    revaloParts: "1",
    apport: "10000",
    taux: "3,1",
    assurance: "0,30",
    duree: "15",
  },
  localCommercial: {
    prix: "250000",
    apport: "50000",
    taux: "3",
    assurance: "0,30",
    duree: "20",
    loyer: "1500",
    charges: "2000",
    taxe: "1500",
  },
  creditImmo: {
    capital: "250000",
    taux: "3,20",
    assurance: "0,30",
    duree: "25",
    assuranceSurCRD: false, // NOUVEAU
  },
};

/*********************
 * COMPOSANT LOCATION NUE (MODIFIÉ)
 *********************/
// MODIFIÉ : Utilise `data` et `onChange` props
function LocationNue({
  data,
  onChange,
}: {
  data: AppState["locationNue"];
  onChange: (d: AppState["locationNue"]) => void;
}) {
  const { prix, apport, taux, assurance, duree, loyer, charges, taxe, travauxInit, tmiLoc, psLoc } = data;

  // Setters qui mettent à jour l'état global
  const setPrix = (v: string) => onChange({ ...data, prix: v });
  const setApport = (v: string) => onChange({ ...data, apport: v });
  const setTaux = (v: string) => onChange({ ...data, taux: v });
  const setAssurance = (v: string) => onChange({ ...data, assurance: v });
  const setDuree = (v: string) => onChange({ ...data, duree: v });
  const setLoyer = (v: string) => onChange({ ...data, loyer: v });
  const setCharges = (v: string) => onChange({ ...data, charges: v });
  const setTaxe = (v: string) => onChange({ ...data, taxe: v });
  const setTravauxInit = (v: string) => onChange({ ...data, travauxInit: v });
  const setTmiLoc = (v: string) => onChange({ ...data, tmiLoc: v });
  const setPsLoc = (v: string) => onChange({ ...data, psLoc: v });

  // Les calculs restent identiques
  const vPrix = toNum(prix);
  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssurance = toNum(assurance);
  const vDuree = toNum(duree);
  const vTrav = toNum(travauxInit);
  const vTMI = Math.max(0, toNum(tmiLoc)) / 100;
  const vPS = Math.max(0, toNum(psLoc)) / 100;

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
            <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} help="Prix d'achat 'acte en main', hors frais de notaire." />
            <Field label="Apport" suffix="€" value={apport} onChange={setApport} help="Montant de votre apport personnel, hors frais." />
            <Field label="Travaux (initiaux, cash)" suffix="€" value={travauxInit} onChange={setTravauxInit} help="Montant des travaux financés par apport (non empruntés)." />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} help="Taux d'intérêt nominal annuel, hors assurance." />
            <Field label="Assurance" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} help="Taux de l'assurance emprunteur, calculé sur le capital initial." />
            <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Loyer mensuel" suffix="€" value={loyer} onChange={setLoyer} help="Loyer mensuel hors charges." />
            <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} help="Total des charges annuelles non récupérables (syndic, PNO, entretien...)." />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="TMI (IR)" suffix="%" value={tmiLoc} onChange={setTmiLoc} help="Votre Taux Marginal d'Imposition (ex: 0, 11, 30, 41, 45)." />
            <Field label="Prélèvements sociaux" suffix="%" value={psLoc} onChange={setPsLoc} help="Prélèvements sociaux sur les revenus fonciers (ex: 17,2%)." />
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
 * COMPOSANT VIAGER (MODIFIÉ)
 *********************/
// MODIFIÉ : Utilise `data` et `onChange` props
function Viager({
  data,
  onChange,
}: {
  data: AppState["viager"];
  onChange: (d: AppState["viager"]) => void;
}) {
  const modes = ["Viager occupé", "Viager libre", "Vente à terme"] as const;
  const {
    mode,
    valeur,
    age,
    sexe,
    taux,
    bouquetPct,
    index,
    charges,
    taxe,
    loyer,
    hausseImmo,
    fraisVentePct,
    dureeTerme,
  } = data;

  // Setters
  const setMode = (v: string) => onChange({ ...data, mode: v as typeof modes[number] });
  const setValeur = (v: string) => onChange({ ...data, valeur: v });
  const setAge = (v: string) => onChange({ ...data, age: v });
  const setSexe = (v: string) => onChange({ ...data, sexe: v });
  const setTaux = (v: string) => onChange({ ...data, taux: v });
  const setBouquetPct = (v: string) => onChange({ ...data, bouquetPct: v });
  const setIndex = (v: string) => onChange({ ...data, index: v });
  const setCharges = (v: string) => onChange({ ...data, charges: v });
  const setTaxe = (v: string) => onChange({ ...data, taxe: v });
  const setLoyer = (v: string) => onChange({ ...data, loyer: v });
  const setHausseImmo = (v: string) => onChange({ ...data, hausseImmo: v });
  const setFraisVentePct = (v: string) => onChange({ ...data, fraisVentePct: v });
  const setDureeTerme = (v: string) => onChange({ ...data, dureeTerme: v });

  // Helpers anti-NaN
  const safe = (n: number, def = 0) => (Number.isFinite(n) ? n : def);
  const nz = (n: number, min = 0) => (Number.isFinite(n) ? Math.max(min, n) : min);

  // Numérisation sûre
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

  // EV + horizon (plancher 1 an)
  const rawEV = safe(getEsperanceVie(vAge, sexe), 0);
  const yearsEV = nz(rawEV, 1);
  const horizonYears = mode === "Vente à terme" ? vDureeTerme : yearsEV;

  // Décote DUH (seulement en occupé)
  const valeurDUH =
    mode === "Viager occupé"
      ? nz(presentValueAnnuity(vLoyer, yearsEV, vTaux), 0)
      : 0;

  const baseValeur =
    mode === "Viager occupé" ? Math.max(0, vV - valeurDUH) : vV;

  // Bouquet / Rente / Terme
  const capBouquet = (vBouquetPct / 100) * baseValeur;
  const capRenteOuTerme = Math.max(0, baseValeur - capBouquet);

  const renteMensuelle =
    mode !== "Vente à terme"
      ? nz(solveMonthlyFromPV(capRenteOuTerme, yearsEV, vTaux, vIndex), 0)
      : 0;

  const mensualiteTerme =
    mode === "Vente à terme" ? capRenteOuTerme / (vDureeTerme * 12) : 0;

  const fraisNotaire = calculateNotaryFees(baseValeur);

  const depensesMensuelles =
    (mode === "Vente à terme" ? mensualiteTerme : renteMensuelle) +
    (vCharges + vTaxe) / 12;

  const totalRentesOuTermes =
    (mode === "Vente à terme" ? mensualiteTerme : renteMensuelle) *
    horizonYears *
    12;

  const coutChargesTaxes = (vCharges + vTaxe) * horizonYears;
  const coutTotalInvestisseur =
    capBouquet + fraisNotaire + totalRentesOuTermes + coutChargesTaxes;

  // Revente
  const prixFutur = vV * Math.pow(1 + vHausse, horizonYears);
  const produitNetVente = prixFutur * (1 - vFraisVente);

  const rendementAnnualise =
    coutTotalInvestisseur > 0
      ? (Math.pow(produitNetVente / coutTotalInvestisseur, 1 / horizonYears) - 1) * 100
      : 0;

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
        <meta
          name="description"
          content="Calculez la décote DUH, bouquet, rente indexée, horizon (espérance de vie), revente à terme et rendement annualisé."
        />
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/viager" />
      </Helmet>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Viager">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-3 no-print">
            <div className="text-sm text-gray-600">Configuration</div>
            <Tabs
              tabs={[...modes]}
              active={mode}
              onChange={(t) => setMode(t as typeof modes[number])}
            />
          </div>

          <div className="space-y-3">
            <Field label="Valeur vénale (marché)" suffix="€" value={valeur} onChange={setValeur} help="La valeur du bien s'il était vendu libre sur le marché." />
            <Field label="Âge du crédirentier" suffix="ans" value={age} onChange={setAge} help="Âge de la personne qui vend en viager (le plus âgé si couple)." />
            <SelectField label="Sexe" value={sexe} onChange={setSexe} options={["Femme", "Homme"]} help="Utilisé pour l'estimation de l'espérance de vie (table INSEE)." />
            <Field label="Espérance de vie estimée" suffix="ans" value={yearsEV} onChange={() => {}} readOnly={true} decimals={1} help="Basé sur la table de mortalité. Sert d'horizon pour les calculs." />

            <div className="h-0.5 bg-gray-100 my-4"></div>

            {mode === "Viager occupé" && (
              <Field
                label="Loyer mensuel estimé (pour DUH)"
                suffix="€/mois"
                value={loyer}
                onChange={setLoyer}
                help="Loyer de marché (HC) du bien. Utilisé pour calculer la décote (Droit d'Usage et d'Habitation)."
              />
            )}

            {mode !== "Vente à terme" ? (
              <>
                <Field label="Taux d'actualisation" suffix="%/an" value={taux} onChange={setTaux} decimals={2} help="Taux utilisé pour actualiser les flux futurs (loyers du DUH, rentes)." />
                <Field label="Bouquet (sur base)" suffix="%" value={bouquetPct} onChange={setBouquetPct} help="Pourcentage de la valeur (libre ou occupée) payé comptant." />
                <Field label="Taux de révision rente" suffix="%/an" value={index} onChange={setIndex} decimals={2} help="Indexation annuelle de la rente (ex: inflation)." />
              </>
            ) : (
              <>
                <Field label="Taux d'actualisation" suffix="%/an" value={taux} onChange={setTaux} decimals={2} help="Taux utilisé pour actualiser les flux futurs (si applicable)." />
                <Field label="Bouquet (sur base)" suffix="%" value={bouquetPct} onChange={setBouquetPct} help="Pourcentage de la valeur payé comptant." />
                <Field label="Durée de paiement (vente à terme)" suffix="ans" value={dureeTerme} onChange={setDureeTerme} help="Nombre d'années fixes pour le paiement des mensualités." />
              </>
            )}

            <div className="h-0.5 bg-gray-100 my-4"></div>

            <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} help="Charges annuelles payées par l'acheteur (souvent le cas en viager)." />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} help="Taxe foncière payée par l'acheteur." />

            <div className="h-0.5 bg-gray-100 my-4"></div>

            <Field label="Hausse des prix immo" suffix="%/an" value={hausseImmo} onChange={setHausseImmo} help="Hypothèse de revalorisation annuelle moyenne du bien." />
            <Field label="Frais de vente à terme" suffix="%" value={fraisVentePct} onChange={setFraisVentePct} help="Frais (agence, etc.) lors de la revente du bien à l'échéance." />
          </div>
        </Section>

        <Section title="Résultats – Viager">
          <div className="grid grid-cols-3 gap-3 text-sm">
            {mode === "Viager occupé" && (
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-gray-500">Décote (DUH)</div>
                <div className="font-semibold">{fmt(decotePct, 1)} %</div>
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Montant du Bouquet</div>
              <div className="font-semibold">{fmt(capBouquet)} €</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">
                {mode === "Vente à terme" ? "Mensualité (terme)" : "Rente mensuelle"}
              </div>
              <div className="font-semibold">
                {fmt(mode === "Vente à terme" ? mensualiteTerme : renteMensuelle)} €/mois
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
            <div className="text-gray-700 font-semibold mb-1">
              Projection à l'échéance ({fmt(horizonYears, 1)} ans)
            </div>
            <div className="flex justify-between">
              <span>Prix futur estimé :</span>
              <span className="font-medium">{fmt(prixFutur)} €</span>
            </div>
            <div className="flex justify-between">
              <span>Produit net de vente :</span>
              <span className="font-medium">{fmt(produitNetVente)} €</span>
            </div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
              <span>Total déboursé (bouquet + frais + rentes/terme + charges/taxes) :</span>
              <span className="font-medium">{fmt(coutTotalInvestisseur)} €</span>
            </div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
              <span className="font-bold">Rendement annualisé estimé :</span>
              <span className="font-bold">{fmt(rendementAnnualise, 2)} %</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal
              data={donutCoutTotal}
              colors={COLORS}
              title={mode === "Viager occupé" ? "Répartition de la Valeur Vénale" : "Structure de l'opération"}
              totalTitle="Total Vénale + Frais"
            />
            <DonutWithTotal
              data={donutCoutMensuels}
              colors={COLORS.slice(1)}
              title="Dépenses récurrentes (mensuelles)"
              totalTitle="Total mensuel"
            />
          </div>

          {mode !== "Vente à terme" && (
            <div className="text-center text-xs text-gray-500 mt-4">
              Coût total estimé de la rente (non actualisé) sur {fmt(yearsEV, 1)} ans:{" "}
              {fmt(renteMensuelle * yearsEV * 12)} €
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

/*********************
 * COMPOSANT SCPI (MODIFIÉ)
 *********************/
// MODIFIÉ : Utilise `data` et `onChange` props
function SCPI({
  data,
  onChange,
}: {
  data: AppState["scpi"];
  onChange: (d: AppState["scpi"]) => void;
}) {
  const scpiModes = ["Pleine propriété", "Nue-propriété"] as const;
  const {
    montant,
    td,
    fraisSous,
    fraisAnn,
    delaiJouissanceMois,
    mode,
    tmiIr,
    ps,
    dureeNP,
    decoteNP,
    revaloParts,
    apport,
    taux,
    assurance,
    duree,
  } = data;

  // Setters
  const setMontant = (v: string) => onChange({ ...data, montant: v });
  const setTd = (v: string) => onChange({ ...data, td: v });
  const setFraisSous = (v: string) => onChange({ ...data, fraisSous: v });
  const setFraisAnn = (v: string) => onChange({ ...data, fraisAnn: v });
  const setDelaiJouissanceMois = (v: string) => onChange({ ...data, delaiJouissanceMois: v });
  const setMode = (v: string) => onChange({ ...data, mode: v as typeof scpiModes[number] });
  const setTmiIr = (v: string) => onChange({ ...data, tmiIr: v });
  const setPs = (v: string) => onChange({ ...data, ps: v });
  const setDureeNP = (v: string) => onChange({ ...data, dureeNP: v });
  const setDecoteNP = (v: string) => onChange({ ...data, decoteNP: v });
  const setRevaloParts = (v: string) => onChange({ ...data, revaloParts: v });
  const setApport = (v: string) => onChange({ ...data, apport: v });
  const setTaux = (v: string) => onChange({ ...data, taux: v });
  const setAssurance = (v: string) => onChange({ ...data, assurance: v });
  const setDuree = (v: string) => onChange({ ...data, duree: v });

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

  // Décomposition du montant déboursé
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
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/scpi" />
      </Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – SCPI">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mb-3 no-print">
            <div className="text-sm text-gray-600">Mode d'investissement</div>
            <Tabs tabs={[...scpiModes]} active={mode} onChange={(t) => setMode(t as typeof scpiModes[number])} />
          </div>
          <div className="space-y-3">
            <Field label="Montant déboursé (brut)" suffix="€" value={montant} onChange={setMontant} help="Montant total payé, frais de souscription inclus." />
            <Field label="Frais de souscription" suffix="%" value={fraisSous} onChange={setFraisSous} decimals={2} help="Frais payés à l'achat, inclus dans le montant déboursé." />

            {mode === "Pleine propriété" ? (
              <>
                <Field label="Taux de distribution (TD)" suffix="%/an" value={td} onChange={setTd} decimals={2} help="Rendement annuel brut, basé sur le capital net investi." />
                <Field label="Frais récurrents additionnels" suffix="%/an" value={fraisAnn} onChange={setFraisAnn} decimals={2} help="Frais de gestion annuels (si non inclus dans le TD)." />
                <Field label="Délai de jouissance" suffix="mois" value={delaiJouissanceMois} onChange={setDelaiJouissanceMois} help="Nombre de mois avant de percevoir les premiers revenus." />
                <div className="h-0.5 bg-gray-100 my-2"></div>
                <Field label="TMI (IR)" suffix="%" value={tmiIr} onChange={setTmiIr} help="Votre Taux Marginal d'Imposition (ex: 30%)." />
                <Field label="Prélèvements sociaux" suffix="%" value={ps} onChange={setPs} help="Prélèvements sociaux sur les revenus fonciers (ex: 17,2%)." />
              </>
            ) : (
              <>
                <Field label="Durée du démembrement" suffix="ans" value={dureeNP} onChange={setDureeNP} help="Durée pendant laquelle vous ne détenez que la nue-propriété (pas de revenus)." />
                <Field label="Décote nue-propriété" suffix="%" value={decoteNP} onChange={setDecoteNP} help="Réduction sur le prix de la part en pleine propriété (ex: 30%)." />
                <Field label="Revalo prix de part" suffix="%/an" value={revaloParts} onChange={setRevaloParts} help="Hypothèse de revalorisation annuelle du prix de la part." />
              </>
            )}

            <div className="h-0.5 bg-gray-100 my-2"></div>
            <Field label="Apport" suffix="€" value={apport} onChange={setApport} help="Apport personnel pour cet investissement." />
            <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} help="Taux d'intérêt nominal annuel." />
            <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} help="Taux d'assurance, calculé sur le capital emprunté." />
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
 * COMPOSANT LOCAL COMMERCIAL (MODIFIÉ)
 *********************/
// MODIFIÉ : Utilise `data` et `onChange` props
function LocalCommercial({
  data,
  onChange,
}: {
  data: AppState["localCommercial"];
  onChange: (d: AppState["localCommercial"]) => void;
}) {
  const { prix, apport, taux, assurance, duree, loyer, charges, taxe } = data;

  // Setters
  const setPrix = (v: string) => onChange({ ...data, prix: v });
  const setApport = (v: string) => onChange({ ...data, apport: v });
  const setTaux = (v: string) => onChange({ ...data, taux: v });
  const setAssurance = (v: string) => onChange({ ...data, assurance: v });
  const setDuree = (v: string) => onChange({ ...data, duree: v });
  const setLoyer = (v: string) => onChange({ ...data, loyer: v });
  const setCharges = (v: string) => onChange({ ...data, charges: v });
  const setTaxe = (v: string) => onChange({ ...data, taxe: v });

  // Calculs
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
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/local-commercial" />
      </Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Local commercial">
          <div className="space-y-3">
            <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} help="Prix d'achat hors frais de notaire." />
            <Field label="Apport" suffix="€" value={apport} onChange={setApport} help="Montant de votre apport personnel." />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} help="Taux d'intérêt nominal annuel." />
            <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} help="Taux d'assurance, calculé sur le capital emprunté." />
            <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <Field label="Loyer mensuel (HC)" suffix="€" value={loyer} onChange={setLoyer} help="Loyer mensuel hors charges et hors taxes (HT)." />
            <Field label="Charges annuelles (PNO, syndic, vacance…)" suffix="€/an" value={charges} onChange={setCharges} help="Charges annuelles non récupérables sur le locataire." />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} help="Taxe foncière (souvent refacturée au locataire en bail commercial, mais à prévoir)." />
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
 * COMPOSANT CREDIT IMMOBILIER (MODIFIÉ)
 ****************************************/
// MODIFIÉ : Refonte majeure avec état global, assurance sur CRD, graphique, et suppression du comparateur.
function CreditImmo({
  data,
  onChange,
}: {
  data: AppState["creditImmo"];
  onChange: (d: AppState["creditImmo"]) => void;
}) {
  const { capital, taux, assurance, duree, assuranceSurCRD } = data;

  // Setters
  const setCapital = (v: string) => onChange({ ...data, capital: v });
  const setTaux = (v: string) => onChange({ ...data, taux: v });
  const setAssurance = (v: string) => onChange({ ...data, assurance: v });
  const setDuree = (v: string) => onChange({ ...data, duree: v });
  const setAssuranceSurCRD = (c: boolean) => onChange({ ...data, assuranceSurCRD: c });

  // États locaux pour l'UI (non sauvegardés)
  const [showTable, setShowTable] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Conversion
  const vCap = toNum(capital);
  const vTaux = toNum(taux);
  const vAss = toNum(assurance);
  const vDur = toNum(duree);

  // Calcul de la mensualité HORS assurance (toujours fixe)
  const mensuHorsAss = annuityPayment(vCap, vTaux, vDur);
  // Assurance fixe (pour le mode "Capital Initial")
  const assMensFixe = (vCap * (vAss / 100)) / 12;

  // --- Tableau d'amortissement (MODIFIÉ) ---
  type Row = {
    mois: number;
    echeance: number;
    interets: number;
    assurance: number;
    principal: number;
    crd: number;
  };

  const schedule = useMemo((): Row[] => {
    const rows: Row[] = [];
    let crd = vCap;
    const r = vTaux / 100 / 12; // Taux mensuel
    const mensu = mensuHorsAss; // Mensualité (capital + intérêts)
    const totalMonths = Math.round(vDur * 12);
    const vAssRate = vAss / 100; // Taux assurance annuel

    if (totalMonths === 0 || vCap === 0) return [];

    for (let m = 1; m <= totalMonths; m++) {
      const interets = r > 0 ? crd * r : 0;
      let principal = mensu - interets;
      if (principal < 0) principal = 0;

      // Assurance (MODIFIÉ)
      const assurance = assuranceSurCRD
        ? (crd * vAssRate) / 12 // Calcul sur CRD
        : assMensFixe; // Calcul sur capital initial

      // Ajustement dernier mois
      if (m === totalMonths) {
        principal = crd;
      }
      crd = Math.max(0, crd - principal);
      
      rows.push({
        mois: m,
        echeance: mensu + assurance,
        interets,
        assurance: assurance,
        principal,
        crd,
      });
      
      if (crd === 0) break; // Sortir si le prêt est remboursé (ex: taux 0)
    }
    return rows;
  }, [vCap, vTaux, vAss, vDur, mensuHorsAss, assMensFixe, assuranceSurCRD]);

  // --- Totaux et moyennes (MODIFIÉ) ---
  // Calculés à partir du tableau pour refléter le mode d'assurance
  const totalInterets = useMemo(() => schedule.reduce((s, r) => s + r.interets, 0), [schedule]);
  const totalAssurance = useMemo(() => schedule.reduce((s, r) => s + r.assurance, 0), [schedule]);
  const coutTotal = totalInterets + totalAssurance;
  const n = schedule.length || 1;
  const assMensMoyenne = totalAssurance / n;
  const mensuTotMoyenne = mensuHorsAss + assMensMoyenne;

  const donut = [
    { name: "Intérêts", value: totalInterets },
    { name: "Assurance", value: totalAssurance },
    { name: "Capital", value: vCap },
  ];

  // --- Données du graphique (NOUVEAU) ---
  const chartData = useMemo(() => {
    let cumulInterets = 0;
    let cumulAssurance = 0;
    const data = [{ mois: 0, crd: vCap, cumulInterets: 0, cumulAssurance: 0 }];

    schedule.forEach((row) => {
      cumulInterets += row.interets;
      cumulAssurance += row.assurance;
      // On prend un point tous les ans (mois % 12 === 0) et le dernier
      if (row.mois % 12 === 0 || row.mois === schedule.length) {
        data.push({
          mois: row.mois,
          crd: row.crd,
          cumulInterets: cumulInterets,
          cumulAssurance: cumulAssurance,
        });
      }
    });
    return data;
  }, [schedule, vCap]);

  // --- Export CSV (MODIFIÉ pour gérer l'échéance variable) ---
  const exportCSV = () => {
    const header = ["Mois","Échéance totale","Capital remboursé","Intérêts","Assurance","Capital restant dû"];
    const lines = [header.join(";")];
    schedule.forEach(row => {
      lines.push([
        row.mois,
        row.echeance.toFixed(2).replace(".",","),
        row.principal.toFixed(2).replace(".",","),
        row.interets.toFixed(2).replace(".",","),
        row.assurance.toFixed(2).replace(".",","),
        row.crd.toFixed(2).replace(".",",")
      ].join(";"));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `amortissement_${vCap}€_${vTaux}%_${vDur}ans.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const YAxisFormatter = (tick: number) => fmt(tick, 0);
  const XAxisFormatter = (tick: number) => `Mois ${tick}`;
  const TooltipFormatter = (value: number, name: string) => [`${fmt(value)} €`, name];

  return (
    <>
      <Helmet>
        <title>Calculateur de prêt immobilier – Mensualité, intérêts & assurance</title>
        <meta
          name="description"
          content="Simulez un crédit immobilier : mensualité, intérêts totaux, assurance (fixe ou sur CRD) et tableau d'amortissement."
        />
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/credit-immobilier" />
      </Helmet>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Crédit">
          <div className="space-y-3">
            <Field label="Capital emprunté" suffix="€" value={capital} onChange={setCapital} help="Montant total du prêt demandé à la banque." />
            <Field label="Taux nominal" suffix="%/an" value={taux} onChange={setTaux} decimals={2} help="Taux d'intérêt annuel fixe, hors assurance." />
            <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} help="Taux annuel de l'assurance." />
            <Field label="Durée" suffix="ans" value={duree} onChange={setDuree} />
            <div className="h-0.5 bg-gray-100 my-4"></div>
            <CheckboxField
              label="Assurance sur CRD"
              checked={assuranceSurCRD}
              onChange={setAssuranceSurCRD}
              help="Cochez pour calculer l'assurance chaque mois sur le Capital Restant Dû (dégressif). Sinon, elle est fixe (calculée sur le capital initial)."
            />
          </div>
        </Section>

        <Section title="Résultats – Crédit">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Mensualité (hors assur.)</div>
              <div className="font-semibold">{fmt(mensuHorsAss)} €/mois</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Assurance (moyenne)</div>
              <div className="font-semibold">{fmt(assMensMoyenne)} €/mois</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Mensualité (moyenne)</div>
              <div className="font-semibold">{fmt(mensuTotMoyenne)} €/mois</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-gray-500">Coût total (int.+ass.)</div>
              <div className="font-semibold">{fmt(coutTotal)} €</div>
            </div>
          </div>

          <div className="grid md:grid-cols-1 gap-6 mt-4">
            <DonutWithTotal data={donut} colors={["#E67E22", "#F2C94C", "#3559E0"]} title="Décomposition du coût total" totalTitle="Total remboursé" />
          </div>

          {/* GRAPHIQUE + TABLEAU REPLIABLES */}
          <div className="mt-6">
            <div className="flex flex-col md:flex-row gap-3 no-print">
              <button
                onClick={() => setShowTable(s => !s)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow"
              >
                {showTable ? "Masquer le tableau" : "Afficher le tableau"}
              </button>
              <button
                onClick={() => setShowChart(s => !s)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow"
              >
                {showChart ? "Masquer le graphique" : "Afficher le graphique"}
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition shadow"
              >
                Exporter en CSV
              </button>
            </div>

            {/* GRAPHIQUE (NOUVEAU) */}
            {showChart && (
              <div className="mt-4 h-80 w-full no-print">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" tickFormatter={XAxisFormatter} />
                    <YAxis yAxisId="left" tickFormatter={YAxisFormatter} />
                    <Tooltip formatter={TooltipFormatter} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="crd" name="Capital Restant Dû" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="cumulInterets" name="Intérêts cumulés" stroke={COLORS[2]} strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="cumulAssurance" name="Assurance cumulée" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* TABLEAU */}
            {showTable && (
              <div className="mt-4 overflow-auto max-h-[60vh] border rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left">Mois</th>
                      <th className="px-3 py-2 text-right">Échéance totale</th>
                      <th className="px-3 py-2 text-right">Capital remboursé</th>
                      <th className="px-3 py-2 text-right">Intérêts</th>
                      <th className="px-3 py-2 text-right">Assurance</th>
                      <th className="px-3 py-2 text-right">CRD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.mois} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-1">{row.mois}</td>
                        <td className="px-3 py-1 text-right">{fmt(row.echeance)}</td>
                        <td className="px-3 py-1 text-right">{fmt(row.principal)}</td>
                        <td className="px-3 py-1 text-right">{fmt(row.interets)}</td>
                        <td className="px-3 py-1 text-right">{fmt(row.assurance)}</td>
                        <td className="px-3 py-1 text-right">{fmt(row.crd)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 sticky bottom-0">
                    <tr>
                      <td className="px-3 py-2 font-semibold">Total</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(schedule.reduce((s, r) => s + r.echeance, 0))}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(schedule.reduce((s, r) => s + r.principal, 0))}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(totalInterets)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(totalAssurance)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}

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
        <link rel="canonical" href="https://wizzwid.github.io/viager-vs-location/#/commandements" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <div className="max-w-6xl mx-auto p-0">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
          Les 10 commandements de l’investisseur avisé
        </h2>
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

// NOUVEAU : Fonctions de (dé)sérialisation pour l'URL
// Utilise btoa/atob pour une sérialisation compatible URL
function serializeState(state: AppState): string {
  try {
    const stringState = JSON.stringify(state);
    return btoa(stringState);
  } catch (e) {
    console.error("Erreur de sérialisation:", e);
    return "";
  }
}

function deserializeState(data: string): AppState | null {
  try {
    const jsonString = atob(data);
    const parsed = JSON.parse(jsonString);
    // Ici, on pourrait ajouter une validation de schéma plus robuste
    if (typeof parsed === "object" && parsed !== null && parsed.locationNue) {
      // Fusionner avec l'état par défaut pour gérer les migrations
      return {
        locationNue: { ...DEFAULT_STATE.locationNue, ...parsed.locationNue },
        viager: { ...DEFAULT_STATE.viager, ...parsed.viager },
        scpi: { ...DEFAULT_STATE.scpi, ...parsed.scpi },
        localCommercial: { ...DEFAULT_STATE.localCommercial, ...parsed.localCommercial },
        creditImmo: { ...DEFAULT_STATE.creditImmo, ...parsed.creditImmo },
      };
    }
    return null;
  } catch (e) {
    console.error("Erreur de désérialisation:", e);
    return null;
  }
}

// NOUVEAU : Fonction pour parser le hash
function parseHash(hash: string): [string | null, string | null] {
  if (!hash.startsWith("#")) {
    return [null, null];
  }
  const [tabPart, dataPart] = hash.substring(1).split("?data=");
  const tab = tabPart || null;
  const data = dataPart || null;
  return [tab, data];
}

const TABS = ["Crédit immobilier", "Location nue", "Viager", "SCPI", "Local commercial", "10 Commandements"];
const DEFAULT_TAB = "Crédit immobilier";
const LOCAL_STORAGE_STATE_KEY = "appState-v2";
const LOCAL_STORAGE_TAB_KEY = "appTab-v2";

/*********************
 * APP PRINCIPALE (MODIFIÉE)
 *********************/
export default function App() {
  const [tab, setTab] = useState(DEFAULT_TAB);
  const [globalState, setGlobalState] = useState<AppState>(DEFAULT_STATE);
  const [copied, setCopied] = useState(false); // Pour le feedback du bouton "Copier"
  const debounceTimer = useRef<number | null>(null);

  // --- NOUVEAU : Initialisation de l'état (URL > localStorage > Défaut) ---
  useEffect(() => {
    // 1. Essayer de lire depuis l'URL
    const [hashTab, hashData] = parseHash(window.location.hash);
    
    if (hashData) {
      const stateFromUrl = deserializeState(hashData);
      if (stateFromUrl) {
        setGlobalState(stateFromUrl);
        if (hashTab && TABS.includes(hashTab)) {
          setTab(hashTab);
        }
        return; // État chargé depuis l'URL
      }
    }

    // 2. Sinon, essayer de lire depuis localStorage
    try {
      const stateFromLs = localStorage.getItem(LOCAL_STORAGE_STATE_KEY);
      const tabFromLs = localStorage.getItem(LOCAL_STORAGE_TAB_KEY);
      if (stateFromLs) {
        const parsedState = JSON.parse(stateFromLs);
        // Fusionner avec défaut pour éviter les erreurs si la structure a changé
        setGlobalState({
          locationNue: { ...DEFAULT_STATE.locationNue, ...parsedState.locationNue },
          viager: { ...DEFAULT_STATE.viager, ...parsedState.viager },
          scpi: { ...DEFAULT_STATE.scpi, ...parsedState.scpi },
          localCommercial: { ...DEFAULT_STATE.localCommercial, ...parsedState.localCommercial },
          creditImmo: { ...DEFAULT_STATE.creditImmo, ...parsedState.creditImmo },
        });
      }
      if (tabFromLs && TABS.includes(tabFromLs)) {
        setTab(tabFromLs);
      }
    } catch (e) {
      console.error("Erreur de lecture localStorage:", e);
      // Utiliser l'état par défaut
    }
  }, []); // Exécuté une seule fois au montage

  // --- NOUVEAU : Sauvegarde (localStorage + URL) avec debounce ---
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(() => {
      try {
        // 1. Sauvegarde localStorage
        const jsonState = JSON.stringify(globalState);
        localStorage.setItem(LOCAL_STORAGE_STATE_KEY, jsonState);
        localStorage.setItem(LOCAL_STORAGE_TAB_KEY, tab);

        // 2. Mise à jour de l'URL (sans recharger la page)
        const serializedData = serializeState(globalState);
        const newHash = `#${tab}?data=${serializedData}`;
        
        // Utilise replaceState pour ne pas polluer l'historique du navigateur
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, "", newHash);
        }
      } catch (e) {
        console.error("Erreur de sauvegarde:", e);
      }
    }, 400); // Délais de 400ms

    // Nettoyage au démontage
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [globalState, tab]); // Se déclenche à chaque changement d'état ou d'onglet

  // --- NOUVEAU : Fonctions de gestion d'état ---
  const handleStateChange = (
    tabKey: keyof AppState,
    newTabData: AppState[keyof AppState]
  ) => {
    setGlobalState((prev) => ({
      ...prev,
      [tabKey]: newTabData,
    }));
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
  };

  const handlePrint = () => window.print();

  // --- NOUVEAU : Bouton "Copier le lien" ---
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // --- MODIFIÉ : Rendu des onglets ---
  const renderTabContent = () => {
    switch (tab) {
      case "Location nue":
        return <LocationNue data={globalState.locationNue} onChange={(d) => handleStateChange("locationNue", d)} />;
      case "Viager":
        return <Viager data={globalState.viager} onChange={(d) => handleStateChange("viager", d)} />;
      case "SCPI":
        return <SCPI data={globalState.scpi} onChange={(d) => handleStateChange("scpi", d)} />;
      case "Local commercial":
        return <LocalCommercial data={globalState.localCommercial} onChange={(d) => handleStateChange("localCommercial", d)} />;
      case "Crédit immobilier":
        return <CreditImmo data={globalState.creditImmo} onChange={(d) => handleStateChange("creditImmo", d)} />;
      case "10 Commandements":
        return <CommandementsInvestisseur />;
      default:
        return null;
    }
  };

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
          {/* MODIFIÉ : Header avec bouton "Copier le lien" */}
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
                Imprimer (PDF)
              </button>
              
              {/* NOUVEAU BOUTON */}
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition shadow flex items-center justify-center ${
                  copied 
                    ? "bg-green-600 text-white" 
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Lien copié !
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" /></svg>
                    Copier le lien
                  </>
                )}
              </button>

              <Tabs tabs={TABS} active={tab} onChange={handleTabChange} />
            </div>
          </header>

          <div className="hidden print:block text-center mb-6">
            <h2 className="text-2xl font-bold">Rapport de Simulation ({tab})</h2>
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
              href="https://wizzwid.github.io/viager-vs-location/sitemap.xml"
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
