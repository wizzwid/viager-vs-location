import React, { useMemo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/* ---------- Helpers UI ---------- */
const fmt = (n: number, d = 2) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "—";
const p = (n: number) => `${(n * 100).toFixed(2)} %`;
const toNumber = (v: string) => {
  const x = Number((v || "").toString().replace(/\s/g, "").replace(",", "."));
  return isFinite(x) ? x : 0;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl shadow p-5 bg-white">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, suffix, value, onChange, min, step,
}: {
  label: string; suffix?: string; value: string | number;
  onChange: (v: string) => void; min?: number; step?: number;
}) {
  return (
    <label className="flex items-center gap-3 justify-between w-full">
      <span className="text-sm text-gray-600 w-1/2">{label}</span>
      <span className="flex items-center gap-2 w-1/2">
        <input
          className="w-full rounded-xl border p-2 focus:outline-none focus:ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal" type="text" min={min} step={step}
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

/* ---------- Finance ---------- */
function pvOfAnnuity(monthly: number, years: number, discountRate: number, indexation = 0) {
  const r = discountRate / 12;
  const g = indexation / 12;
  const n = Math.round(years * 12);
  if (Math.abs(r - g) < 1e-9) return (monthly * n) / Math.pow(1 + r, 1);
  const v = (monthly * (1 - Math.pow((1 + g) / (1 + r), n))) / (1 - (1 + g) / (1 + r));
  return v / Math.pow(1 + r, 1);
}

function irr(cashflows: number[], guess = 0.05) {
  const maxIter = 100, tol = 1e-7;
  let r = guess;
  for (let k = 0; k < maxIter; k++) {
    let f = 0, df = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + r / 12, t + 1);
      f += cashflows[t] / denom;
      df += -(t + 1) * cashflows[t] / 12 / Math.pow(1 + r / 12, t + 2);
    }
    const step = f / df; r -= step;
    if (Math.abs(step) < tol) break;
  }
  return r;
}

/* ---------- Viager (acquéreur) ---------- */
function Viager() {
  const [valeurVenale, setValeurVenale] = useState("300000");
  const [bouquet, setBouquet] = useState("60000");
  const [rente, setRente] = useState("900");
  const [dureeOccupation, setDureeOccupation] = useState("18");
  const [tauxActualisation, setTauxActualisation] = useState("4"); // %/an
  const [indexation, setIndexation] = useState("1.5"); // %/an
  const [fraisNotairePct, setFraisNotairePct] = useState("8"); // % sur valeur occupée
  const [decoteOccupationPct, setDecoteOccupationPct] = useState("35"); // %

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
  const valActuRentes = useMemo(() => pvOfAnnuity(vRente, years, rActu, rIndex), [vRente, years, rActu, rIndex]);
  const prixAcquereur = useMemo(() => vBouquet + valActuRentes + fraisNotaire, [vBouquet, valActuRentes, fraisNotaire]);

  const cashflows = useMemo(() => {
    const n = Math.round(years * 12);
    const monthlyIndex = Math.pow(1 + rIndex, 1 / 12) - 1;
    const flows: number[] = [];
    let mRente = vRente;
    for (let t = 0; t < n; t++) { flows.push(-mRente); mRente *= 1 + monthlyIndex; }
    return flows;
  }, [vRente, years, rIndex]);

  const tri = useMemo(() => {
    if (cashflows.length === 0) return 0;
    const all = [-(vBouquet + fraisNotaire), ...cashflows];
    return irr(all, 0.05);
  }, [cashflows, vBouquet, fraisNotaire]);

  const donutViager = [
    { name: "Bouquet", value: vBouquet },
    { name: "VA des rentes", value: valActuRentes },
    { name: "Frais de notaire", value: fraisNotaire },
  ];
  const COLORS = ["#F2994A", "#F2C94C", "#3559E0"];

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
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Valeur occupée</div><div className="font-semibold">{fmt(valeurOccupee)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Frais de notaire</div><div className="font-semibold">{fmt(fraisNotaire)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">VA des rentes</div><div className="font-semibold">{fmt(valActuRentes)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Prix de revient total</div><div className="font-semibold">{fmt(prixAcquereur)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">TRI implicite</div><div className="font-semibold">{(tri*100).toFixed(2)} %</div></div>
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
        </div>
      </Section>
    </div>
  );
}

/* ---------- Location nue ---------- */
function pretMensualite(capital: number, tauxAnnuelPct: number, dureeAn: number) {
  const r = (tauxAnnuelPct / 100) / 12;
  const n = Math.max(1, Math.round(dureeAn * 12));
  if (r === 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

function Location() {
  const [prix, setPrix] = useState("292000");
  const [fraisNotairePct, setFraisNotairePct] = useState("7.5");
  const [travaux, setTravaux] = useState("0");
  const [loyer, setLoyer] = useState("740");
  const [charges, setCharges] = useState("100");
  const [taxeFonciere, setTaxeFonciere] = useState("1300");
  const [vacancePct, setVacancePct] = useState("5");
  const [tmiPct, setTmiPct] = useState("30");
  const [assurancePct, setAssurancePct] = useState("0.35");
  const [apport, setApport] = useState("72000");
  const [tauxCredit, setTauxCredit] = useState("2.5");
  const [dureeCredit, setDureeCredit] = useState("20");

  const vPrix = toNumber(prix);
  const vFrais = (toNumber(fraisNotairePct) / 100) * vPrix;
  const vTravaux = toNumber(travaux);
  const vLoyer = toNumber(loyer);
  const vCharges = toNumber(charges);
  const vTF = toNumber(taxeFonciere);
  const vac = toNumber(vacancePct) / 100;
  const tmi = toNumber(tmiPct) / 100;
  const assur = toNumber(assurancePct) / 100;
  const vApport = toNumber(apport);
  const taux = toNumber(tauxCredit);
  const duree = toNumber(dureeCredit);

  const coutAcquisition = vPrix + vFrais + vTravaux;
  const capitalEmprunte = Math.max(coutAcquisition - vApport, 0);
  const mensualite = pretMensualite(capitalEmprunte, taux, duree);

  const loyerAnnuel = vLoyer * 12 * (1 - vac);
  const chargesAnnuel = vCharges * 12 + vTF + coutAcquisition * assur;
  const interetsApprox = capitalEmprunte * (taux / 100);
  const revenuImposable = Math.max(loyerAnnuel - chargesAnnuel - interetsApprox, 0);
  const impots = revenuImposable * tmi;
  const cashflowAnnuel = loyerAnnuel - chargesAnnuel - impots - mensualite * 12;

  const rentaBrute = (vLoyer * 12) / vPrix;
  const rentaNette = (loyerAnnuel - chargesAnnuel) / coutAcquisition;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Section title="Paramètres de l'opération locative">
        <div className="space-y-3">
          <Field label="Prix d'achat" suffix="€" value={prix} onChange={setPrix} />
          <Field label="Frais de notaire" suffix="%" value={fraisNotairePct} onChange={setFraisNotairePct} />
          <Field label="Travaux" suffix="€" value={travaux} onChange={setTravaux} />
          <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
          <Field label="Taux du crédit" suffix="%/an" value={tauxCredit} onChange={setTauxCredit} />
          <Field label="Durée du crédit" suffix="ans" value={dureeCredit} onChange={setDureeCredit} />
          <div className="h-px bg-gray-200 my-2" />
          <Field label="Loyer mensuel" suffix="€" value={loyer} onChange={setLoyer} />
          <Field label="Charges mensuelles (H.C.)" suffix="€" value={charges} onChange={setCharges} />
          <Field label="Taxe foncière" suffix="€ / an" value={taxeFonciere} onChange={setTaxeFonciere} />
          <Field label="Vacance locative" suffix="%" value={vacancePct} onChange={setVacancePct} />
          <Field label="Assurance PNO" suffix="% du coût" value={assurancePct} onChange={setAssurancePct} />
          <Field label="TMI (approx.)" suffix="%" value={tmiPct} onChange={setTmiPct} />
        </div>
      </Section>

      <Section title="Résultats & indicateurs">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Coût d'acquisition</div><div className="font-semibold">{fmt(coutAcquisition)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Capital emprunté</div><div className="font-semibold">{fmt(capitalEmprunte)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Mensualité estimée</div><div className="font-semibold">{fmt(mensualite)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Cashflow annuel (≈ an 1)</div><div className="font-semibold">{fmt(cashflowAnnuel)} €</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Rendement brut</div><div className="font-semibold">{p(rentaBrute)}</div></div>
          <div className="p-3 rounded-xl bg-gray-50"><div className="text-gray-500">Rendement net</div><div className="font-semibold">{p(rentaNette)}</div></div>
        </div>
      </Section>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [tab, setTab] = useState<"Viager"|"Location">("Viager");

  useEffect(() => { document.title = `Simulateur ${tab} – Viager & Location`; }, [tab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Simulateur Viager & Location</h1>
            <p className="text-gray-500 text-sm">Prototype – calculs simplifiés pour itération rapide</p>
          </div>
          <Tabs tabs={["Viager", "Location"]} active={tab} onChange={(t)=>setTab(t as any)} />
        </header>

        {tab === "Viager" ? <Viager /> : <Location />}

        <footer className="mt-10 text-xs text-gray-400">
          <p>Ce prototype est indicatif (hors fiscalité détaillée). Pour caler exactement sur votre fichier Numbers, donnez un export Excel / PDF.</p>
        </footer>
      </div>
    </div>
  );
}
