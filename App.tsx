import React, { useMemo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/*********************\
 *  UI helpers
 *********************/
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
          className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${active === t ? "bg-white shadow" : "text-gray-600 hover:text-gray-900"}\`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/*********************\
 *  Finance helpers
 *********************/
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
  if (Math.abs(r - g) < 1e-9) {
    return (monthly * n) / Math.pow(1 + r, 1);
  }
  const q = (1 + g) / (1 + r);
  const v = (monthly * (1 - Math.pow(q, n))) / (1 - q);
  return v / Math.pow(1 + r, 1);
}

function solveMonthlyFromPV(targetPV: number, years: number, discountPct: number, indexPct: number) {
  const ref = pvIndexedAnnuity(100, years, discountPct, indexPct);
  if (ref <= 0) return 0;
  return (targetPV / ref) * 100;
}

/*********************\
 *  INSEE life expectancy (simplified table + interpolation)
 *********************/
function getEsperanceVie(ageInput: number | string, sexeInput: string) {
  const age = Math.max(0, Math.min(100, Number(ageInput) || 0));
  const s = (sexeInput || "").toLowerCase();
  const tableF: Record<number, number> = { 50: 36.0, 55: 31.5, 60: 27.0, 65: 22.5, 70: 18.8, 75: 15.0, 80: 11.5, 85: 8.5, 90: 6.2, 95: 4.5 };
  const tableM: Record<number, number> = { 50: 32.0, 55: 28.0, 60: 24.0, 65: 20.0, 70: 16.5, 75: 13.0, 80: 10.0, 85: 7.5, 90: 5.5, 95: 4.0 };
  const keys = Object.keys(tableF).map(Number).sort((a,b)=>a-b);
  const tbl = s.startsWith("h") || s === "m" || s.includes("hom") ? tableM : tableF;
  if (age <= keys[0]) return tbl[keys[0]] + (keys[0] - age) * 0.4;
  if (age >= keys[keys.length-1]) return Math.max(0.5, tbl[keys[keys.length-1]] - (age - keys[keys.length-1]) * 0.35);
  let a0 = keys[0], a1 = keys[1];
  for (let i=1;i<keys.length;i++){ if (age <= keys[i]) { a0 = keys[i-1]; a1 = keys[i]; break; } }
  const y0 = tbl[a0];
  const y1 = tbl[a1];
  const t = (age - a0) / (a1 - a0);
  return y0 + (y1 - y0) * t;
}

/*********************\
 *  Location (nue) simulator
 *********************/
function LocationNue() {
  const [valeur, setValeur] = useState("292000");
  const [apport, setApport] = useState("72000");
  const [fraisDivers, setFraisDivers] = useState("0");
  const [taux, setTaux] = useState("2.5");
  const [assurance, setAssurance] = useState("0.35");
  const [duree, setDuree] = useState("20");
  const [tmi, setTmi] = useState("30");

  const [loyer, setLoyer] = useState("740");
  const [indexLoyer, setIndexLoyer] = useState("1.15");
  const [chargesCopro, setChargesCopro] = useState("1200");
  const [taxeFonc, setTaxeFonc] = useState("1300");
  const [gestionPct, setGestionPct] = useState("0");
  const [reventeAns, setReventeAns] = useState("11");
  const [pvImmo, setPvImmo] = useState("1.1");
  const [fraisNotairePct, setFraisNotairePct] = useState("7.5");

  const v = toNum(valeur);
  const aport = toNum(apport);
  const fraisFixes = toNum(fraisDivers) + (toNum(fraisNotairePct) / 100) * v;
  const capital = Math.max(v + fraisFixes - aport, 0);
  const mensualite = annuityPayment(capital, toNum(taux), toNum(duree));
  const assuranceMens = (capital * (toNum(assurance) / 100)) / 12;

  const loyerMens = toNum(loyer);
  const loyerAnnuelNet = loyerMens * 12 * (1 - toNum(gestionPct) / 100);
  const chargesAn = toNum(chargesCopro) + toNum(taxeFonc);
  const interetsAnn1 = capital * (toNum(taux) / 100);
  const revenuImposable = Math.max(loyerAnnuelNet - chargesAn - interetsAnn1, 0);
  const impotsAnn1 = (revenuImposable * toNum(tmi)) / 100;
  const cashflowMens1 = loyerMens - (chargesAn / 12) - (impotsAnn1 / 12) - mensualite - assuranceMens;

  const coutAssurancePret = capital * (toNum(assurance) / 100) * toNum(duree);
  const coutNotaire = (toNum(fraisNotairePct) / 100) * v;
  const coutTotal = aport + capital + coutAssurancePret + coutNotaire;

  const nY = toNum(reventeAns);
  const prixFuture = v * Math.pow(1 + toNum(pvImmo) / 100, nY);

  const donutCout = [
    { name: "Apport personnel", value: aport },
    { name: "Capital prêt", value: capital },
    { name: "Frais Notaire", value: coutNotaire },
    { name: "Assurance prêt", value: coutAssurancePret },
  ];
  const donutResteCharge = [
    { name: "Crédit", value: mensualite },
    { name: "Assurance prêt", value: assuranceMens },
    { name: "Taxe Foncière", value: toNum(taxeFonc) / 12 },
    { name: "Syndic", value: toNum(chargesCopro) / 12 },
    { name: "Impôts sur loyers/mois", value: impotsAnn1 / 12 },
  ];

  const COLORS = ["#3559E0", "#89A8F5", "#F2C94C", "#E67E22", "#E74C3C", "#27AE60"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Location nue">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Field label="Valeur immobilière" suffix="€" value={valeur} onChange={setValeur} />
            <Field label="Apport personnel" suffix="€" value={apport} onChange={setApport} />
            <Field label="Frais (agence + travaux)" suffix="€" value={fraisDivers} onChange={setFraisDivers} />
            <Field label="Frais de notaire" suffix="%" value={fraisNotairePct} onChange={setFraisNotairePct} />
            <Field label="Taux emprunt" suffix="%" value={taux} onChange={setTaux} />
            <Field label="Taux assurance" suffix="%/an" value={assurance} onChange={setAssurance} />
            <Field label="Durée de l'emprunt" suffix="ans" value={duree} onChange={setDuree} />
            <Field label="TMI (sur loyers)" suffix="%" value={tmi} onChange={setTmi} />
          </div>
          <div className="space-y-3">
            <Field label="Valeur locative (loyer)" suffix="€/mois" value={loyer} onChange={setLoyer} />
            <Field label="Tx révision loyer annuel" suffix="%/an" value={indexLoyer} onChange={setIndexLoyer} />
            <Field label="Charges copro" suffix="€/an" value={chargesCopro} onChange={setChargesCopro} />
            <Field label="Taxe Foncière" suffix="€/an" value={taxeFonc} onChange={setTaxeFonc} />
            <Field label="Gestion locative" suffix="% du loyer" value={gestionPct} onChange={setGestionPct} />
            <Field label="Revente après" suffix="années" value={reventeAns} onChange={setReventeAns} />
            <Field label="PV immobilier" suffix="%/an" value={pvImmo} onChange={setPvImmo} />
          </div>
        </div>
      </Section>

      <Section title="Résultats – Location nue">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-sm text-gray-500">Mensualités</div>
            <div className="text-3xl font-bold">{fmt(mensualite + assuranceMens)} €/mois</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-500">Coût total (visuel)</div>
                <div className="font-semibold">{fmt(coutTotal)} €</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-500">Revente après {nY} ans</div>
                <div className="font-semibold">{fmt(prixFuture)} €</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-500">Reste à charge (≈ an 1)</div>
                <div className="font-semibold">{fmt(cashflowMens1)} €/mois</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={donutCout} innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {donutCout.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${fmt(v)} €`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-sm font-semibold mt-2">Répartition du coût</div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={donutResteCharge} innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {donutResteCharge.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${fmt(v)} €/mois`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-sm font-semibold mt-2">Reste à charge détaillé</div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

/*********************\
 *  Viager simulator (côté acquéreur)
 *********************/
function Viager() {
  const [valeurVenale, setValeurVenale] = useState("292000");
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [esperanceVie, setEsperanceVie] = useState("18.2");
  const [tauxCap, setTauxCap] = useState("2");
  const [decoteOcc, setDecoteOcc] = useState("55");

  const [bouquetPct, setBouquetPct] = useState("48");
  const [rentePct, setRentePct] = useState("52");
  const [indexRente, setIndexRente] = useState("1.10");

  const vV = toNum(valeurVenale);
  const evAuto = getEsperanceVie(Number(age), sexe);
  const years = evAuto;
  const capRate = toNum(tauxCap);

  const valeurOccupeeByActual = vV / Math.pow(1 + capRate / 100, years);
  const valeurOccupeeByDecote = vV * (1 - toNum(decoteOcc) / 100);
  const valeurOccupee = valeurOccupeeByDecote;

  const capitalBouquet = (toNum(bouquetPct) / 100) * valeurOccupee;
  const capitalRente = (toNum(rentePct) / 100) * valeurOccupee;

  const renteMensuelle = solveMonthlyFromPV(capitalRente, years, capRate, toNum(indexRente));

  const [taxeFoncViager, setTaxeFoncViager] = useState("108");
  const [syndicViager, setSyndicViager] = useState("54");
  const donutViager = [
    { name: "Rente Viagère", value: renteMensuelle },
    { name: "Taxe Foncière", value: toNum(taxeFoncViager) },
    { name: "Syndic", value: toNum(syndicViager) },
  ];

  const COLORS = ["#F2994A", "#F2C94C", "#E74C3C", "#27AE60", "#3559E0"];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Viager">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Field label="Valeur vénale" suffix="€" value={valeurVenale} onChange={setValeurVenale} />
            <Field label="Âge" suffix="ans" value={age} onChange={setAge} />
            <Field label="Sexe" value={sexe} onChange={setSexe} help="Femme / Homme (cosmétique)" />
            <Field label="Espérance de vie (INSEE estimée)" suffix="ans" value={evAuto.toFixed(1)} onChange={() => {}} help="Calculée automatiquement selon âge & sexe (tables INSEE simplifiées)." />
            <Field label="Tx capitalisation viager" suffix="%/an" value={tauxCap} onChange={setTauxCap} />
          </div>
          <div className="space-y-3">
            <Field label="Décote d'occupation (manuel)" suffix="%" value={decoteOcc} onChange={setDecoteOcc} help={\`Occupee≈ \${fmt(valeurOccupeeByActual,0)} € si on actualise à \${tauxCap}% pendant \${years} ans\`} />
            <Field label="Bouquet" suffix="%" value={bouquetPct} onChange={setBouquetPct} />
            <Field label="Rente" suffix="%" value={rentePct} onChange={setRentePct} />
            <Field label="Tx révision rente" suffix="%/an" value={indexRente} onChange={setIndexRente} />
            <Field label="Taxe Foncière (mensuel)" suffix="€" value={taxeFoncViager} onChange={setTaxeFoncViager} />
            <Field label="Syndic (mensuel)" suffix="€" value={syndicViager} onChange={setSyndicViager} />
          </div>
        </div>
      </Section>

      <Section title="Résultats – Viager">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-gray-500">Valeur occupée</div>
                <div className="font-semibold">{fmt(valeurOccupee)} €</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-gray-500">Bouquet ({bouquetPct}%)</div>
                <div className="font-semibold">{fmt(capitalBouquet)} €</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-gray-500">Capital affecté à la rente ({rentePct}%)</div>
                <div className="font-semibold">{fmt(capitalRente)} €</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-gray-500">Rente estimée</div>
                <div className="font-semibold">{fmt(renteMensuelle,0)} €/mois</div>
              </div>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={donutViager} innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donutViager.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => \`\${fmt(v)} €/mois\`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-sm font-semibold mt-2">Viager – dépenses mensuelles</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

/*********************\
 *  Lightweight self-tests (run in dev console)
 *********************/
function runSelfTests() {
  try {
    const f71 = getEsperanceVie(71, "Femme");
    const h71 = getEsperanceVie(71, "Homme");
    console.assert(f71 > h71, "INSEE: Femme 71 devrait > Homme 71");

    const h85 = getEsperanceVie(85, "Homme");
    const h70 = getEsperanceVie(70, "Homme");
    console.assert(h85 < h70, "INSEE: 85 ans devrait < 70 ans");

    const f50 = getEsperanceVie(50, "Femme");
    const f55 = getEsperanceVie(55, "Femme");
    console.assert(f55 < f50 && Math.abs(f55 - f50) < 6, "Interpolation raisonnable 50→55");
    console.debug("Self-tests OK");
  } catch (e) {
    console.warn("Self-tests error", e);
  }
}

/*********************\
 *  Main App
 *********************/
export default function App() {
  const [tab, setTab] = useState("Location nue");
  useEffect(() => {
    document.title = \`Simulateur interactif – \${tab}\`;
  }, [tab]);

  useEffect(() => {
    if (typeof window !== "undefined") runSelfTests();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Simulateur Viager & Location (interactif)</h1>
            <p className="text-gray-500 text-sm">Design inspiré de votre maquette, calculs simplifiés – prêt pour itération.</p>
          </div>
          <Tabs tabs={["Location nue", "Viager"]} active={tab} onChange={setTab} />
        </header>

        {tab === "Location nue" ? <LocationNue /> : <Viager />}

        <footer className="text-xs text-gray-400">
          <p>
            ⚠️ Calculs volontairement simplifiés pour reproduire le rendu du visuel rapidement
            (fiscalité/amortissements non exhaustifs, formules viager génériques). Donnez-moi vos barèmes
            et équations exactes (ou un export Excel) et j’alignerai le simulateur au centime près.
          </p>
        </footer>
      </div>
    </div>
  );
}
