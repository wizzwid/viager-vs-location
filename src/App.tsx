import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/*********************
 * UTILITAIRES
 *********************/
const fmt = (n: number, d = 0) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—";
const toNum = (v: string) => Number((v || "").toString().replace(/\s/g, "").replace(",", ".")) || 0;

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
    <label className="flex items-start justify-between gap-3 w-full">
      <div className="w-1/2">
        <div className="text-sm text-gray-700 font-medium">{label}</div>
        {help ? <div className="text-xs text-gray-400">{help}</div> : null}
      </div>
      <span className="flex items-center gap-2 w-1/2">
        <input
          className="w-full rounded-xl border p-2 focus:outline-none focus:ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          type="text"
        />
        {suffix ? <span className="text-gray-500 text-sm">{suffix}</span> : null}
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

/*********************
 * FORMULES FINANCIÈRES
 *********************/
function annuityPayment(capital: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = Math.round(years * 12);
  if (r === 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

function pvIndexedAnnuity(monthly: number, years: number, discountPct: number, indexPct: number) {
  const r = discountPct / 100 / 12;
  const g = indexPct / 100 / 12;
  const n = Math.round(years * 12);
  const q = (1 + g) / (1 + r);
  const v = (monthly * (1 - Math.pow(q, n))) / (1 - q);
  return v / Math.pow(1 + r, 1);
}

function solveMonthlyFromPV(targetPV: number, years: number, discountPct: number, indexPct: number) {
  const ref = pvIndexedAnnuity(100, years, discountPct, indexPct);
  return ref ? (targetPV / ref) * 100 : 0;
}

/*********************
 * TABLE INSEE SIMPLIFIÉE
 *********************/
function getEsperanceVie(age: number, sexe: string) {
  const tableF: Record<number, number> = { 50: 36, 55: 31.5, 60: 27, 65: 22.5, 70: 18.8, 75: 15, 80: 11.5, 85: 8.5, 90: 6.2, 95: 4.5 };
  const tableM: Record<number, number> = { 50: 32, 55: 28, 60: 24, 65: 20, 70: 16.5, 75: 13, 80: 10, 85: 7.5, 90: 5.5, 95: 4 };
  const keys = Object.keys(tableF).map(Number);
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

/*********************
 * SIMULATEUR LOCATION NUE
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
  const [tmi, setTmi] = useState("30");

  const vPrix = toNum(prix);
  const vApport = toNum(apport);
  const capital = vPrix - vApport;
  const mensualite = annuityPayment(capital, toNum(taux), toNum(duree));
  const assuranceMens = (capital * (toNum(assurance) / 100)) / 12;
  const cashflowMens = toNum(loyer) - (toNum(charges) + toNum(taxe)) / 12 - mensualite - assuranceMens;

  const COLORS = ["#3559E0", "#F2C94C", "#E67E22", "#27AE60", "#E74C3C"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Location nue">
        <div className="space-y-3">
          <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} />
          <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
          <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} />
          <Field label="Assurance" suffix="%/an" value={assurance} onChange={setAssurance} />
          <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
          <Field label="Loyer mensuel" suffix="€" value={loyer} onChange={setLoyer} />
          <Field label="Charges" suffix="€/an" value={charges} onChange={setCharges} />
          <Field label="Taxe foncière" suffix="€/an" value={taxe} onChange={setTaxe} />
          <Field label="TMI" suffix="%" value={tmi} onChange={setTmi} />
        </div>
      </Section>

      <Section title="Résultats – Location nue">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Mensualité</div>
            <div className="font-semibold">{fmt(mensualite + assuranceMens)} €/mois</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Cashflow estimé</div>
            <div className="font-semibold">{fmt(cashflowMens)} €/mois</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

/*********************
 * SIMULATEUR VIAGER
 *********************/
function Viager() {
  const [valeur, setValeur] = useState("292000");
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [taux, setTaux] = useState("2");
  const [decote, setDecote] = useState("55");
  const [bouquet, setBouquet] = useState("48");
  const [rente, setRente] = useState("52");
  const [index, setIndex] = useState("1.1");

  const vV = toNum(valeur);
  const years = getEsperanceVie(Number(age), sexe);
  const valeurOccupee = vV * (1 - toNum(decote) / 100);
  const capBouquet = (toNum(bouquet) / 100) * valeurOccupee;
  const capRente = (toNum(rente) / 100) * valeurOccupee;
  const renteMensuelle = solveMonthlyFromPV(capRente, years, toNum(taux), toNum(index));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Viager">
        <div className="space-y-3">
          <Field label="Valeur vénale" suffix="€" value={valeur} onChange={setValeur} />
          <Field label="Âge" suffix="ans" value={age} onChange={setAge} />
          <Field label="Sexe" value={sexe} onChange={setSexe} />
          <Field label="Espérance de vie (INSEE)" suffix="ans" value={years.toFixed(1)} onChange={() => {}} />
          <Field label="Taux capitalisation" suffix="%/an" value={taux} onChange={setTaux} />
          <Field label="Décote d'occupation" suffix="%" value={decote} onChange={setDecote} />
          <Field label="Bouquet" suffix="%" value={bouquet} onChange={setBouquet} />
          <Field label="Rente" suffix="%" value={rente} onChange={setRente} />
          <Field label="Tx révision rente" suffix="%/an" value={index} onChange={setIndex} />
        </div>
      </Section>

      <Section title="Résultats – Viager">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Valeur occupée</div>
            <div className="font-semibold">{fmt(valeurOccupee)} €</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Bouquet</div>
            <div className="font-semibold">{fmt(capBouquet)} €</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Rente estimée</div>
            <div className="font-semibold">{fmt(renteMensuelle)} €/mois</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

/*********************
 * APPLICATION PRINCIPALE
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
            <p className="text-sm text-gray-500">Comparateur interactif complet</p>
          </div>
          <Tabs tabs={["Location nue", "Viager"]} active={tab} onChange={setTab} />
        </header>

        {tab === "Location nue" ? <LocationNue /> : <Viager />}

        <footer className="text-xs text-gray-400">
          Données indicatives — calculs simplifiés. Adapté pour présentation et comparaison.
        </footer>
      </div>
    </div>
  );
}
