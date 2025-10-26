import React, { useEffect, useMemo, useState } from "react";
import { Helmet, HelmetProvider } from "https://esm.sh/react-helmet-async";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend as RLegend
} from "recharts";

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
        <div className="text-sm text-gray-700 font-medium flex items-center gap-1">
          <span>{label}</span>
          {help && (
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-[10px] cursor-help select-none"
              title={help}
              aria-label={`Aide: ${help}`}
            >i</span>
          )}
        </div>
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

function annuityPayment(capital: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const n = Math.round(years * 12);
  if (n === 0 || capital === 0) return 0;
  if (r <= 0) return capital / n;
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

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

type CreditState = {
  capital: string; taux: string; assurance: string; duree: string;
};

function computeCreditSchedule(vCap: number, vTaux: number, vAss: number, vDur: number) {
  const rows: { mois: number; echeance: number; interets: number; assurance: number; principal: number; crd: number; cumInt: number; cumAss: number; }[] = [];
  let crd = vCap;
  const r = vTaux / 100 / 12;
  const mensu = annuityPayment(vCap, vTaux, vDur);
  const totalMonths = Math.round(vDur * 12);
  let cumI = 0, cumA = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const interets = r > 0 ? crd * r : 0;
    let principal = mensu - interets;
    if (principal < 0) principal = 0;
    if (m === totalMonths) principal = crd;
    const assMensDyn = crd * (vAss / 100) / 12;
    const echeance = mensu + assMensDyn;
    const nextCrd = Math.max(0, crd - principal);
    cumI += interets;
    cumA += assMensDyn;
    rows.push({ mois: m, echeance, interets, assurance: assMensDyn, principal, crd: nextCrd, cumInt: cumI, cumAss: cumA });
    crd = nextCrd;
  }
  return rows;
}

function CreditImmo({ shared, onShare }: { shared?: URLSearchParams; onShare?: (url: string) => void; }) {
  const [state, setState] = useLocalStore<CreditState>("credit:state", {
    capital: shared?.get("capital") ?? "250000",
    taux: shared?.get("taux") ?? "3,20",
    assurance: shared?.get("assurance") ?? "0,30",
    duree: shared?.get("duree") ?? "25",
  });

  const [stateB, setStateB] = useLocalStore<CreditState>("credit:stateB", {
    capital: shared?.get("capitalB") ?? state.capital,
    taux: shared?.get("tauxB") ?? state.taux,
    assurance: shared?.get("assuranceB") ?? state.assurance,
    duree: shared?.get("dureeB") ?? state.duree,
  });

  useEffect(() => {
    const url = updateShareURL("Crédit immobilier", {
      capital: state.capital, taux: state.taux, assurance: state.assurance, duree: state.duree,
      capitalB: stateB.capital, tauxB: stateB.taux, assuranceB: stateB.assurance, dureeB: stateB.duree,
    });
    onShare?.(url);
  }, [state, stateB]);

  const vCap = toNum(state.capital);
  const vTaux = toNum(state.taux);
  const vAss = toNum(state.assurance);
  const vDur = toNum(state.duree);

  const vCapB = toNum(stateB.capital);
  const vTauxB = toNum(stateB.taux);
  const vAssB = toNum(stateB.assurance);
  const vDurB = toNum(stateB.duree);

  const mensuHorsAss = annuityPayment(vCap, vTaux, vDur);
  const assMensM1 = (vCap * (vAss / 100)) / 12;
  const mensuTot = mensuHorsAss + assMensM1;
  const n = vDur * 12;
  const schedule = useMemo(() => computeCreditSchedule(vCap, vTaux, vAss, vDur), [vCap, vTaux, vAss, vDur]);
  const totalInterets = Math.max(0, mensuHorsAss * n - vCap);
  const totalAssurance = schedule.reduce((s, r) => s + r.assurance, 0);
  const coutTotal = totalInterets + totalAssurance;

  const mensuHorsAssB = annuityPayment(vCapB, vTauxB, vDurB);
  const assMensM1B = (vCapB * (vAssB / 100)) / 12;
  const mensuTotB = mensuHorsAssB + assMensM1B;
  const nB = vDurB * 12;
  const scheduleB = useMemo(() => computeCreditSchedule(vCapB, vTauxB, vAssB, vDurB), [vCapB, vTauxB, vAssB, vDurB]);
  const totalInteretsB = Math.max(0, mensuHorsAssB * nB - vCapB);
  const totalAssuranceB = scheduleB.reduce((s, r) => s + r.assurance, 0);
  const coutTotalB = totalInteretsB + totalAssuranceB;

  const [showTable, setShowTable] = useState(false);
  const exportCSV = (rows: typeof schedule, tag = "A") => {
    const header = ["Mois","Échéance totale","Capital remboursé","Intérêts","Assurance","Capital restant dû"];
    const lines = [header.join(";")];
    rows.forEach(row => {
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
    a.download = `amortissement_${tag}_${vCap}€_${vTaux}%_${vDur}ans.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const donutA = [
    { name: "Intérêts", value: totalInterets },
    { name: "Assurance", value: totalAssurance },
    { name: "Capital", value: vCap },
  ];
  const donutB = [
    { name: "Intérêts", value: totalInteretsB },
    { name: "Assurance", value: totalAssuranceB },
    { name: "Capital", value: vCapB },
  ];

  return (
    <>
      <Helmet>
        <title>Crédit immobilier – Comparateur A/B + Assurance sur CRD</title>
        <meta name="description" content="Comparez deux crédits : mensualités, coût total, assurance sur CRD, export CSV et lien partageable." />
      </Helmet>

      <div className="flex items-center justify-between gap-3 no-print">
        <div className="text-sm text-gray-500">Lien de partage (mis à jour automatiquement)</div>
        <button
          onClick={() => navigator.clipboard.writeText(updateShareURL("Crédit immobilier", {
            capital: state.capital, taux: state.taux, assurance: state.assurance, duree: state.duree,
            capitalB: stateB.capital, tauxB: stateB.taux, assuranceB: stateB.assurance, dureeB: stateB.duree,
          }))}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 shadow"
        >
          Copier le lien de cette simulation
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-4">
        <Section title="Scénario A – Paramètres">
          <div className="space-y-3">
            <Field id="capA" label="Capital emprunté" suffix="€" value={state.capital} onChange={(v) => setState({ ...state, capital: v })} />
            <Field id="tauxA" label="Taux nominal" suffix="%/an" value={state.taux} onChange={(v) => setState({ ...state, taux: v })} help="Intérêts du prêt. Sert à calculer la mensualité (hors assurance) sur la base du capital restant dû." />
            <Field id="assA" label="Assurance emprunteur" suffix="%/an" value={state.assurance} onChange={(v) => setState({ ...state, assurance: v })} help="Dans ce simulateur : calculée chaque mois sur le capital restant dû (CRD). La tuile affiche la prime du mois 1 pour lisibilité." />
            <Field id="durA" label="Durée" suffix="ans" value={state.duree} onChange={(v) => setState({ ...state, duree: v })} help="Durée totale du crédit en années." />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité (hors assur.)</div><div className="font-semibold">{fmt(mensuHorsAss)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Assurance (mois 1)</div><div className="font-semibold">{fmt(assMensM1)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité totale</div><div className="font-semibold">{fmt(mensuTot)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Coût total (int.+ass.)</div><div className="font-semibold">{fmt(coutTotal)} €</div></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donutA} colors={COLORS} title="Décomposition du prêt (A)" totalTitle="Total (capital+coûts)" />
            <div className="bg-white rounded-2xl shadow p-4 text-sm">
              <div className="font-semibold mb-2">Actions</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStateB(state)} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Copier vers B</button>
                <button onClick={() => setShowTable(s => !s)} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">{showTable ? "Masquer le tableau" : "Afficher le tableau"}</button>
                <button onClick={() => exportCSV(schedule, "A")} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Exporter CSV (A)</button>
              </div>
            </div>
          </div>

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

        <Section title="Scénario B – Paramètres">
          <div className="space-y-3">
            <Field id="capB" label="Capital emprunté" suffix="€" value={stateB.capital} onChange={(v) => setStateB({ ...stateB, capital: v })} />
            <Field id="tauxB" label="Taux nominal" suffix="%/an" value={stateB.taux} onChange={(v) => setStateB({ ...stateB, taux: v })} help="Intérêts du prêt. Sert à calculer la mensualité (hors assurance)." />
            <Field id="assB" label="Assurance emprunteur" suffix="%/an" value={stateB.assurance} onChange={(v) => setStateB({ ...stateB, assurance: v })} help="Calculée sur le CRD (décroissante). La tuile affiche la prime du mois 1." />
            <Field id="durB" label="Durée" suffix="ans" value={stateB.duree} onChange={(v) => setStateB({ ...stateB, duree: v })} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité (hors assur.)</div><div className="font-semibold">{fmt(mensuHorsAssB)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Assurance (mois 1)</div><div className="font-semibold">{fmt(assMensM1B)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité totale</div><div className="font-semibold">{fmt(mensuTotB)} €/mois</div></div>
            <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Coût total (int.+ass.)</div><div className="font-semibold">{fmt(coutTotalB)} €</div></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <DonutWithTotal data={donutB} colors={COLORS} title="Décomposition du prêt (B)" totalTitle="Total (capital+coûts)" />
            <div className="bg-white rounded-2xl shadow p-4 text-sm">
              <div className="font-semibold mb-2">Actions</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setState(stateB)} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Copier vers A</button>
                <button onClick={() => exportCSV(scheduleB, "B")} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Exporter CSV (B)</button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

function GraphiqueCredit({ shared }: { shared?: URLSearchParams; }) {
  const [state] = useLocalStore<CreditState>("credit:state", {
    capital: shared?.get("capital") ?? "250000",
    taux: shared?.get("taux") ?? "3,20",
    assurance: shared?.get("assurance") ?? "0,30",
    duree: shared?.get("duree") ?? "25",
  });

  const vCap = toNum(state.capital);
  const vTaux = toNum(state.taux);
  const vAss = toNum(state.assurance);
  const vDur = toNum(state.duree);

  const schedule = useMemo(() => computeCreditSchedule(vCap, vTaux, vAss, vDur), [vCap, vTaux, vAss, vDur]);
  const data = schedule.map(r => ({ mois: r.mois, CRD: r.crd, "Intérêts cumulés": r.cumInt, "Assurance cumulée": r.cumAss }));

  return (
    <>
      <Helmet>
        <title>Crédit – Graphique d'évolution</title>
        <meta name="description" content="Courbes du capital restant dû, des intérêts cumulés et de l'assurance cumulée." />
      </Helmet>

      <Section title="Évolution du crédit dans le temps">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <RTooltip formatter={(v: number) => `${fmt(v)} €`} />
              <RLegend />
              <Line type="monotone" dataKey="CRD" dot={false} />
              <Line type="monotone" dataKey="Intérêts cumulés" dot={false} />
              <Line type="monotone" dataKey="Assurance cumulée" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          * Assurance calculée chaque mois sur le capital restant dû. Les courbes “cumulées” additionnent mois après mois.
        </p>
      </Section>
    </>
  );
}

function CommandementsInvestisseur() {
  return (
    <Section title="Les 10 commandements de l’investisseur (rappel)">
      <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
        <li>Vérifie le prix/M² avec plusieurs sources (DVF, baromètres, historiques).</li>
        <li>Compare les taux et l’assurance (TAEA), fais au moins 2 offres bancaires.</li>
        <li>Lis le PLU et les servitudes (cadastre, urbanisme).</li>
        <li>Projette tes charges CAPEX et taxe foncière.</li>
        <li>Teste ton cashflow avec plusieurs scénarios (sensibilité aux taux).</li>
        <li>Prévois une épargne de sécurité.</li>
        <li>Anticipe la fiscalité réelle (TMI, PS, régime).</li>
        <li>Documente-toi sur les garanties d’assurance (DC/PTIA/ITT/IPT/IPP).</li>
        <li>Challenge l’agent/le vendeur avec des justificatifs sourcés.</li>
        <li>Fais relire ton dossier (notaire, courtier, mentor).</li>
      </ul>
    </Section>
  );
}

export default function App() {
  const urlInit = readURLParams();
  const [tab, setTab] = useLocalStore<string>("app:activeTab", urlInit.tab || "Crédit immobilier");
  const [shareURL, setShareURL] = useState<string>("");

  useEffect(() => {
    if (urlInit.tab && urlInit.tab !== tab) setTab(urlInit.tab);
  }, []);

  const tabs = ["Crédit immobilier", "Graphique", "10 Commandements"];

  const render = () => {
    switch (tab) {
      case "Crédit immobilier": return <CreditImmo shared={urlInit.params} onShare={setShareURL} />;
      case "Graphique": return <GraphiqueCredit shared={urlInit.params} />;
      case "10 Commandements": return <CommandementsInvestisseur />;
      default: return null;
    }
  };

  const webAppJsonLd = {
    "@context":"https://schema.org","@type":"WebApplication",
    "name":"Simulateur Crédit Immobilier – A/B + Graphique",
    "url": location?.href || "",
    "applicationCategory":"FinanceApplication","operatingSystem":"Any",
    "offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"}
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Simulateur Crédit Immobilier – Comparateur A/B + Graphique</title>
        <meta name="description" content="Comparez deux crédits et visualisez l'évolution du capital, des intérêts et de l'assurance dans le temps. Lien partageable et sauvegarde automatique." />
        <script type="application/ld+json">{JSON.stringify(webAppJsonLd)}</script>
      </Helmet>
      <style>{printStyles}</style>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6 space-y-6 print-max-w">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <div>
              <h1 className="text-2xl font-bold">Simulateur Crédit – Pro</h1>
              <p className="text-sm text-gray-500">Assurance sur CRD • A/B • Graphique • Lien partageable</p>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
              <div className="text-xs text-gray-500 truncate max-w-xs md:max-w-md" title={shareURL || "Le lien apparaîtra après une modification"}>
                {shareURL ? shareURL : "Lien de partage prêt après modification."}
              </div>
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
            </div>
          </header>

          {render()}

          <footer className="text-xs text-gray-400 text-center mt-8 no-print">
            Données indicatives — calculs simplifiés. Export CSV disponible.
          </footer>
        </div>
      </div>
    </HelmetProvider>
  );
}
