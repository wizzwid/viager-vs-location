import React, { useMemo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// --- Utility helpers ---
const fmt = (n: number) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—";
const p = (n: number) => `${(n * 100).toFixed(2)} %`;

function toNumber(v: string): number {
  const x = Number((v || "").toString().replace(/\s/g, "").replace(",", "."));
  return isFinite(x) ? x : 0;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white">
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
  min,
  step,
}: {
  label: string;
  suffix?: string;
  value: string | number;
  onChange: (v: string) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="flex items-center gap-3 justify-between w-full">
      <span className="text-sm text-gray-600 w-1/2">{label}</span>
      <span className="flex items-center gap-2 w-1/2">
        <input
          className="w-full rounded-xl border p-2 focus:outline-none focus:ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          type="text"
          min={min}
          step={step}
        />
        {suffix ? <span className="text-gray-500 text-sm">{suffix}</span> : null}
      </span>
    </label>
  );
}

function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl bg-gray-100 p-1">
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

// --- Core calculations ---
function pvOfAnnuity(monthly: number, years: number, discountRate: number, indexation = 0) {
  const r = discountRate / 12;
  const g = indexation / 12;
  const n = Math.round(years * 12);
  if (Math.abs(r - g) < 1e-9) {
    return (monthly * n) / Math.pow(1 + r, 1);
  }
  const v = (monthly * (1 - Math.pow((1 + g) / (1 + r), n))) / (1 - (1 + g) / (1 + r));
  return v / Math.pow(1 + r, 1);
}

function irr(cashflows: number[], guess = 0.05) {
  const maxIter = 100;
  const tol = 1e-7;
  let r = guess;
  for (let k = 0; k < maxIter; k++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + r / 12, t + 1);
      f += cashflows[t] / denom;
      df += -(t + 1) * cashflows[t] / 12 / Math.pow(1 + r / 12, t + 2);
    }
    const step = f / df;
    r -= step;
    if (Math.abs(step) < tol) break;
  }
  return r;
}

// --- Viager simulator ---
function Viager() {
  const [valeurVenale, setValeurVenale] = useState("300000");
  const [bouquet, setBouquet] = useState("60000");
  const [rente, setRente] = useState("900");
  const [dureeOccupation, setDureeOccupation] = useState("18");
  const [tauxActualisation, setTauxActualisation] = useState("4");
  const [indexation, setIndexation] = useState("1.5");
  const [fraisNotairePct, setFraisNotairePct] = useState("8");
  const [decoteOccupationPct, setDecoteOccupationPct] = useState("35");

  const vVenale = toNumber(valeurVenale);
  const vBouquet = toNumber(bouquet);
  const vRente = toNumber(rente);
  const years = toNumber(dureeOccupation);
  const rActu = toNumber(tauxActualisation) / 100;
  const rIndex = toNumber(indexation) / 100;
  const notaryPct = toNumber(fraisNotairePct) / 100;
  const decote = toNumber(decoteOccupationPct) / 100;

  const valeurOccupee = useMemo(() => vVenale * (1 - decote), [vVenale, decote]);
  const fraisNotaire = useMemo(() => valeurOccupee * notaryPct, [valeurOccupee, notaryPct]);
  const valActuRentes = useMemo(
    () => pvOfAnnuity(vRente, years, rActu, rIndex),
    [vRente, years, rActu, rIndex]
  );
  const prixAcquereur = useMemo(
    () => vBouquet + valActuRentes + fraisNotaire,
    [vBouquet, valActuRentes, fraisNotaire]
  );

  const cashflows = useMemo(() => {
    const n = Math.round(years * 12);
    const monthlyIndex = Math.pow(1 + rIndex, 1 / 12) - 1;
    const flows: number[] = [];
    let mRente = vRente;
    for (let t = 0; t < n; t++) {
      flows.push(-mRente);
      mRente *= 1 + monthlyIndex;
    }
    return flows;
  }, [vRente, years, rIndex]);

  const tri = useMemo(() => {
    if (cashflows.length === 0) return 0;
    const all = [-(vBouquet + fraisNotaire), ...cashflows];
    const r = irr(all, 0.05);
    return r;
  }, [cashflows, vBouquet, fraisNotaire]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Section title="Paramètres du viager (côté acquéreur)">
        <div className="space-y-3">
          <Field label="Valeur vénale du bien" suffix="€" value={valeurVenale} onChange={setValeurVenale} />
          <Field label="Décote d'occupation" suffix="%" value={decote * 100} onChange={(v)=>setDecoteOccupationPct(v)} />
          <Field label="Bouquet" suffix="€" value={bouquet} onChange={setBouquet} />
          <Field label="Rente mensuelle" suffix="€" value={rente} onChange={setRente} />
          <Field label="Durée estimée d'occupation" suffix="années" value={dureeOccupation} onChange={setDureeOccupation} />
          <Field label="Indexation de la rente" suffix="%/an" value={indexation} onChange={setIndexation} />
          <Field label="Taux d'actualisation" suffix="%/an" value={tauxActualisation} onChange={setTauxActualisation} />
          <Field label="Frais de notaire (sur valeur occupée)" suffix="%" value={fraisNotairePct} onChange={setFraisNotairePct} />
        </div>
      </Section>

      <Section title="Résultats & indicateurs">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Valeur occupée (après décote)</div><div className="font-semibold">{fmt(valeurOccupee)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Frais de notaire estimés</div><div className="font-semibold">{fmt(fraisNotaire)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Valeur actuelle des rentes</div><div className="font-semibold">{fmt(valActuRentes)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Prix de revient total (acquéreur)</div><div className="font-semibold">{fmt(prixAcquereur)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">TRI implicite (approx. mensuel→annuel)</div><div className="font-semibold">{(tri*100).toFixed(2)} %</div></div>
        </div>
        <p className="text-xs text-gray-500 mt-3">NB : calculs simplifiés (sans fiscalité, sans droits spécifiques). Le TRI est estimé à partir des flux mensuels.</p>
      </Section>
    </div>
  );
}

// --- Main page ---
export default function App() {
  const [tab, setTab] = useState("Viager");

  useEffect(() => {
    document.title = `Simulateur ${tab} – Viager & Location`;
  }, [tab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Simulateur Viager & Location</h1>
            <p className="text-gray-500 text-sm">Prototype web – calculs simplifiés pour itération rapide</p>
          </div>
          <Tabs tabs={["Viager"]} active={tab} onChange={setTab} />
        </header>

        <Viager />

        <footer className="mt-10 text-xs text-gray-400">
          <p>
            Ce prototype est fourni à titre indicatif. Les résultats ne constituent pas un conseil juridique, fiscal ou financier. 
            Pour coller exactement à votre fichier Numbers d'origine, fournissez un export <strong>Excel (.xlsx)</strong> ou <strong>PDF</strong> afin d'aligner les champs et les formules.
          </p>
        </footer>
      </div>
    </div>
  );
}
