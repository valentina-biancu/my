"use client";

import { useEffect, useMemo, useState } from "react";

type Stage = "known" | "unknown" | "discuss" | "action" | "results";
type Result = {
  id: string;
  date: string;
  value: string;
  unit: string;
  source: string;
  context: string;
  reviewed: boolean;
};
type Plan = {
  id: string;
  stage: Stage;
  title: string;
  detail: string;
  source: string;
  date: string;
  owner?: string;
  agreedWith?: string;
  startDate?: string;
  measure?: string;
  baseline?: string;
  cadence?: string;
  reviewDate?: string;
  results: Result[];
};
type CaseFile = { id: string; name: string; relationship: string; plans: Plan[] };
type AccessState = "checking" | "required" | "authorised" | "unavailable";

const stages: { id: Stage; label: string; helper: string }[] = [
  { id: "known", label: "Known", helper: "Bring forward the facts and decisions relevant to prevention." },
  { id: "unknown", label: "Unknown", helper: "Keep gaps visible before an action is treated as settled." },
  { id: "discuss", label: "To discuss", helper: "Prepare the questions that need health-team input." },
  { id: "action", label: "Next action", helper: "Record an agreed action, its owner, measures and review point." },
  { id: "results", label: "Results", helper: "Record and report results, then return reviewed information to Known." },
];

const starter: CaseFile = { id: "case-1", name: "My prevention record", relationship: "Me", plans: [] };
const uid = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export default function Home() {
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { authorised?: boolean; error?: string };
        if (data.authorised) setAccessState("authorised");
        else if (response.status === 503) {
          setAccessError(data.error ?? "Access verification is unavailable.");
          setAccessState("unavailable");
        } else setAccessState("required");
      })
      .catch(() => {
        setAccessError("We could not check access. Check your connection and try again.");
        setAccessState("unavailable");
      });
  }, []);

  if (accessState === "checking") return <main className="loading">Checking access…</main>;
  if (accessState !== "authorised") {
    return <AccessGate state={accessState} initialError={accessError} onAuthorised={() => setAccessState("authorised")} />;
  }
  return <PreventApp />;
}

function AccessGate({ state, initialError, onAuthorised }: { state: AccessState; initialError: string; onAuthorised: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return setError("Enter your Prevent access code.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { valid?: boolean; error?: string };
      if (response.ok && data.valid) onAuthorised();
      else setError(data.error ?? "That access code was not recognised.");
    } catch {
      setError("We could not verify the code. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate-page">
      <header className="gate-brand"><span className="brand-mark" aria-hidden="true">♥</span><span><b>HeartFirst</b><small>Heart Risk Navigator</small></span></header>
      <main className="gate-card">
        <p className="eyebrow">Private product access</p>
        <h1>Open Prevent</h1>
        <p>Use the access code provided with Prevent. Your health information is not used to verify access.</p>
        {state === "unavailable" ? (
          <div className="gate-error" role="alert"><b>Access check unavailable</b><span>{error}</span></div>
        ) : (
          <form onSubmit={submit} className="gate-form">
            <label htmlFor="access-code">Access code</label>
            <input id="access-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="HF-XXXX-XXXX" />
            {error && <p className="field-error" role="alert">{error}</p>}
            <button className="primary" disabled={busy}>{busy ? "Checking…" : "Unlock Prevent"}</button>
          </form>
        )}
        <p className="gate-help">Local testing code: <code>PREVENT-LOCAL</code></p>
      </main>
    </div>
  );
}

function PreventApp() {
  const [cases, setCases] = useState<CaseFile[]>([starter]);
  const [caseId, setCaseId] = useState(starter.id);
  const [stage, setStage] = useState<Stage>("known");
  const [ready, setReady] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showPack, setShowPack] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("heartfirst-prevent-v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { cases: CaseFile[]; caseId: string; theme?: "light" | "dark" };
        if (parsed.cases?.length) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCases(parsed.cases);
          setCaseId(parsed.cases.some((c) => c.id === parsed.caseId) ? parsed.caseId : parsed.cases[0].id);
          if (parsed.theme) setTheme(parsed.theme);
        }
      } catch {}
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("heartfirst-prevent-v1", JSON.stringify({ cases, caseId, theme }));
  }, [cases, caseId, theme, ready]);

  const active = cases.find((c) => c.id === caseId) ?? cases[0];
  const grouped = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, active.plans.filter((p) => p.stage === s.id)])), [active]);
  const counts = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s.id === "results" ? active.plans.reduce((n, p) => n + p.results.length, 0) : grouped[s.id].length])), [active, grouped]);

  function updateActive(fn: (file: CaseFile) => CaseFile) {
    setCases((all) => all.map((file) => file.id === caseId ? fn(file) : file));
    setNotice("Saved on this device");
    setTimeout(() => setNotice(""), 1800);
  }

  function addPlan(plan: Omit<Plan, "id" | "stage" | "results">) {
    updateActive((file) => ({ ...file, plans: [...file.plans, { ...plan, id: uid(), stage, results: [] }] }));
  }

  function addResult(planId: string, result: Omit<Result, "id" | "reviewed">) {
    updateActive((file) => ({ ...file, plans: file.plans.map((p) => p.id === planId ? { ...p, results: [...p.results, { ...result, id: uid(), reviewed: false }] } : p) }));
  }

  function markReviewed(planId: string, resultId: string) {
    updateActive((file) => ({
      ...file,
      plans: file.plans.map((p) => p.id === planId ? { ...p, results: p.results.map((r) => r.id === resultId ? { ...r, reviewed: true } : r) } : p),
    }));
  }

  function movePlan(id: string, next: Stage) {
    updateActive((file) => ({ ...file, plans: file.plans.map((p) => p.id === id ? { ...p, stage: next } : p) }));
  }

  function removePlan(id: string) {
    updateActive((file) => ({ ...file, plans: file.plans.filter((p) => p.id !== id) }));
  }

  function addPerson(name: string, relationship: string) {
    const file = { id: uid(), name, relationship, plans: [] };
    setCases((all) => [...all, file]);
    setCaseId(file.id);
    setShowAddPerson(false);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), cases }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prevent-heart-risk-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <main className="loading">Opening Prevent…</main>;
  const stageInfo = stages.find((s) => s.id === stage)!;

  return (
    <div data-theme={theme}>
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Prevent heart risk home"><span className="brand-mark" aria-hidden="true">♥</span><span><b>HeartFirst</b><small>Heart Risk Navigator</small></span></a>
        <div className="top-actions">
          {notice && <span className="save-notice" role="status">{notice}</span>}
          <button className="icon-button" onClick={() => setShowHelp(true)} aria-label="Help">?</button>
          <button className="icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Change theme">{theme === "light" ? "☾" : "☀"}</button>
        </div>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          <div><p className="eyebrow">Prevent heart risk</p><h1>Turn agreement into sustained action.</h1><p className="sidebar-copy">Record what was agreed, follow it over time and take useful results back to your health team.</p></div>
          <label className="case-label" htmlFor="case-select">Whose information?</label>
          <select id="case-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>{cases.map((file) => <option key={file.id} value={file.id}>{file.name}</option>)}</select>
          <button className="text-button" onClick={() => setShowAddPerson(true)}>+ Add someone you love</button>
          <nav aria-label="Prevent stages">
            {stages.map((s, index) => (
              <button key={s.id} className={`stage-link ${stage === s.id ? "active" : ""}`} onClick={() => { setStage(s.id); setShowPack(false); }}>
                <span className="stage-number">{index + 1}</span><span><b>{s.label}</b><small>{counts[s.id]} record{counts[s.id] === 1 ? "" : "s"}</small></span>
              </button>
            ))}
          </nav>
          <button className={`pack-button ${showPack ? "active" : ""}`} onClick={() => setShowPack(true)}>View Prevent Take-Forward Pack</button>
          <div className="privacy-note"><b>Saved on this device</b><span>No health information is sent to HeartFirst in this first-pass app.</span></div>
        </aside>

        <main id="main" className="workspace">
          {showPack ? <TakeForwardPack file={active} onClose={() => setShowPack(false)} onPrint={() => window.print()} /> : (
            <>
              <div className="workspace-heading"><div><p className="eyebrow">Stage {stages.findIndex((s) => s.id === stage) + 1} of 5</p><h2>{stageInfo.label}</h2><p>{stageInfo.helper}</p></div><div className="loop-key" aria-label="Shared Navigator loop"><span>Known</span><b>→</b><span>Unknown</span><b>→</b><span>To discuss</span><b>→</b><span>Next action</span><b>→</b><span>Results</span></div></div>
              {stage === "results" ? <ResultForm plans={active.plans.filter((p) => p.stage === "action" || p.results.length)} onAdd={addResult} /> : <PlanForm key={`${caseId}-${stage}`} stage={stage} onAdd={addPlan} />}
              <section className="records-section" aria-labelledby="records-title">
                <div className="section-heading"><h3 id="records-title">{active.name}: {stageInfo.label}</h3><span>{counts[stage]} item{counts[stage] === 1 ? "" : "s"}</span></div>
                {stage === "results" ? <ResultsList plans={active.plans} onReviewed={markReviewed} /> : grouped[stage].length === 0 ? (
                  <div className="empty-state"><span>○</span><p>No items recorded here yet.</p><small>Add only what is useful. You can return later.</small></div>
                ) : <div className="record-grid">{grouped[stage].map((plan) => <PlanCard key={plan.id} plan={plan} onMove={movePlan} onRemove={removePlan} />)}</div>}
              </section>
              <div className="journey-footer">
                <button disabled={stage === "known"} onClick={() => setStage(stages[Math.max(0, stages.findIndex((s) => s.id === stage) - 1)].id)}>← Previous</button>
                {stage !== "results" ? <button className="primary" onClick={() => setStage(stages[stages.findIndex((s) => s.id === stage) + 1].id)}>Continue →</button> : <button className="primary" onClick={() => setShowPack(true)}>Build Take-Forward Pack →</button>}
              </div>
            </>
          )}
        </main>
      </div>
      <footer className="app-footer"><span>Prevent organises agreed action and results. It does not diagnose, interpret results or recommend treatment.</span><button onClick={exportBackup}>Download private backup</button></footer>
      {showAddPerson && <PersonModal onClose={() => setShowAddPerson(false)} onAdd={addPerson} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function PlanForm({ stage, onAdd }: { stage: Stage; onAdd: (plan: Omit<Plan, "id" | "stage" | "results">) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", detail: "", source: "", date: "", owner: "", agreedWith: "", startDate: "", measure: "", baseline: "", cadence: "", reviewDate: "" });
  const isAction = stage === "action";
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd(form);
    setForm({ title: "", detail: "", source: "", date: "", owner: "", agreedWith: "", startDate: "", measure: "", baseline: "", cadence: "", reviewDate: "" });
    setOpen(false);
  }
  if (!open) return <button className="add-card" onClick={() => setOpen(true)}><span>+</span><b>Add {stage === "action" ? "an agreed action" : "an item"}</b><small>{isAction ? "Define who, what, how and when it will be reviewed." : "Do not guess. Unknown is a valid record."}</small></button>;
  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="form-header"><div><p className="eyebrow">{isAction ? "Prevention Action Record" : "Working record"}</p><h3>Add to {stages.find((s) => s.id === stage)?.label}</h3></div><button type="button" className="close-button" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
      <label>Short title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
      <label>Useful detail <span>Record facts, wording agreed with the health team, or the exact question.</span><textarea rows={3} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></label>
      <div className="form-row"><label>Source<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Report, appointment, personal record" /></label><label>Source or decision date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label></div>
      {isAction && <>
        <div className="form-row"><label>Owner<input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Who will do this?" /></label><label>Agreed with<input value={form.agreedWith} onChange={(e) => setForm({ ...form, agreedWith: e.target.value })} placeholder="Health professional or personal plan" /></label></div>
        <div className="form-row"><label>Start date<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label><label>Review date<input type="date" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} /></label></div>
        <div className="form-row"><label>What will be recorded?<input value={form.measure} onChange={(e) => setForm({ ...form, measure: e.target.value })} placeholder="Agreed measure or observation" /></label><label>Starting point or baseline<input value={form.baseline} onChange={(e) => setForm({ ...form, baseline: e.target.value })} placeholder="If known and relevant" /></label></div>
        <label>Recording cadence<input value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })} placeholder="For example, weekly or before review" /></label>
      </>}
      <div className="form-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Save record</button></div>
    </form>
  );
}

function ResultForm({ plans, onAdd }: { plans: Plan[]; onAdd: (planId: string, result: Omit<Result, "id" | "reviewed">) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ planId: plans[0]?.id ?? "", date: "", value: "", unit: "", source: "", context: "" });
  const selectedPlanId = plans.some((plan) => plan.id === form.planId) ? form.planId : plans[0]?.id ?? "";
  if (!plans.length) return <div className="empty-state compact"><p>Add an agreed Next action first.</p><small>Results remain connected to the action they follow.</small></div>;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId || !form.value.trim()) return;
    onAdd(selectedPlanId, { date: form.date, value: form.value, unit: form.unit, source: form.source, context: form.context });
    setForm({ ...form, date: "", value: "", unit: "", source: "", context: "" });
    setOpen(false);
  }
  if (!open) return <button className="add-card" onClick={() => setOpen(true)}><span>+</span><b>Record a result</b><small>Record the result as reported. Prevent does not interpret it.</small></button>;
  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="form-header"><div><p className="eyebrow">Results Record</p><h3>Add a result</h3></div><button type="button" className="close-button" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
      <label>Related action<select value={selectedPlanId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>{plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <div className="form-row"><label>Result or observation<input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></label><label>Unit, if applicable<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label></div>
      <div className="form-row"><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Source<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Lab, device, appointment, personal record" /></label></div>
      <label>Context or note<textarea rows={3} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} placeholder="Relevant circumstances, without interpreting the result" /></label>
      <div className="form-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary">Save result</button></div>
    </form>
  );
}

function PlanCard({ plan, onMove, onRemove }: { plan: Plan; onMove: (id: string, next: Stage) => void; onRemove: (id: string) => void }) {
  return <article className="record-card action-card">
    <div className="record-top"><span className="kind-pill">{stages.find((s) => s.id === plan.stage)?.label}</span>{plan.owner && <span className="kind-pill">Owner: {plan.owner}</span>}</div>
    <h4>{plan.title}</h4>{plan.detail && <p>{plan.detail}</p>}
    <dl>{plan.source && <div><dt>Source</dt><dd>{plan.source}</dd></div>}{plan.date && <div><dt>Date</dt><dd>{plan.date}</dd></div>}{plan.reviewDate && <div><dt>Review</dt><dd>{plan.reviewDate}</dd></div>}</dl>
    {plan.stage === "action" && <div className="action-details"><span><b>Record:</b> {plan.measure || "Not set"}</span><span><b>Baseline:</b> {plan.baseline || "Not recorded"}</span><span><b>Cadence:</b> {plan.cadence || "Not set"}</span></div>}
    <div className="card-actions">
      {stages.filter((s) => s.id !== plan.stage && s.id !== "results").map((s) => <button key={s.id} onClick={() => onMove(plan.id, s.id)}>Move to {s.label}</button>)}
      <button className="danger" onClick={() => onRemove(plan.id)}>Delete</button>
    </div>
  </article>;
}

function ResultsList({ plans, onReviewed }: { plans: Plan[]; onReviewed: (planId: string, resultId: string) => void }) {
  const withResults = plans.filter((p) => p.results.length);
  if (!withResults.length) return <div className="empty-state"><span>○</span><p>No results recorded yet.</p><small>Results will remain attached to their agreed action.</small></div>;
  return <div className="record-grid">{withResults.flatMap((plan) => plan.results.map((result) => <article className="record-card result-card" key={result.id}>
    <div className="record-top"><span className="kind-pill">Result</span><span className="kind-pill">{result.reviewed ? "Reviewed" : "Not yet reviewed"}</span></div>
    <h4>{result.value}{result.unit ? ` ${result.unit}` : ""}</h4><p>For: {plan.title}</p>
    <dl>{result.date && <div><dt>Date</dt><dd>{result.date}</dd></div>}{result.source && <div><dt>Source</dt><dd>{result.source}</dd></div>}</dl>
    {result.context && <p>{result.context}</p>}
    {!result.reviewed && <div className="card-actions"><button className="primary" onClick={() => onReviewed(plan.id, result.id)}>Mark as reviewed with health team</button></div>}
  </article>))}</div>;
}

function TakeForwardPack({ file, onClose, onPrint }: { file: CaseFile; onClose: () => void; onPrint: () => void }) {
  const actions = file.plans.filter((p) => p.stage === "action");
  const results = file.plans.flatMap((p) => p.results.map((r) => ({ ...r, planTitle: p.title, reviewDate: p.reviewDate })));
  return <article className="pack">
    <div className="pack-toolbar no-print"><button onClick={onClose}>← Back</button><button className="primary" onClick={onPrint}>Print or save PDF</button></div>
    <div className="pack-title"><p className="eyebrow">Prevent heart risk</p><h2>Prevent Take-Forward Pack</h2><p>{file.name} · Prepared {new Date().toLocaleDateString("en-GB")}</p></div>
    <div className="pack-warning"><b>Working record, not medical advice</b><span>This pack records information, agreed actions and results. It does not interpret results, diagnose risk or recommend treatment.</span></div>
    <PackSection title="Prevention Action Record" items={actions} />
    <section className="pack-section"><h3>Results Record and Health Team Brief</h3><p className="pack-subtitle">Results are reported as entered and remain linked to the action they followed.</p>{results.length ? results.map((r) => <div className="pack-item" key={r.id}><div><b>{r.value}{r.unit ? ` ${r.unit}` : ""}</b><span>{r.date || "Date not recorded"} · {r.reviewed ? "Reviewed" : "Not yet reviewed"}</span></div><p>Action: {r.planTitle}</p>{r.context && <p>{r.context}</p>}<small>Source: {r.source || "Not recorded"} · Review point: {r.reviewDate || "Not set"}</small></div>) : <p className="pack-empty">No results recorded.</p>}</section>
    <section className="pack-section"><h3>Next-cycle record</h3><p className="pack-subtitle">Reviewed results feed new information into Known. Any new gap, question or action should remain in its correct stage.</p>{results.some((r) => r.reviewed) ? results.filter((r) => r.reviewed).map((r) => <div className="pack-item" key={`reviewed-${r.id}`}><b>{r.planTitle}</b><p>{r.value}{r.unit ? ` ${r.unit}` : ""} was marked as reviewed and is ready to inform the next cycle.</p></div>) : <p className="pack-empty">No result has yet been marked as reviewed with the health team.</p>}</section>
    <p className="pack-foot">HeartFirst · Heart Risk Navigator · Prevent · Device-local working record</p>
  </article>;
}

function PackSection({ title, items }: { title: string; items: Plan[] }) {
  return <section className="pack-section"><h3>{title}</h3>{items.length ? items.map((p) => <div className="pack-item" key={p.id}><div><b>{p.title}</b><span>{p.owner ? `Owner: ${p.owner}` : "Owner not set"}</span></div>{p.detail && <p>{p.detail}</p>}<small>Measure: {p.measure || "Not set"} · Baseline: {p.baseline || "Not recorded"} · Review: {p.reviewDate || "Not set"}</small></div>) : <p className="pack-empty">No agreed actions recorded.</p>}</section>;
}

function PersonModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, relationship: string) => void }) {
  const [name, setName] = useState(""); const [relationship, setRelationship] = useState("");
  return <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onAdd(name.trim(), relationship.trim()); }}><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">Separate record</p><h2>Add someone you love</h2><p>Each person’s actions, results and sharing decisions remain separate.</p><label>Record name<input value={name} onChange={(e) => setName(e.target.value)} required /></label><label>Relationship, optional<input value={relationship} onChange={(e) => setRelationship(e.target.value)} /></label><button className="primary">Create record</button></form></div>;
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal"><button className="close-button" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">How Prevent works</p><h2>Keep the loop moving</h2><p>Start with what is Known. Keep gaps in Unknown. Prepare health-team questions in To discuss. Only move an agreed action into Next action. Record and report results without interpreting them.</p><p><b>Results → Known → repeat.</b> Once a result has been reviewed, use it to update what is known and begin the next cycle.</p><p>Prevent does not decide which action is medically appropriate, assess urgency, or replace your health team.</p><button className="primary" onClick={onClose}>Continue</button></section></div>;
}
