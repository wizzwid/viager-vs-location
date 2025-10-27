
import React, { useEffect, useMemo, useState } from "react";
import { Helmet, HelmetProvider } from "https://esm.sh/react-helmet-async";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend as RLegend
} from "recharts";

/* ===============================
   Impression
==================================*/
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

/* ===============================
   Utils
==================================*/
const COLORS = ["#3559E0", "#F2C94C", "#E67E22", "#27AE60", "#9B59B6", "#2ECC71"];

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white shadow p-5">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function HelpIcon({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-[10px] cursor-help select-none ml-1"
      title={text}
      aria-label={`Aide: ${text}`}
    >?</span>
  );
}

function Field({
  label, suffix, value, onChange, help, readOnly = false, decimals = 0, id,
}: {
  label: string; suffix?: string; value: string | number;
  onChange: (v: string) => void; help?: string; readOnly?: boolean; decimals?: number; id?: string;
}) {
  const displayValue = readOnly ? fmt(Number(value), decimals) : value;
  return (
    <label className="flex items-start justify-between gap-3 w-full" htmlFor={id}>
      <div className="w-1/2">
        <div className="text-sm text-gray-700 font-medium flex items-center">{label}<HelpIcon text={help} /></div>
      </div>
      <span className="flex items-center gap-2 w-1/2">
        <input
          id={id}
          className={`w-full rounded-xl border p-2 focus:outline-none ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "focus:ring"}`}
          value={displayValue as any} onChange={(e) => onChange(e.target.value)}
          inputMode="decimal" type="text" readOnly={readOnly}
        />
        {suffix ? <span className="text-gray-500 text-sm">{suffix}</span> : null}
      </span>
    </label>
  );
}

function SelectField({
  label, value, onChange, options, help, id,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; help?: string; id?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-3 w-full" htmlFor={id}>
      <div className="w-1/2">
        <div className="text-sm text-gray-700 font-medium flex items-center">{label}<HelpIcon text={help} /></div>
      </div>
      <span className="flex items-center gap-2 w-1/2">
        <select
          id={id}
          className="w-full rounded-xl border p-2 focus:outline-none focus:ring bg-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
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
          <button key={t} onClick={() => onChange(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              active === t ? "bg-white shadow" : "text-gray-600 hover:text-gray-900"
            }`}>
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
  data, colors, title, totalTitle,
}: {
  data: { name: string; value: number }[]; colors: string[]; title: string; totalTitle: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const displayData = data.filter((item) => item.value > 0);
  if (displayData.length === 0) displayData.push({ name: "Aucune donnée", value: 1 });

  return (
    <div className="flex flex-col items-center">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie dataKey="value" data={displayData} innerRadius={50} outerRadius={80} paddingAngle={2}>
              {displayData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <RTooltip formatter={(v: number, _n, props: any) => [`${fmt(v)} €`, props?.payload?.name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-sm font-medium mt-2">{title}</div>
      <div className="text-lg font-bold text-gray-800">{totalTitle}: {fmt(total)} €</div>
      <Legend data={data} colors={COLORS} />
    </div>
  );
}

/* ===============================
   Finance helpers
==================================*/
function annuityPayment(capital: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = Math.round(years * 12);
  if (n === 0 || capital === 0) return 0;
  if (r <= 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

function calculateNotaryFees(price: number) {
  if (price <= 0) return 0;
  return price * 0.075; // ancien
}

/* ===============================
   Local storage state
==================================*/
function useLocalStore<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

/* ===============================
   URL partageable
==================================*/
function updateShareURL(tab: string, params: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => usp.set(k, String(v)));
  const base = `${location.origin}${location.pathname}#/${encodeURIComponent(tab)}`;
  const url = `${base}?${usp.toString()}`;
  history.replaceState(null, "", url);
  return url;
}
function readURLParams(): { tab?: string; params: URLSearchParams } {
  const hash = location.hash || "";
  const [route, qs] = hash.split("?");
  const tab = route?.replace(/^#\//, "") || undefined;
  const params = new URLSearchParams(qs || "");
  return { tab, params };
}

/* ===============================
   Location nue
==================================*/
function LocationNue() {
  const [state, setState] = useLocalStore("tab:location", {
    prix: "292000", apport: "72000", taux: "2,5", assurance: "0,35", duree: "20",
    loyer: "740", charges: "1200", taxe: "1300", travauxInit: "0", tmiLoc: "30", psLoc: "17,2"
  });

  const vPrix = toNum(state.prix);
  const vApport = toNum(state.apport);
  const vTaux = toNum(state.taux);
  const vAssurance = toNum(state.assurance);
  const vDuree = toNum(state.duree);
  const vTrav = toNum(state.travauxInit);
  const vTMI = Math.max(0, toNum(state.tmiLoc)) / 100;
  const vPS = Math.max(0, toNum(state.psLoc)) / 100;

  const capital = Math.max(0, vPrix - vApport);
  const mensualite = annuityPayment(capital, vTaux, vDuree);
  const assuranceMens = (capital * (vAssurance / 100)) / 12;
  const totalRemboursementMensuel = mensualite + assuranceMens;

  const nbMois = vDuree * 12;
  const totalRembourseCapitalAndInterest = mensualite * nbMois;
  const coutTotalInterets = Math.max(0, totalRembourseCapitalAndInterest - capital);
  const coutTotalAssurance = assuranceMens * nbMois;

  const fraisNotaire = calculateNotaryFees(vPrix);

  const loyersAnn = toNum(state.loyer) * 12;
  const chargesAnn = toNum(state.charges) + toNum(state.taxe);
  const serviceDetteAnn = totalRemboursementMensuel * 12;

  const taxableBase = Math.max(0, loyersAnn - chargesAnn);
  const impotsAnn = taxableBase * (vTMI + vPS);
  const revenuAnnApresImpots = Math.max(0, loyersAnn - chargesAnn - impotsAnn);
  const cashflowAnnApresImpots = revenuAnnApresImpots - serviceDetteAnn;
  const cashflowMensApresImpots = cashflowAnnApresImpots / 12;

  const donutCout = [
    { name: "Apport", value: vApport },
    { name: "Capital prêt", value: capital },
    { name: "Frais de notaire", value: fraisNotaire },
    { name: "Travaux initiaux", value: vTrav },
  ];
  const donutCharge = [
    { name: "Mensualité Prêt (C+I)", value: mensualite },
    { name: "Assurance Emprunteur", value: assuranceMens },
    { name: "Taxe foncière (mens.)", value: toNum(state.taxe) / 12 },
    { name: "Charges (mens.)", value: toNum(state.charges) / 12 },
  ];

  return (
    <>
      <Helmet><title>Location nue – rendement & cashflow</title></Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Location nue">
          <div className="space-y-3">
            <Field label="Prix du bien" suffix="€" value={state.prix} onChange={(v)=>setState({...state,prix:v})} help="Prix d'acquisition hors frais." />
            <Field label="Apport" suffix="€" value={state.apport} onChange={(v)=>setState({...state,apport:v})} help="Somme payée comptant." />
            <Field label="Travaux (initiaux, cash)" suffix="€" value={state.travauxInit} onChange={(v)=>setState({...state,travauxInit:v})} help="Travaux non financés par le prêt." />
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="Taux du prêt" suffix="%/an" value={state.taux} onChange={(v)=>setState({...state,taux:v})} help="Taux nominal annuel." />
            <Field label="Assurance" suffix="%/an" value={state.assurance} onChange={(v)=>setState({...state,assurance:v})} help="Prime sur capital initial (approx.)." />
            <Field label="Durée du prêt" suffix="ans" value={state.duree} onChange={(v)=>setState({...state,duree:v})} help="Durée totale du crédit." />
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="Loyer mensuel" suffix="€" value={state.loyer} onChange={(v)=>setState({...state,loyer:v})} help="Hors charges locatives." />
            <Field label="Charges (annuelles)" suffix="€/an" value={state.charges} onChange={(v)=>setState({...state,charges:v})} help="PNO, syndic, entretien, vacance..." />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={state.taxe} onChange={(v)=>setState({...state,taxe:v})} />
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="TMI (IR)" suffix="%" value={state.tmiLoc} onChange={(v)=>setState({...state,tmiLoc:v})} help="Tranche marginale d'imposition." />
            <Field label="Prélèvements sociaux" suffix="%" value={state.psLoc} onChange={(v)=>setState({...state,psLoc:v})} />
          </div>
        </Section>

        <Section title="Résultats – Location nue">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Remboursement mensuel total</div><div className="font-semibold">{fmt(totalRemboursementMensuel)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Revenu annuel après impôts (hors dette)</div><div className="font-semibold">{fmt(revenuAnnApresImpots)} €</div></div>
            <div className={`bg-gray-50 p-3 rounded-xl ${cashflowMensApresImpots < 0 ? "text-red-600" : "text-green-600"}`}><div className="text-gray-500">Cashflow net après impôts</div><div className="font-semibold">{fmt(cashflowMensApresImpots)} €/mois</div></div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
            <div className="text-gray-700 font-semibold mb-1">Coût de l'emprunt sur {fmt(vDuree,0)} ans</div>
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

/* ===============================
   Viager
==================================*/
function getEsperanceVie(age: number, sexe: string) {
  const tableF: Record<number, number> = { 50: 36, 55: 31.5, 60: 27, 65: 22.5, 70: 18.8, 75: 15, 80: 11.5, 85: 8.5, 90: 6.2, 95: 4.5, 100: 3.5 };
  const tableM: Record<number, number> = { 50: 32, 55: 28, 60: 24, 65: 20, 70: 16.5, 75: 13, 80: 10, 85: 7.5, 90: 5.5, 95: 4, 100: 3 };
  const keys = Object.keys(tableF).map(Number).sort((a, b) => a - b);
  const tbl = sexe.toLowerCase().startsWith("h") ? tableM : tableF;
  if (age <= keys[0]) return tbl[keys[0]];
  if (age >= keys[keys.length - 1]) return tbl[keys[keys.length - 1]];
  for (let i = 1; i < keys.length; i++) { if (age <= keys[i]) { const a0 = keys[i - 1], a1 = keys[i]; const y0 = tbl[a0], y1 = tbl[a1]; return y0 + ((y1 - y0) * (age - a0)) / (a1 - a0); } }
  return 0;
}
function presentValueAnnuity(monthly: number, years: number, discountPct: number) {
  const r = discountPct / 100 / 12, n = Math.round(years * 12);
  if (n === 0 || monthly === 0) return 0;
  if (r === 0) return monthly * n;
  return monthly * ((1 - Math.pow(1 + r, -n)) / r) * (1 + r);
}
function pvIndexedAnnuity(monthly: number, years: number, discountPct: number, indexPct: number) {
  const r = discountPct / 100 / 12, g = indexPct / 100 / 12, n = Math.round(years * 12), q = (1 + g) / (1 + r);
  if (q === 1) return monthly * n;
  return (monthly * (1 - Math.pow(q, n))) / (1 - q);
}
function solveMonthlyFromPV(targetPV: number, years: number, discountPct: number, indexPct: number) {
  const ref = pvIndexedAnnuity(100, years, discountPct, indexPct);
  return ref ? (targetPV / ref) * 100 : 0;
}

function Viager() {
  const [state, setState] = useLocalStore("tab:viager", {
    mode: "Viager occupé", valeur: "292000", age: "71", sexe: "Femme", taux: "2",
    bouquetPct: "30", index: "1,1", charges: "1200", taxe: "1300", loyer: "740",
    hausseImmo: "1,5", fraisVentePct: "6", dureeTerme: "15"
  });
  const modes = ["Viager occupé", "Viager libre", "Vente à terme"] as const;
  const set = (k:string,v:string)=>setState({...state,[k]:v});

  const vV = toNum(state.valeur); const vAge = Math.max(1, toNum(state.age));
  const yearsEV = Math.max(1, getEsperanceVie(vAge, state.sexe));
  const vTaux = toNum(state.taux); const vBouquetPct = toNum(state.bouquetPct);
  const vIndex = toNum(state.index); const vCharges = toNum(state.charges); const vTaxe = toNum(state.taxe);
  const vLoyer = toNum(state.loyer); const vHausse = Math.max(0, toNum(state.hausseImmo))/100; const vFraisVente = Math.max(0, toNum(state.fraisVentePct))/100;
  const vDureeTerme = Math.max(1, toNum(state.dureeTerme)); const mode = state.mode as typeof modes[number];

  const horizonYears = mode === "Vente à terme" ? vDureeTerme : yearsEV;
  const valeurDUH = mode === "Viager occupé" ? presentValueAnnuity(vLoyer, yearsEV, vTaux) : 0;
  const baseValeur = mode === "Viager occupé" ? Math.max(0, vV - valeurDUH) : vV;
  const capBouquet = (vBouquetPct/100) * baseValeur;
  const capRenteOuTerme = Math.max(0, baseValeur - capBouquet);
  const renteMensuelle = mode !== "Vente à terme" ? solveMonthlyFromPV(capRenteOuTerme, yearsEV, vTaux, vIndex) : 0;
  const mensualiteTerme = mode === "Vente à terme" ? capRenteOuTerme / (vDureeTerme*12) : 0;
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
      <Helmet><title>Viager – bouquet, rente, DUH</title></Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Viager">
          <div className="flex items-center justify-between mb-3 no-print">
            <div className="text-sm text-gray-600">Configuration</div>
            <Tabs tabs={[...modes]} active={mode} onChange={(t)=>set("mode", t)} />
          </div>
          <div className="space-y-3">
            <Field label="Valeur vénale (marché)" suffix="€" value={state.valeur} onChange={(v)=>set("valeur",v)} help="Valeur estimée du bien libre." />
            <Field label="Âge du crédirentier" suffix="ans" value={state.age} onChange={(v)=>set("age",v)} />
            <SelectField label="Sexe" value={state.sexe} onChange={(v)=>set("sexe",v)} options={["Femme","Homme"]} />
            <Field label="Espérance de vie estimée" suffix="ans" value={Math.max(1, getEsperanceVie(Math.max(1,toNum(state.age)), state.sexe))} onChange={()=>{}} readOnly decimals={1} help="Table INSEE simplifiée." />
            <div className="h-0.5 bg-gray-100 my-2" />
            {mode === "Viager occupé" && (
              <Field label="Loyer mensuel estimé (pour DUH)" suffix="€/mois" value={state.loyer} onChange={(v)=>set("loyer",v)} help="Flux utilisé pour valoriser le DUH." />
            )}
            {mode !== "Vente à terme" ? (
              <>
                <Field label="Taux d'actualisation" suffix="%/an" value={state.taux} onChange={(v)=>set("taux",v)} help="Actualisation des flux futurs." />
                <Field label="Bouquet (sur base)" suffix="%" value={state.bouquetPct} onChange={(v)=>set("bouquetPct",v)} />
                <Field label="Taux de révision rente" suffix="%/an" value={state.index} onChange={(v)=>set("index",v)} help="Indice annuel de la rente." />
              </>
            ) : (
              <>
                <Field label="Taux d'actualisation" suffix="%/an" value={state.taux} onChange={(v)=>set("taux",v)} />
                <Field label="Bouquet (sur base)" suffix="%" value={state.bouquetPct} onChange={(v)=>set("bouquetPct",v)} />
                <Field label="Durée de paiement (vente à terme)" suffix="ans" value={state.dureeTerme} onChange={(v)=>set("dureeTerme",v)} />
              </>
            )}
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="Charges (annuelles)" suffix="€/an" value={state.charges} onChange={(v)=>set("charges",v)} />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={state.taxe} onChange={(v)=>set("taxe",v)} />
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="Hausse des prix immo" suffix="%/an" value={state.hausseImmo} onChange={(v)=>set("hausseImmo",v)} />
            <Field label="Frais de vente" suffix="%" value={state.fraisVentePct} onChange={(v)=>set("fraisVentePct",v)} />
          </div>
        </Section>

        <Section title="Résultats – Viager">
          <div className="grid grid-cols-3 gap-3 text-sm">
            {mode === "Viager occupé" && <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Décote (DUH)</div><div className="font-semibold">{fmt(decotePct,1)} %</div></div>}
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Montant du Bouquet</div><div className="font-semibold">{fmt(capBouquet)} €</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">{mode === "Vente à terme" ? "Mensualité (terme)" : "Rente mensuelle"}</div><div className="font-semibold">{fmt(mode === "Vente à terme" ? mensualiteTerme : renteMensuelle)} €/mois</div></div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
            <div className="text-gray-700 font-semibold mb-1">Projection à l'échéance ({fmt(horizonYears,1)} ans)</div>
            <div className="flex justify-between"><span>Prix futur estimé :</span><span className="font-medium">{fmt(prixFutur)} €</span></div>
            <div className="flex justify-between"><span>Produit net de vente :</span><span className="font-medium">{fmt(produitNetVente)} €</span></div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span>Total déboursé :</span><span className="font-medium">{fmt(coutTotalInvestisseur)} €</span></div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200"><span className="font-bold">Rendement annualisé estimé :</span><span className="font-bold">{fmt(rendementAnnualise,2)} %</span></div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donutCoutTotal} colors={COLORS} title={mode === "Viager occupé" ? "Répartition de la Valeur Vénale" : "Structure de l'opération"} totalTitle="Total Vénale + Frais" />
            <DonutWithTotal data={donutCoutMensuels} colors={COLORS.slice(1)} title="Dépenses récurrentes (mensuelles)" totalTitle="Total mensuel" />
          </div>
        </Section>
      </div>
    </>
  );
}

/* ===============================
   SCPI
==================================*/
function SCPI() {
  const [state, setState] = useLocalStore("tab:scpi", {
    montant:"50000", td:"5", fraisSous:"8", fraisAnn:"0", delaiJouissanceMois:"3",
    mode:"Pleine propriété", tmiIr:"30", ps:"17,2", dureeNP:"10", decoteNP:"30", revaloParts:"1",
    apport:"10000", taux:"3,1", assurance:"0,30", duree:"15"
  });
  const scpiModes = ["Pleine propriété", "Nue-propriété"] as const;
  const set = (k:string,v:string)=>setState({...state,[k]:v});

  const vMontant = toNum(state.montant);
  const vTD = toNum(state.td)/100;
  const vFraisSous = toNum(state.fraisSous)/100;
  const vFraisAnn = toNum(state.fraisAnn)/100;
  const vDelai = Math.max(0, Math.min(12, Math.round(toNum(state.delaiJouissanceMois))));
  const vTMI = Math.max(0, toNum(state.tmiIr))/100;
  const vPS = Math.max(0, toNum(state.ps))/100;
  const vDurNP = Math.max(0, Math.round(toNum(state.dureeNP)));
  const vDecoteNP = Math.max(0, toNum(state.decoteNP))/100;
  const vRevalo = Math.max(0, toNum(state.revaloParts))/100;

  const vApport = toNum(state.apport);
  const vTaux = toNum(state.taux);
  const vAssur = toNum(state.assurance);
  const vDuree = toNum(state.duree);

  const capitalNetInvesti = vMontant / (1 + vFraisSous);
  const fraisSouscription = vMontant - capitalNetInvesti;
  const donutMontant = [
    { name: "Capital net investi", value: capitalNetInvesti },
    { name: "Frais de souscription", value: fraisSouscription },
  ];

  const distBrutePleine = capitalNetInvesti * vTD;
  const distBruteAn1 = distBrutePleine * ((12 - vDelai) / 12);
  const fraisRecurAnn = capitalNetInvesti * vFraisAnn;
  const distNetteAn1 = Math.max(0, distBruteAn1 - fraisRecurAnn);
  const distNettePleine = Math.max(0, distBrutePleine - fraisRecurAnn);
  const distApresImpotsAn1 = Math.max(0, distNetteAn1 - distNetteAn1 * (vTMI + vPS));
  const distApresImpotsPleine = Math.max(0, distNettePleine - distNettePleine * (vTMI + vPS));

  const dette = Math.max(0, vMontant - vApport);
  const mensu = annuityPayment(dette, vTaux, vDuree);
  const assurMens = (dette * (vAssur / 100)) / 12;
  const serviceDetteMens = mensu + assurMens;

  const isNP = state.mode === "Nue-propriété";
  let valeurPPATerme = 0, rendementNP = 0;
  if (isNP) {
    const pleinePropAujourd = capitalNetInvesti / (1 - vDecoteNP);
    valeurPPATerme = pleinePropAujourd * Math.pow(1 + vRevalo, vDurNP);
    rendementNP = vMontant > 0 && vDurNP > 0 ? (Math.pow(valeurPPATerme / vMontant, 1 / vDurNP) - 1) * 100 : 0;
  }

  const cashflowMensAn1PP = (distApresImpotsAn1 - serviceDetteMens * 12) / 12;

  return (
    <>
      <Helmet><title>SCPI – pleine & nue-propriété</title></Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – SCPI">
          <div className="flex items-center justify-between mb-3 no-print">
            <div className="text-sm text-gray-600">Mode d'investissement</div>
            <Tabs tabs={[...scpiModes]} active={state.mode} onChange={(t)=>set("mode", t)} />
          </div>
          <div className="space-y-3">
            <Field label="Montant déboursé (brut)" suffix="€" value={state.montant} onChange={(v)=>set("montant",v)} help="Somme versée, frais inclus." />
            <Field label="Frais de souscription" suffix="%" value={state.fraisSous} onChange={(v)=>set("fraisSous",v)} />
            {state.mode === "Pleine propriété" ? (
              <>
                <Field label="Taux de distribution (TD)" suffix="%/an" value={state.td} onChange={(v)=>set("td",v)} help="Distribution annuelle de la SCPI." />
                <Field label="Frais récurrents additionnels" suffix="%/an" value={state.fraisAnn} onChange={(v)=>set("fraisAnn",v)} />
                <Field label="Délai de jouissance" suffix="mois" value={state.delaiJouissanceMois} onChange={(v)=>set("delaiJouissanceMois",v)} help="Mois sans distribution après souscription." />
                <div className="h-0.5 bg-gray-100 my-2" />
                <Field label="TMI (IR)" suffix="%" value={state.tmiIr} onChange={(v)=>set("tmiIr",v)} />
                <Field label="Prélèvements sociaux" suffix="%" value={state.ps} onChange={(v)=>set("ps",v)} />
              </>
            ) : (
              <>
                <Field label="Durée du démembrement" suffix="ans" value={state.dureeNP} onChange={(v)=>set("dureeNP",v)} />
                <Field label="Décote nue-propriété" suffix="%" value={state.decoteNP} onChange={(v)=>set("decoteNP",v)} />
                <Field label="Revalo prix de part" suffix="%/an" value={state.revaloParts} onChange={(v)=>set("revaloParts",v)} />
              </>
            )}
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="Apport" suffix="€" value={state.apport} onChange={(v)=>set("apport",v)} />
            <Field label="Taux du prêt" suffix="%/an" value={state.taux} onChange={(v)=>set("taux",v)} />
            <Field label="Assurance emprunteur" suffix="%/an" value={state.assurance} onChange={(v)=>set("assurance",v)} />
            <Field label="Durée du prêt" suffix="ans" value={state.duree} onChange={(v)=>set("duree",v)} />
          </div>
        </Section>

        <Section title="Résultats – SCPI">
          {state.mode === "Pleine propriété" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Capital net investi</div><div className="font-semibold">{fmt(capitalNetInvesti)} €</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Dette (montant prêté)</div><div className="font-semibold">{fmt(Math.max(0, vMontant - vApport))} €</div></div>
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
          <div className="text-xs text-gray-500 mt-3">* Hypothèses simplifiées.</div>
        </Section>
      </div>
    </>
  );
}

/* ===============================
   Local commercial
==================================*/
function LocalCommercial() {
  const [state, setState] = useLocalStore("tab:local", {
    prix:"250000", apport:"50000", taux:"3", assurance:"0,30", duree:"20",
    loyer:"1500", charges:"2000", taxe:"1500"
  });

  const vPrix = toNum(state.prix);
  const vApport = toNum(state.apport);
  const vTaux = toNum(state.taux);
  const vAssurance = toNum(state.assurance);
  const vDuree = toNum(state.duree);
  const vLoyer = toNum(state.loyer);
  const vCharges = toNum(state.charges);
  const vTaxe = toNum(state.taxe);

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
      <Helmet><title>Local commercial – rendement & cashflow</title></Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Local commercial">
          <div className="space-y-3">
            <Field label="Prix du bien" suffix="€" value={state.prix} onChange={(v)=>setState({...state,prix:v})} />
            <Field label="Apport" suffix="€" value={state.apport} onChange={(v)=>setState({...state,apport:v})} />
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="Taux du prêt" suffix="%/an" value={state.taux} onChange={(v)=>setState({...state,taux:v})} />
            <Field label="Assurance emprunteur" suffix="%/an" value={state.assurance} onChange={(v)=>setState({...state,assurance:v})} />
            <Field label="Durée du prêt" suffix="ans" value={state.duree} onChange={(v)=>setState({...state,duree:v})} />
            <div className="h-0.5 bg-gray-100 my-2" />
            <Field label="Loyer mensuel (HC)" suffix="€" value={state.loyer} onChange={(v)=>setState({...state,loyer:v})} />
            <Field label="Charges annuelles" suffix="€/an" value={state.charges} onChange={(v)=>setState({...state,charges:v})} />
            <Field label="Taxe foncière (annuelle)" suffix="€/an" value={state.taxe} onChange={(v)=>setState({...state,taxe:v})} />
          </div>
        </Section>

        <Section title="Résultats – Local commercial">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Rendement brut</div><div className="font-semibold">{fmt(rendementBrut,2)} %</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Rendement net (hors dette)</div><div className="font-semibold">{fmt(rendementNet,2)} %</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité totale (crédit + assur.)</div><div className="font-semibold">{fmt(mensualiteTotale)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Cashflow net estimé</div><div className={`font-semibold ${cashflowMens < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(cashflowMens)} €/mois</div></div>
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

/* ===============================
   10 Commandements (compact)
==================================*/
function CommandementsInvestisseur() {
  return (
    <Section title="Les 10 commandements de l’investisseur">
      <ol className="list-decimal pl-6 space-y-2 text-[15px] text-gray-800">
        <li>Analyse ton marché (prix/m², tension locative, DVF).</li>
        <li>Vérifie la rentabilité nette (toutes charges incluses).</li>
        <li>Compare au moins deux offres de prêt (taux & assurance).</li>
        <li>Projette tes CAPEX, OPEX, taxe foncière et vacance.</li>
        <li>Teste plusieurs scénarios (hausse taux, loyers, travaux).</li>
        <li>Conserve une épargne de sécurité.</li>
        <li>Anticipe la fiscalité réelle (TMI + PS, régime choisi).</li>
        <li>Lis les documents (PV AG, diagnostics, servitudes, PLU).</li>
        <li>Négocie avec données (devis, références, défauts).</li>
        <li>Fais relire par des pros (notaire, courtier, expert).</li>
      </ol>
    </Section>
  );
}

/* ===============================
   Crédit immobilier (1er onglet)
==================================*/
type CreditRow = { mois:number; echeance:number; interets:number; assurance:number; principal:number; crd:number; cumInt:number; cumAss:number; };

function CreditImmo() {
  const [state, setState] = useLocalStore("tab:credit", {
    capital:"250000", taux:"3,20", assurance:"0,30", duree:"25",
    modeAssCRD: false
  });
  const set = (k:string,v:any)=>setState({...state,[k]:v});

  const vCap = toNum(state.capital);
  const vTaux = toNum(state.taux);
  const vAss = toNum(state.assurance);
  const vDur = toNum(state.duree);

  const mensuHorsAss = annuityPayment(vCap, vTaux, vDur);
  const assMensConst = (vCap * (vAss / 100)) / 12;

  const schedule: CreditRow[] = useMemo(()=>{
    const rows: CreditRow[] = [];
    let crd = vCap;
    const r = vTaux/100/12;
    const mensu = mensuHorsAss;
    const totalMonths = Math.round(vDur*12);
    let cumI=0, cumA=0;
    for (let m=1;m<=totalMonths;m++) {
      const interets = r > 0 ? crd*r : 0;
      let principal = mensu - interets;
      if (principal < 0) principal = 0;
      if (m === totalMonths) principal = crd;
      const ass = state.modeAssCRD ? (crd * (vAss/100) / 12) : assMensConst;
      const echeance = mensu + ass;
      const nextCrd = Math.max(0, crd - principal);
      cumI += interets; cumA += ass;
      rows.push({ mois:m, echeance, interets, assurance:ass, principal, crd: nextCrd, cumInt:cumI, cumAss:cumA });
      crd = nextCrd;
    }
    return rows;
  }, [vCap, vTaux, vAss, vDur, state.modeAssCRD, mensuHorsAss, assMensConst]);

  const n = vDur * 12;
  const totalInterets = Math.max(0, mensuHorsAss * n - vCap);
  const totalAssurance = schedule.reduce((s, r) => s + r.assurance, 0);
  const mensuTotAffiche = schedule.length ? schedule[0].echeance : mensuHorsAss + (state.modeAssCRD ? (vCap*(vAss/100)/12) : assMensConst);
  const coutTotal = totalInterets + totalAssurance;

  const [showTable, setShowTable] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const exportCSV = () => {
    const header = ["Mois","Échéance totale","Capital remboursé","Intérêts","Assurance","Capital restant dû"];
    const lines = [header.join(";")];
    schedule.forEach(row => {
      lines.push([row.mois,row.echeance,row.principal,row.interets,row.assurance,row.crd].map(v=>Number(v).toFixed(2).replace(".",",")).join(";"));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `amortissement_${vCap}€_${vTaux}%_${vDur}ans.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const donut = [
    { name: "Intérêts", value: totalInterets },
    { name: "Assurance", value: totalAssurance },
    { name: "Capital", value: vCap },
  ];

  return (
    <>
      <Helmet><title>Crédit immobilier – assurance CRD (option)</title></Helmet>
      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Paramètres – Crédit">
          <div className="space-y-3">
            <Field label="Capital emprunté" suffix="€" value={state.capital} onChange={(v)=>set("capital",v)} help="Montant du prêt." />
            <Field label="Taux nominal" suffix="%/an" value={state.taux} onChange={(v)=>set("taux",v)} help="Hors assurance." />
            <Field label="Assurance emprunteur" suffix="%/an" value={state.assurance} onChange={(v)=>set("assurance",v)} help="Taux annuel d'assurance." />
            <Field label="Durée" suffix="ans" value={state.duree} onChange={(v)=>set("duree",v)} />
            <label className="flex items-center gap-2 select-none cursor-pointer">
              <input type="checkbox" checked={state.modeAssCRD} onChange={(e)=>set("modeAssCRD", e.target.checked)} />
              <span className="text-sm">Assurance calculée chaque mois sur le capital restant dû <HelpIcon text="Si décoché : assurance 'normale' calculée sur capital initial (mensuelle constante)." /></span>
            </label>
          </div>
        </Section>

        <Section title="Résultats – Crédit">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité (hors assur.)</div><div className="font-semibold">{fmt(mensuHorsAss)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Assurance (mois 1)</div><div className="font-semibold">{fmt(schedule.length ? schedule[0].assurance : (vCap*(vAss/100)/12))} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité totale</div><div className="font-semibold">{fmt(mensuTotAffiche)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Coût total (int.+ass.)</div><div className="font-semibold">{fmt(coutTotal)} €</div></div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donut} colors={COLORS} title="Décomposition du prêt" totalTitle="Total (capital+coûts)" />
            <div className="bg-white rounded-2xl shadow p-4 text-sm">
              <div className="font-semibold mb-2">Actions</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>setShowTable(s=>!s)} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">{showTable ? "Masquer le tableau" : "Afficher le tableau"}</button>
                <button onClick={exportCSV} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Exporter CSV</button>
                <button onClick={()=>setShowGraph(s=>!s)} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">{showGraph ? "Masquer le graphique" : "Afficher le graphique"}</button>
              </div>
            </div>
          </div>

          {showGraph && (
            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={schedule.map(r=>({mois:r.mois, CRD:r.crd, "Intérêts cumulés":r.cumInt, "Assurance cumulée":r.cumAss}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <RTooltip formatter={(v:number)=>`${fmt(v)} €`} />
                  <RLegend />
                  <Line type="monotone" dataKey="CRD" dot={false} />
                  <Line type="monotone" dataKey="Intérêts cumulés" dot={false} />
                  {state.modeAssCRD && <Line type="monotone" dataKey="Assurance cumulée" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">* Si l'assurance CRD est cochée, elle décroît au fil du temps.</p>
            </div>
          )}

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
                    <td className="px-3 py-2 text-right font-semibold">{fmt(schedule.reduce((s, r) => s + r.interets, 0))}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(schedule.reduce((s, r) => s + r.assurance, 0))}</td>
                    <td className="px-3 py-2 text-right font-semibold">0</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

/* ===============================
   App principale
==================================*/
export default function App() {
  const urlInit = readURLParams();
  const [tab, setTab] = useLocalStore<string>("app:activeTab", urlInit.tab || "Crédit immobilier");
  const tabs = ["Crédit immobilier","Location nue","Viager","SCPI","Local commercial","10 Commandements"];

  useEffect(()=>{ if (urlInit.tab && urlInit.tab !== tab) setTab(urlInit.tab); }, []);

  const handlePrint = () => window.print();

  useEffect(() => {
    const params: Record<string, any> = { };
    try {
      const m = {
        "Crédit immobilier": "tab:credit",
        "Location nue": "tab:location",
        "Viager": "tab:viager",
        "SCPI": "tab:scpi",
        "Local commercial": "tab:local",
      } as Record<string,string>;
      const raw = localStorage.getItem(m[tab] || "");
      if (raw) Object.assign(params, JSON.parse(raw));
      updateShareURL(tab, params);
    } catch {}
  }, [tab]);

  const copyShare = () => { navigator.clipboard.writeText(location.href); };

  const renderTabContent = () => {
    switch (tab) {
      case "Crédit immobilier": return <CreditImmo />;
      case "Location nue": return <LocationNue />;
      case "Viager": return <Viager />;
      case "SCPI": return <SCPI />;
      case "Local commercial": return <LocalCommercial />;
      case "10 Commandements": return <CommandementsInvestisseur />;
      default: return null;
    }
  };

  const webAppJsonLd = {
    "@context":"https://schema.org","@type":"WebApplication",
    "name":"Simulateur Immobilier Complet – Comparez, analysez et planifiez vos investissements",
    "url": location?.href || "",
    "applicationCategory":"FinanceApplication","operatingSystem":"Any",
    "offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"}
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Simulateur Immobilier Complet – Comparez, analysez et planifiez vos investissements</title>
        <meta name="description" content="Comparez, analysez et planifiez vos investissements : Crédit, Viager, Location nue, SCPI et Local commercial." />
        <script type="application/ld+json">{JSON.stringify(webAppJsonLd)}</script>
      </Helmet>
      <style>{printStyles}</style>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6 space-y-6 print-max-w">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div>
              <h1 className="text-2xl font-bold">Simulateur Immobilier Complet</h1>
              <p className="text-sm text-gray-600">Comparez, analysez et planifiez vos investissements</p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              <div className="flex gap-2">
                <button onClick={handlePrint} className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12M18 14v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4"/></svg>
                  Imprimer
                </button>
                <button onClick={copyShare} className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition shadow flex items-center justify-center">
                  Copier le lien de cette simulation
                </button>
              </div>
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
            </div>
          </header>

          <div className="hidden print:block text-center mb-6">
            <h2 className="text-2xl font-bold">Rapport de Simulation ({tab})</h2>
            <p className="text-sm text-gray-500">Date : {new Date().toLocaleDateString("fr-FR")}</p>
          </div>

          {renderTabContent()}

          <footer className="text-xs text-gray-400 text-center mt-8 no-print">
            Données indicatives — calculs simplifiés.
          </footer>
        </div>
      </div>
    </HelmetProvider>
  );
}
