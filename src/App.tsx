import React, { useMemo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/* ===========================
   1. UTILS
=========================== */
const fmt = (n: number, d = 0) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—";
const toNum = (v: string) => {
  const x = Number((v || "").toString().replace(/\s/g, "").replace(",", "."));
  return isFinite(x) ? x : 0;
};

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
}: {
  label: string;
  suffix?: string;
  value: string | number;
  onChange: (v: string) => void;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-3 justify-between w-full">
      <div className="w-1/2">
        <div className="text-sm text-gray-700 font-medium">{label}</div>
        {help ? <div className="text-xs text-gray-400 mt-0.5">{help}</div> : null}
      </div>
      <span className="flex items-center gap-2 w-1/2">
        <input
          className="w-full rounded-xl border p-2 focus:outline-none focus:ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          type="text"
        />
        {suffix ? <span className="text-gray-500 text-sm whitespace-nowrap">{suffix}</span> : null}
      </span>
    </label>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
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

/* ===========================
   2. FINANCE HELPERS
=========================== */
function annuityPayment(capital: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (r === 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

function pvIndexedAnnuity(monthly: number, years: number, discountPct: number, indexPct: number) {
  const r = discountPct / 100 / 12;
  const g = indexPct / 100 / 12;
  const n = Math.round(years * 12);
  if (Math.abs(r - g) < 1e-9) return (monthly * n) / Math.pow(1 + r, 1);
  const q = (1 + g) / (1 + r);
  const v = (monthly * (1 - Math.pow(q, n))) / (1 - q);
  return v / Math.pow(1 + r, 1);
}

function solveMonthlyFromPV(targetPV: number, years: number, discountPct: number, indexPct: number) {
  const ref = pvIndexedAnnuity(100, years, discountPct, indexPct);
  if (ref <= 0) return 0;
  return (targetPV / ref) * 100;
}

/* ===========================
   3. TABLE INSEE SIMPLIFIÉE
=========================== */
function getEsperanceVie(ageInput: number | string, sexeInput: string) {
  const age = Math.max(0, Math.min(100, Number(ageInput) || 0));
  const s = (sexeInput || "").toLowerCase();
  const tableF: Record<number, number> = { 50: 36, 55: 31.5, 60: 27, 65: 22.5, 70: 18.8, 75: 15, 80: 11.5, 85: 8.5, 90: 6.2, 95: 4.5 };
  const tableM: Record<number, number> = { 50: 32, 55: 28, 60: 24, 65: 20, 70: 16.5, 75: 13, 80: 10, 85: 7.5, 90: 5.5, 95: 4 };
  const keys = Object.keys(tableF).map(Number).sort((a, b) => a - b);
  const tbl = s.startsWith("h") || s.includes("hom") ? tableM : tableF;
  if (age <= keys[0]) return tbl[keys[0]] + (keys[0] - age) * 0.4;
  if (age >= keys[keys.length - 1]) return Math.max(0.5, tbl[keys[keys.length - 1]] - (age - keys[keys.length - 1]) * 0.35);
  let a0 = keys[0], a1 = keys[1];
  for (let i = 1; i < keys.length; i++) if (age <= keys[i]) { a0 = keys[i - 1]; a1 = keys[i]; break; }
  const y0 = tbl[a0], y1 = tbl[a1], t = (age - a0) / (a1 - a0);
  return y0 + (y1 - y0) * t;
}

/* ===========================
   4. LOCATION NUE
=========================== */
// (Même code que dans ta version précédente – inchangé)

/* ===========================
   5. VIAGER
=========================== */
function Viager() {
  const [valeurVenale, setValeurVenale] = useState("292000");
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [tauxCap, setTauxCap] = useState("2");
  const [decoteOcc, setDecoteOcc] = useState("55");
  const [bouquetPct, setBouquetPct] = useState("48");
  const [rentePct, setRentePct] = useState("52");
  const [indexRente, setIndexRente] = useState("1.10");

  const vV = toNum(valeurVenale);
  const years = getEsperanceVie(Number(age), sexe);
  const valeurOccupee = vV * (1 - toNum(decoteOcc) / 100);
  const capitalBouquet = (toNum(bouquetPct) / 100) * valeurOccupee;
  const capitalRente = (toNum(rentePct) / 100) * valeurOccupee;
  const renteMensuelle = solveMonthlyFromPV(capitalRente, years, toNum(tauxCap), toNum(indexRente));

  const donutViager = [
    { name: "Bouquet", value: capitalBouquet },
    { name: "Capital Rente", value: capitalRente },
  ];
  const COLORS = ["#F2994A", "#F2C94C", "#3559E0", "#E67E22"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Viager">
        <div className="space-y-3">
          <Field label="Valeur vénale" suffix="€" value={valeurVenale} onChange={setValeurVenale} />
          <Field label="Âge" suffix="ans" value={age} onChange={setAge} />
          <Field label="Sexe" value={sexe} onChange={setSexe} />
          <Field label="Espérance de vie (INSEE)" suffix="ans" value={years.toFixed(1)} onChange={() => {}} help="Calculée automatiquement selon âge & sexe" />
          <Field label="Taux capitalisation" suffix="%/an" value={tauxCap} onChange={setTauxCap} />
          <Field label="Décote d'occupation" suffix="%" value={decoteOcc} onChange={setDecoteOcc} />
          <Field label="Bouquet" suffix="%" value={bouquetPct} onChange={setBouquetPct} />
          <Field label="Rente" suffix="%" value={rentePct} onChange={setRentePct} />
          <Field label="Tx révision rente" suffix="%/an" value={indexRente} onChange={setIndexRente} />
        </div>
      </Section>

      <Section title="Résultats – Viager">
        <div className="text-sm grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Valeur occupée</div>
            <div className="font-semibold">{fmt(valeurOccupee)} €</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Bouquet ({bouquetPct}%)</div>
            <div className="font-semibold">{fmt(capitalBouquet)} €</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Capital Rente ({rentePct}%)</div>
            <div className="font-semibold">{fmt(capitalRente)} €</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Rente mensuelle</div>
            <div className="font-semibold">{fmt(renteMensuelle)} €/mois</div>
          </div>
        </div>

        <div className="h-56 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="value" data={donutViager} innerRadius={50} outerRadius={80} paddingAngle={2}>
                {donutViager.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center text-sm mt-2">Répartition du viager</div>
        </div>
      </Section>
    </div>
  );
}

/* ===========================
   6. APP PRINCIPALE
=========================== */
export default function App() {
  const [tab, setTab] = useState("Location nue");
  useEffect(() => {
    document.title = `Simulateur interactif – ${tab}`;
  }, [tab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Simulateur Viager & Location (interactif)</h1>
            <p className="text-gray-500 text-sm">Calculs simplifiés — Version complète déployable</p>
          </div>
          <Tabs tabs={["Location nue", "Viager"]} active={tab} onChange={setTab} />
        </header>

        {tab === "Location nue" ? <LocationNue /> : <Viager />}

        <footer className="text-xs text-gray-400">
          ⚠️ Prototype indicatif : formules simplifiées. Pour un calcul fiscal complet, prévoir intégration Excel.
        </footer>
      </div>
    </div>
  );
}
