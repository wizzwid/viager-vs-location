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
function LocationNue() {
  const [prix, setPrix] = useState("292000");
  const [apport, setApport] = useState("72000");
  const [fraisNotairePct, setFraisNotairePct] = useState("7.5");
  const [travaux, setTravaux] = useState("0");
  const [taux, setTaux] = useState("2.5");
  const [assurance, setAssurance] = useState("0.35");
  const [duree, setDuree] = useState("20");
  const [tmi, setTmi] = useState("30");
  const [loyer, setLoyer] = useState("740");
  const [chargesCopro, setChargesCopro] = useState("1200");
  const [taxeFonc, setTaxeFonc] = useState("1300");

  const vPrix = toNum(prix);
  const vApport = toNum(apport);
  const vFrais = (toNum(fraisNotairePct) / 100) * vPrix + toNum(travaux);
  const capital = Math.max(vPrix + vFrais - vApport, 0);
  const mensualite = annuityPayment(capital, toNum(taux), toNum(duree));
  const assuranceMens = (capital * (toNum(assurance) / 100)) / 12;

  const vLoyer = toNum(loyer);
  const revenuAnnuel = vLoyer * 12;
  const chargesAnnuel = toNum(chargesCopro) + toNum(taxeFonc);
  const interets = capital * (toNum(taux) / 100);
  const revenuImposable = Math.max(revenuAnnuel - chargesAnnuel - interets, 0);
  const impots = (revenuImposable * toNum(tmi)) / 100;
  const cashflowMens = (revenuAnnuel - chargesAnnuel - impots) / 12 - mensualite - assuranceMens;

  const donutCout = [
    { name: "Apport", value: vApport },
    { name: "Capital prêt", value: capital },
    { name: "Frais & travaux", value: vFrais },
  ];
  const donutReste = [
    { name: "Mensualité", value: mensualite },
    { name: "Assurance", value: assuranceMens },
    { name: "Taxe foncière", value: toNum(taxeFonc) / 12 },
    { name: "Charges copro", value: toNum(chargesCopro) / 12 },
    { name: "Impôts", value: impots / 12 },
  ];
  const COLORS = ["#3559E0", "#F2C94C", "#E67E22", "#27AE60", "#E74C3C"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Location nue">
        <div className="space-y-3">
          <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} />
          <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
          <Field label="Frais de notaire" suffix="%" value={fraisNotairePct} onChange={setFraisNotairePct} />
          <Field label="Travaux" suffix="€" value={travaux} onChange={setTravaux} />
          <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} />
          <Field label="Assurance" suffix="%/an" value={assurance} onChange={setAssurance} />
          <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
          <Field label="TMI" suffix="%" value={tmi} onChange={setTmi} />
          <Field label="Loyer mensuel" suffix="€" value={loyer} onChange={setLoyer} />
          <Field label="Charges copro" suffix="€/an" value={chargesCopro} onChange={setChargesCopro} />
          <Field label="Taxe foncière" suffix="€/an" value={taxeFonc} onChange={setTaxeFonc} />
        </div>
      </Section>

      <Section title="Résultats – Location nue">
        <div className="text-sm grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Mensualité</div>
            <div className="font-semibold">{fmt(mensualite + assuranceMens)} €/mois</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-gray-500">Cashflow estimé (an 1)</div>
            <div className="font-semibold">{fmt(cashflowMens)} €/mois</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={donutCout} innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donutCout.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-sm mt-2">Répartition du coût</div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={donutReste} innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donutReste.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${fmt(v)} €/mois`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-sm mt-2">Reste à charge mensuel</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

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
         
