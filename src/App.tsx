import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

/* ===========================
    Impression
=========================== */
const printStyles = `
  @media print {
    .no-print { display: none !important; }
    .print-max-w { max-width: none !important; }
    .bg-gradient-to-b { background: #fff !important; }
    .shadow { box-shadow: none !important; border: 1px solid #ccc; }
    .bg-gray-50, .bg-gray-100 { background-color: #f8f8f8 !important; }
  }
`;

/* ===========================
    Utilitaires
=========================== */
// Formats a number to a French locale string.
const fmt = (n, d = 2) =>
  isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—";

/** Robustly converts a French-formatted string (e.g., "1 234,56") to a number. */
const toNum = (v) => {
  let s = (v || "").toString().trim();
  s = s.replace(/\s/g, ""); // Remove spaces
  if (s.includes(",")) {
    s = s.replace(/\./g, ""); // Remove thousand separators
    s = s.replace(",", "."); // Replace comma decimal with a period
  }
  return Number(s) || 0;
};

/** Calculates notary fees for existing properties (~7.5%). */
function calculateNotaryFees(price) {
  if (price <= 0) return 0;
  return price * 0.075;
}

/* ===========================
    Financial Formulas
=========================== */
/** Calculates the monthly annuity payment for a loan. Handles r=0. */
function annuityPayment(capital, ratePct, years) {
  const r = ratePct / 100 / 12; // Monthly interest rate
  const n = Math.round(years * 12); // Total number of payments
  if (n === 0 || capital <= 0) return 0;
  if (r <= 0) return capital / n; // Handle zero interest rate
  return (capital * r) / (1 - Math.pow(1 + r, -n));
}

/** Calculates the present value of an annuity due (payment at the beginning of the period). */
function presentValueAnnuity(monthly, years, discountPct) {
  const r = discountPct / 100 / 12;
  const n = Math.round(years * 12);
  if (n === 0 || monthly === 0) return 0;
  if (r === 0) return monthly * n;
  return monthly * ((1 - Math.pow(1 + r, -n)) / r) * (1 + r);
}

/** Calculates the present value of a growing annuity. */
function pvIndexedAnnuity(monthly, years, discountPct, indexPct) {
  const r = discountPct / 100 / 12;
  const g = indexPct / 100 / 12;
  const n = Math.round(years * 12);
  const q = (1 + g) / (1 + r);
  if (q === 1) return monthly * n;
  return (monthly * (1 - Math.pow(q, n))) / (1 - q);
}

/** Solves for the monthly annuity payment from a target present value. */
function solveMonthlyFromPV(targetPV, years, discountPct, indexPct) {
  const ref = pvIndexedAnnuity(100, years, discountPct, indexPct);
  return ref ? (targetPV / ref) * 100 : 0;
}

/* ===========================
    Simplified INSEE Life Expectancy Table (interpolated)
=========================== */
function getEsperanceVie(age, sexe) {
  const tableF = { 50: 36, 55: 31.5, 60: 27, 65: 22.5, 70: 18.8, 75: 15, 80: 11.5, 85: 8.5, 90: 6.2, 95: 4.5, 100: 3.5 };
  const tableM = { 50: 32, 55: 28, 60: 24, 65: 20, 70: 16.5, 75: 13, 80: 10, 85: 7.5, 90: 5.5, 95: 4, 100: 3 };
  const keys = Object.keys(tableF).map(Number).sort((a, b) => a - b);
  const tbl = sexe.toLowerCase().startsWith("h") ? tableM : tableF;

  if (age <= keys[0]) return tbl[keys[0]];
  if (age >= keys[keys.length - 1]) return tbl[keys[keys.length - 1]];
  for (let i = 1; i < keys.length; i++) {
    if (age <= keys[i]) {
      const a0 = keys[i - 1], a1 = keys[i];
      const y0 = tbl[a0], y1 = tbl[a1];
      // Linear interpolation
      return y0 + ((y1 - y0) * (age - a0)) / (a1 - a0);
    }
  }
  return 0;
}

/* ===========================
    Generic UI Components
=========================== */
const COLORS = ["#3559E0", "#F2C94C", "#E67E22", "#27AE60", "#8E44AD", "#2D9CDB"];

function Section({ title, children }) {
  return (
    <div className="rounded-2xl bg-white shadow p-5">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label, suffix, value, onChange, help, readOnly = false, decimals = 0,
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

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="inline-flex rounded-2xl bg-gray-100 p-1 no-print">
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

function Legend({ data, colors }) {
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
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const displayData = data.filter((d) => d.value > 0);
  if (displayData.length === 0) displayData.push({ name: "Aucune donnée", value: 1 });
  return (
    <div className="flex flex-col items-center">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              dataKey="value" data={displayData}
              innerRadius={50} outerRadius={80} paddingAngle={2}
              fill={displayData.length === 1 && displayData[0].name === "Aucune donnée" ? "#ccc" : undefined}
            >
              {displayData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, _n, p) => [`${fmt(v)} €`, p?.payload?.name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-sm font-medium mt-2">{title}</div>
      <div className="text-lg font-bold text-gray-800">{totalTitle}: {fmt(total)} €</div>
      <Legend data={data} colors={colors} />
    </div>
  );
}

/* ===========================
    Bare Rental Calculator
=========================== */
function LocationNue() {
  const [prix, setPrix] = useState("292000");
  const [travaux, setTravaux] = useState("15000");
  const [apport, setApport] = useState("72000");
  const [taux, setTaux] = useState("2,5");
  const [assurance, setAssurance] = useState("0,35");
  const [duree, setDuree] = useState("20");
  const [loyer, setLoyer] = useState("740");
  const [charges, setCharges] = useState("1200");
  const [taxe, setTaxe] = useState("1300");
  const [tauxImposition, setTauxImposition] = useState("30");

  const vPrix = toNum(prix);
  const vTravaux = toNum(travaux);
  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssurance = toNum(assurance);
  const vDuree = toNum(duree);
  const vTauxImposition = toNum(tauxImposition);

  const fraisNotaire = calculateNotaryFees(vPrix);
  const coutAcquisition = vPrix + vTravaux + fraisNotaire;
  const capital = Math.max(0, vPrix + vTravaux - vApport);

  const mensualite = annuityPayment(capital, vTaux, vDuree);
  const assuranceMens = (capital * (vAssurance / 100)) / 12;
  const totalRemboursementMensuel = mensualite + assuranceMens;

  const coutTotalInterets = Math.max(0, mensualite * vDuree * 12 - capital);
  const coutTotalAssurance = assuranceMens * vDuree * 12;

  const totalChargeMens = (toNum(charges) + toNum(taxe)) / 12 + totalRemboursementMensuel;
  const cashflowBrutMens = toNum(loyer) - totalChargeMens;

  // Fiscalité (simplifiée, 1ère année)
  const revenusAnnuels = toNum(loyer) * 12;
  const chargesAnnuelles = toNum(charges) + toNum(taxe);
  const interetsAnnuelsAn1 = (capital * (vTaux / 100)); // Approx.
  const revenuImposable = Math.max(0, revenusAnnuels - chargesAnnuelles - interetsAnnuelsAn1);
  const impotEstime = revenuImposable * (vTauxImposition / 100);
  const cashflowNetAnnuel = (cashflowBrutMens * 12) - impotEstime;
  const rendementNet = coutAcquisition > 0 ? (cashflowNetAnnuel / (vApport + fraisNotaire)) * 100 : 0;


  const donutCout = [
    { name: "Prix du bien", value: vPrix },
    { name: "Travaux", value: vTravaux },
    { name: "Frais de notaire", value: fraisNotaire },
  ];

  const donutCharge = [
    { name: "Mensualité Prêt (C+I)", value: mensualite },
    { name: "Assurance Emprunteur", value: assuranceMens },
    { name: "Taxe foncière (mens.)", value: toNum(taxe) / 12 },
    { name: "Charges (mens.)", value: toNum(charges) / 12 },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Location nue">
        <div className="space-y-3">
          <Field label="Prix du bien" suffix="€" value={prix} onChange={setPrix} />
          <Field label="Montant des travaux" suffix="€" value={travaux} onChange={setTravaux} />
          <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
          <Field label="Assurance" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} />
          <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Loyer mensuel" suffix="€" value={loyer} onChange={setLoyer} />
          <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} />
          <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
          <Field label="Taux d'imposition (TMI)" suffix="%" value={tauxImposition} onChange={setTauxImposition} help="Tranche Marginale d'Imposition" />
        </div>
      </Section>

      <Section title="Résultats – Location nue">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Cashflow net (après impôt)</div>
            <div className={`font-semibold ${cashflowNetAnnuel < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(cashflowNetAnnuel / 12)} €/mois</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-gray-500">Rendement net estimé</div>
            <div className={`font-semibold ${rendementNet < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(rendementNet)} %</div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
          <div className="text-gray-700 font-semibold mb-1">Coût de l'emprunt sur {fmt(vDuree, 0)} ans</div>
          <div className="flex justify-between"><span className="text-gray-500">Intérêts :</span><span className="font-medium text-red-700">{fmt(coutTotalInterets)} €</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Assurance :</span><span className="font-medium">{fmt(coutTotalAssurance)} €</span></div>
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
            <span className="font-bold">Total (Intérêts + Assurance) :</span>
            <span className="font-bold text-red-700">{fmt(coutTotalInterets + coutTotalAssurance)} €</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <DonutWithTotal data={donutCout} colors={COLORS} title="Coût d'acquisition initial" totalTitle="Total initial" />
          <DonutWithTotal data={donutCharge} colors={COLORS.slice(2)} title="Dépenses récurrentes (mensuelles)" totalTitle="Total mensuel" />
        </div>
      </Section>
    </div>
  );
}

/* ===========================
    Life Annuity (Viager) Calculator
=========================== */
function Viager() {
  const [valeur, setValeur] = useState("292000");
  const [age, setAge] = useState("71");
  const [sexe, setSexe] = useState("Femme");
  const [loyer, setLoyer] = useState("740");
  const [taux, setTaux] = useState("2");
  const [bouquetPct, setBouquetPct] = useState("30");
  const [index, setIndex] = useState("1,1");
  const [charges, setCharges] = useState("1200");
  const [taxe, setTaxe] = useState("1300");
  const [revalorisation, setRevalorisation] = useState("2.5");

  const vV = toNum(valeur);
  const vAge = toNum(age);
  const vLoyer = toNum(loyer);
  const vTaux = toNum(taux);
  const vCharges = toNum(charges);
  const vTaxe = toNum(taxe);
  const vRevalorisation = toNum(revalorisation);

  const years = getEsperanceVie(vAge, sexe);
  const valeurDUH = presentValueAnnuity(vLoyer, years, vTaux); // DUH = Droit d'Usage et d'Habitation
  const valeurOccupee = Math.max(0, vV - valeurDUH);
  const decotePct = vV > 0 ? (valeurDUH / vV) * 100 : 0;

  const vBouquetPct = toNum(bouquetPct);
  const capBouquet = (vBouquetPct / 100) * valeurOccupee;
  const capRente = valeurOccupee - capBouquet;

  const renteMensuelle = solveMonthlyFromPV(capRente, years, vTaux, toNum(index));
  const fraisNotaire = calculateNotaryFees(valeurOccupee);
  const coutTotalRente = renteMensuelle * years * 12;
  const coutMensuelDebirentier = renteMensuelle + (vCharges + vTaxe) / 12;

  // Calcul du rendement
  const coutTotalAcquisition = capBouquet + fraisNotaire + coutTotalRente;
  const valeurReventeFuture = vV * Math.pow(1 + vRevalorisation / 100, years);
  const rendementAnnuelBrut = years > 0 ? (Math.pow(valeurReventeFuture / coutTotalAcquisition, 1 / years) - 1) * 100 : 0;


  const donutCoutTotal = [
    { name: "Valeur DUH (Décote)", value: valeurDUH },
    { name: "Bouquet", value: capBouquet },
    { name: "Capital Rente", value: capRente },
    { name: "Frais de notaire", value: fraisNotaire },
  ];

  const donutCoutMensuels = [
    { name: "Rente mensuelle", value: renteMensuelle },
    { name: "Charges (mens.)", value: vCharges / 12 },
    { name: "Taxe foncière (mens.)", value: vTaxe / 12 },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Viager">
        <div className="space-y-3">
          <Field label="Valeur vénale (marché)" suffix="€" value={valeur} onChange={setValeur} />
          <Field label="Âge du crédirentier" suffix="ans" value={age} onChange={setAge} />
          <div className="flex items-start justify-between gap-3 w-full">
            <div className="w-1/2">
              <div className="text-sm text-gray-700 font-medium">Sexe</div>
            </div>
            <div className="w-1/2">
              <div className="inline-flex rounded-xl bg-gray-100 p-1">
                <button onClick={() => setSexe("Femme")} className={`px-3 py-1 rounded-lg text-sm transition ${sexe === "Femme" ? "bg-white shadow" : "text-gray-600"}`}>Femme</button>
                <button onClick={() => setSexe("Homme")} className={`px-3 py-1 rounded-lg text-sm transition ${sexe === "Homme" ? "bg-white shadow" : "text-gray-600"}`}>Homme</button>
              </div>
            </div>
          </div>
          <Field label="Espérance de vie estimée" suffix="ans" value={years} onChange={() => {}} readOnly={true} decimals={1} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Loyer mensuel estimé" suffix="€/mois" value={loyer} onChange={setLoyer} help="Utilisé pour calculer le DUH" />
          <Field label="Taux d'actualisation" suffix="%/an" value={taux} onChange={setTaux} help="Taux pour le DUH et la rente (souvent 2-4%)" decimals={2} />
          <Field label="Bouquet (sur valeur occupée)" suffix="%" value={bouquetPct} onChange={setBouquetPct} help="Pourcentage de la valeur occupée versé au comptant" />
          <Field label="Taux de révision rente" suffix="%/an" value={index} onChange={setIndex} decimals={2} />
          <Field label="Revalorisation immo. / an" suffix="%/an" value={revalorisation} onChange={setRevalorisation} decimals={2} help="Estimation de la hausse de la valeur du bien" />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Charges (annuelles)" suffix="€/an" value={charges} onChange={setCharges} />
          <Field label="Taxe foncière (annuelle)" suffix="€/an" value={taxe} onChange={setTaxe} />
        </div>
      </Section>

      <Section title="Résultats – Viager">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Décote (DUH)</div><div className="font-semibold">{fmt(decotePct, 1)} %</div></div>
          <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Montant du Bouquet</div><div className="font-semibold">{fmt(capBouquet)} €</div></div>
          <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Rente mensuelle</div><div className="font-semibold">{fmt(renteMensuelle)} €/mois</div></div>
          <div className="bg-blue-50 text-blue-800 p-3 rounded-xl"><div className="text-blue-600">Rendement annuel brut</div><div className="font-semibold">{fmt(rendementAnnuelBrut, 2)} %</div></div>
        </div>

        <div className="bg-gray-50 p-3 rounded-xl text-sm mt-3">
          <div className="text-gray-700 font-semibold mb-1">Projection à terme ({fmt(years, 1)} ans)</div>
          <div className="flex justify-between"><span className="text-gray-500">Coût total (bouquet + frais + rentes) :</span><span className="font-medium text-red-700">{fmt(coutTotalAcquisition)} €</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Valeur de revente estimée :</span><span className="font-medium text-green-700">{fmt(valeurReventeFuture)} €</span></div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <DonutWithTotal data={donutCoutTotal} colors={COLORS} title="Répartition de la Valeur Vénale" totalTitle="Total Vénale + Frais" />
          <DonutWithTotal data={donutCoutMensuels} colors={COLORS.slice(1)} title="Dépenses récurrentes (mensuelles)" totalTitle="Total mensuel" />
        </div>
      </Section>
    </div>
  );
}

/* ===========================
    Commercial Property Calculator
=========================== */
function LocalCommercial() {
  // Operating assumptions
  const [prix, setPrix] = useState("300000");
  const [loyerAnnuel, setLoyerAnnuel] = useState("24000");
  const [vacancePct, setVacancePct] = useState("6");
  const [chargesProp, setChargesProp] = useState("1500");
  const [taxeFonciere, setTaxeFonciere] = useState("2500");
  const [travauxAnn, setTravauxAnn] = useState("1000");

  // Financing
  const [apport, setApport] = useState("60000");
  const [taux, setTaux] = useState("3,2");
  const [assurance, setAssurance] = useState("0,30");
  const [duree, setDuree] = useState("20");

  const vPrix = toNum(prix);
  const vLoyerAnnuel = toNum(loyerAnnuel);
  const vVac = toNum(vacancePct) / 100;
  const vCharges = toNum(chargesProp);
  const vTF = toNum(taxeFonciere);
  const vCapex = toNum(travauxAnn);

  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssur = toNum(assurance);
  const vDuree = toNum(duree);

  const fraisNotaire = calculateNotaryFees(vPrix);
  const loyerEffectif = vLoyerAnnuel * (1 - vVac);
  const chargesAnnuelles = vCharges + vTF + vCapex;
  const revenuNetAvantDette = Math.max(0, loyerEffectif - chargesAnnuelles);
  const rendementNet = vPrix > 0 ? (revenuNetAvantDette / vPrix) * 100 : 0;

  // Loan
  const capital = Math.max(0, vPrix + fraisNotaire - vApport);
  const mensualite = annuityPayment(capital, vTaux, vDuree);
  const assuranceMens = (capital * (vAssur / 100)) / 12;
  const serviceDeLaDetteMens = mensualite + assuranceMens;
  const serviceDeLaDetteAnn = serviceDeLaDetteMens * 12;

  const cashflowAnnuel = revenuNetAvantDette - serviceDeLaDetteAnn;
  const cashflowMens = cashflowAnnuel / 12;

  const donutAcq = [
    { name: "Apport", value: vApport },
    { name: "Prêt (net vendeur + frais)", value: capital },
    { name: "Frais de notaire", value: fraisNotaire },
  ];

  const donutCharges = [
    { name: "Vacance (perte loyers)", value: vLoyerAnnuel - loyerEffectif },
    { name: "Charges propriétaire", value: vCharges },
    { name: "Taxe foncière", value: vTF },
    { name: "CAPEX (travaux)", value: vCapex },
    { name: "Dette (C+I)", value: mensualite * 12 },
    { name: "Assurance emprunteur", value: assuranceMens * 12 },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – Local commercial (avec financement)">
        <div className="space-y-3">
          <Field label="Prix du local" suffix="€" value={prix} onChange={setPrix} />
          <Field label="Loyer annuel (bail)" suffix="€/an" value={loyerAnnuel} onChange={setLoyerAnnuel} />
          <Field label="Vacance/impayés" suffix="%" value={vacancePct} onChange={setVacancePct} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Charges propriétaire (annuelles)" suffix="€" value={chargesProp} onChange={setChargesProp} />
          <Field label="Taxe foncière" suffix="€" value={taxeFonciere} onChange={setTaxeFonciere} />
          <Field label="CAPEX lissé (travaux)" suffix="€" value={travauxAnn} onChange={setTravauxAnn} />
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
          <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
          <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} />
          <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
        </div>
      </Section>

      <Section title="Résultats – Local commercial">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Loyer effectif</div><div className="font-semibold">{fmt(loyerEffectif)} €/an</div></div>
          <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Revenu net (avant dette)</div><div className="font-semibold">{fmt(revenuNetAvantDette)} €/an</div></div>
          <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Rendement net</div><div className="font-semibold">{fmt(rendementNet, 2)} %</div></div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
          <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Service de la dette</div><div className="font-semibold">{fmt(serviceDeLaDetteAnn)} €/an</div></div>
          <div className={`bg-gray-50 p-3 rounded-xl ${cashflowAnnuel < 0 ? "text-red-700" : "text-green-700"}`}>
            <div className="text-gray-500">Cashflow net</div>
            <div className="font-semibold">{fmt(cashflowAnnuel)} €/an ({fmt(cashflowMens)} €/mois)</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <DonutWithTotal data={donutAcq} colors={COLORS} title="Structure d'acquisition" totalTitle="Total financé" />
          <DonutWithTotal data={donutCharges} colors={COLORS.slice(1)} title="Déductions/charges annuelles" totalTitle="Total charges" />
        </div>
      </Section>
    </div>
  );
}

/* ===========================
    SCPI Calculator
=========================== */
function SCPI() {
  const [type, setType] = useState("Pleine Propriété");

  // Common
  const [tauxImposition, setTauxImposition] = useState("30");
  const [apport, setApport] = useState("10000");
  const [taux, setTaux] = useState("3,1");
  const [assurance, setAssurance] = useState("0,30");
  const [duree, setDuree] = useState("15");

  // Pleine Propriété
  const [montant, setMontant] = useState("50000");
  const [td, setTd] = useState("5");
  const [fraisSous, setFraisSous] = useState("8");
  const [delaiJouissanceMois, setDelaiJouissanceMois] = useState("3");

  // Nue-Propriété
  const [montantNP, setMontantNP] = useState("50000");
  const [decote, setDecote] = useState("40");
  const [dureeNP, setDureeNP] = useState("10");

  // Common calculations
  const vApport = toNum(apport);
  const vTaux = toNum(taux);
  const vAssur = toNum(assurance);
  const vDuree = toNum(duree);
  const vTauxImposition = toNum(tauxImposition) / 100;

  // Pleine Propriété calculations
  const vMontant = toNum(montant);
  const vTD = toNum(td) / 100;
  const vFraisSous = toNum(fraisSous) / 100;
  const vDelai = Math.round(toNum(delaiJouissanceMois));
  const capitalNetInvesti = vMontant / (1 + vFraisSous);
  const capitalPP = Math.max(0, vMontant - vApport);
  const mensualitePP = annuityPayment(capitalPP, vTaux, vDuree);
  const assuranceMensPP = (capitalPP * (vAssur / 100)) / 12;
  const detteMensPP = mensualitePP + assuranceMensPP;
  const distributionBrutePleine = capitalNetInvesti * vTD;
  const distributionNettePleine = distributionBrutePleine;
  const cashflowPleinBrut = distributionNettePleine - (detteMensPP * 12);
  const impotPP = distributionNettePleine * vTauxImposition;
  const cashflowPleinNet = cashflowPleinBrut - impotPP;
  const donutInvest = [ { name: "Apport", value: vApport }, { name: "Dette", value: capitalPP } ];

  // Nue-Propriété calculations
  const vMontantNP = toNum(montantNP);
  const vDecote = toNum(decote) / 100;
  const vDureeNP = toNum(dureeNP);
  const prixAchatDecote = vMontantNP * (1 - vDecote);
  const capitalNP = Math.max(0, prixAchatDecote - vApport);
  const mensualiteNP = annuityPayment(capitalNP, vTaux, vDuree);
  const assuranceMensNP = (capitalNP * (vAssur / 100)) / 12;
  const detteMensNP = mensualiteNP + assuranceMensNP;
  const cashflowNP = -detteMensNP * 12;
  const rendementNP = vDureeNP > 0 ? (Math.pow(vMontantNP / prixAchatDecote, 1 / vDureeNP) - 1) * 100 : 0;
  const donutInvestNP = [ { name: "Apport", value: vApport }, { name: "Dette", value: capitalNP } ];

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Section title="Paramètres – SCPI">
        <div className="text-center mb-4">
          <Tabs tabs={["Pleine Propriété", "Nue Propriété"]} active={type} onChange={setType} />
        </div>
        <div className="space-y-3">
          {type === "Pleine Propriété" ? (
            <>
              <Field label="Montant déboursé (brut)" suffix="€" value={montant} onChange={setMontant} />
              <Field label="Taux de distribution (TD)" suffix="%/an" value={td} onChange={setTd} decimals={2} />
              <Field label="Frais de souscription" suffix="%" value={fraisSous} onChange={setFraisSous} decimals={2} />
              <Field label="Délai de jouissance" suffix="mois" value={delaiJouissanceMois} onChange={setDelaiJouissanceMois} />
            </>
          ) : (
            <>
              <Field label="Valeur pleine propriété" suffix="€" value={montantNP} onChange={setMontantNP} />
              <Field label="Décote" suffix="%" value={decote} onChange={setDecote} decimals={2} />
              <Field label="Durée du démembrement" suffix="ans" value={dureeNP} onChange={setDureeNP} />
            </>
          )}
          <div className="h-0.5 bg-gray-100 my-4"></div>
          <h4 className="font-semibold text-gray-600">Financement & Fiscalité</h4>
          <Field label="Apport" suffix="€" value={apport} onChange={setApport} />
          <Field label="Taux du prêt" suffix="%/an" value={taux} onChange={setTaux} decimals={2} />
          <Field label="Assurance emprunteur" suffix="%/an" value={assurance} onChange={setAssurance} decimals={2} />
          <Field label="Durée du prêt" suffix="ans" value={duree} onChange={setDuree} />
          {type === "Pleine Propriété" && <Field label="Taux d'imposition (TMI)" suffix="%" value={tauxImposition} onChange={setTauxImposition} />}
        </div>
      </Section>

      <Section title="Résultats – SCPI">
        {type === "Pleine Propriété" ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Distribution annuelle brute</div><div className="font-semibold">{fmt(distributionNettePleine)} €</div></div>
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Mensualité (C+I+A)</div><div className="font-semibold">{fmt(detteMensPP)} €/mois</div></div>
              <div className={`p-3 rounded-xl ${cashflowPleinBrut < 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}><div className="opacity-75">Cashflow annuel (brut)</div><div className="font-semibold">{fmt(cashflowPleinBrut)} €</div></div>
              <div className={`p-3 rounded-xl ${cashflowPleinNet < 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}><div className="opacity-75">Cashflow annuel (net)</div><div className="font-semibold">{fmt(cashflowPleinNet)} €</div></div>
            </div>
            <div className="mt-4"><DonutWithTotal data={donutInvest} colors={COLORS} title="Structure de financement" totalTitle="Total déboursé" /></div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl"><div className="text-gray-500">Prix d'achat (décoté)</div><div className="font-semibold">{fmt(prixAchatDecote)} €</div></div>
              <div className={`bg-blue-50 text-blue-800 p-3 rounded-xl`}><div className="opacity-75">Rendement annuel</div><div className="font-semibold">{fmt(rendementNP, 2)} %</div></div>
              <div className="bg-red-50 text-red-800 p-3 rounded-xl col-span-2"><div className="opacity-75">Cashflow annuel (pendant démembrement)</div><div className="font-semibold">{fmt(cashflowNP)} €</div></div>
            </div>
            <div className="mt-4"><DonutWithTotal data={donutInvestNP} colors={COLORS} title="Structure de financement" totalTitle="Total déboursé" /></div>
          </>
        )}
      </Section>
    </div>
  );
}


/* ===========================
    Main App Component
=========================== */
export default function App() {
  const [tab, setTab] = useState("Viager");

  useEffect(() => {
    document.title = `Simulateur ${tab} – Viager & Location`;
  }, [tab]);

  const handlePrint = () => window.print();

  return (
    <>
      <style>{printStyles}</style>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto p-6 space-y-6 print-max-w">

          {/* HERO + CTA */}
          <header className="mt-8 text-center px-4 no-print">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Comparez vos investissements</h1>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              Outil gratuit et indépendant pour évaluer la rentabilité du <strong>viager</strong>, de la <strong>location</strong>, d’un <strong>local commercial</strong> ou des <strong>SCPI</strong>.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a href="#simulateur" className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition">Calculer ma rentabilité</a>
              <a href="#apropos" className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition">En savoir plus</a>
            </div>
          </header>
          
          <div id="simulateur" className="pt-8">
            {/* Actions bar + tabs */}
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Simulateur Viager & Location</h2>
                <p className="text-sm text-gray-500">Comparateur interactif avec frais de notaire</p>
              </div>
              <div className="flex items-center gap-3 mt-4 sm:mt-0">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow flex items-center no-print"
                >
                  {/* FIX: Completed the SVG path data for the printer icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v4H6z"/>
                  </svg>
                  Imprimer
                </button>
              </div>
            </header>

            <div className="text-center mb-6">
              <Tabs
                tabs={["Location nue", "Viager", "Local commercial", "SCPI"]}
                active={tab}
                onChange={setTab}
              />
            </div>

            {tab === "Location nue" && <LocationNue />}
            {tab === "Viager" && <Viager />}
            {tab === "Local commercial" && <LocalCommercial />}
            {tab === "SCPI" && <SCPI />}
          </div>
        </div>
      </div>
    </>
  );
}

