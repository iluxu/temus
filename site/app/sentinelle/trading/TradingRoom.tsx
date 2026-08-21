"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./trading.module.css";

type Entity = {
  id: string;
  type: string;
  title: string;
  version: number;
  state: Record<string, any>;
  updatedAt: string;
};

type Mission = {
  id: string;
  objective: string;
  status: "queued" | "running" | "waiting" | "paused" | "completed" | "failed" | "cancelled";
  version: number;
  currentStep?: string | null;
  waiting?: Record<string, unknown> | null;
  currentWork?: {
    id: string;
    status: string;
    capability: string;
    attempt?: { id: string; status: string; worker: string } | null;
    changedFiles: string[];
    tests: Array<{ command?: string; exitCode?: number }>;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type Projection = {
  schema: "sentinelle-trading-room.v1";
  world: { id: string; title: string; roomId: string; canonicalSource: string };
  account: Entity | null;
  broker: Entity | null;
  dataPlane: Entity | null;
  positions: Entity[];
  protections: Entity[];
  strategies: Entity[];
  missions: Mission[];
  activeMissionCount: number;
  generatedAt: string;
};

type AuthState = "loading" | "locked" | "authenticated";

function apiBase() {
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "http://127.0.0.1:8044/v1/sentinelle";
  }
  return "https://api.adoptan.ai/v1/sentinelle";
}

function mutationId(prefix: string) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${suffix}`;
}

function at(entity: Entity | null | undefined, ...path: string[]): any {
  let current: any = entity?.state;
  for (const part of path) current = current?.[part];
  return current;
}

function money(value: unknown, digits = 2) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(amount);
}

function compact(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(amount);
}

function shortSymbol(value: unknown) {
  return String(value ?? "?").split("/")[0];
}

function statusCopy(status: Mission["status"]) {
  return {
    queued: "se prépare",
    running: "travaille",
    waiting: "attend Luca",
    paused: "en pause",
    completed: "terminée",
    failed: "à reprendre",
    cancelled: "arrêtée"
  }[status];
}

function Lock({ unlock }: { unlock: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <main className={styles.lock}>
      <section>
        <i>✦</i>
        <span>SENTINELLE</span>
        <h1>Entre dans<br />le marché.</h1>
        <form onSubmit={async (event) => {
          event.preventDefault();
          if (!password || busy) return;
          setBusy(true);
          setError(false);
          const accepted = await unlock(password);
          setBusy(false);
          setError(!accepted);
        }}>
          <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" />
          <button type="submit">{busy ? "…" : "Entrer"}</button>
        </form>
        {error ? <small>Ce mot de passe ne passe pas.</small> : null}
      </section>
    </main>
  );
}

export default function TradingRoom() {
  const api = apiBase();
  const [auth, setAuth] = useState<AuthState>("loading");
  const [world, setWorld] = useState<Projection | null>(null);
  const [objective, setObjective] = useState("");
  const [launching, setLaunching] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"market" | "missions">("market");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${api}/trading`, { credentials: "include", cache: "no-store" });
      if (response.status === 401) {
        setAuth("locked");
        setWorld(null);
        return;
      }
      if (!response.ok) throw new Error("projection unavailable");
      const value = await response.json() as Projection;
      if (value.schema !== "sentinelle-trading-room.v1") throw new Error("invalid projection");
      setWorld(value);
      setNotice("");
    } catch {
      setNotice("Le World se reconnecte…");
    }
  }, [api]);

  useEffect(() => {
    fetch(`${api}/auth/status`, { credentials: "include", cache: "no-store" })
      .then((response) => setAuth(response.ok ? "authenticated" : "locked"))
      .catch(() => setAuth("locked"));
  }, [api]);

  useEffect(() => {
    if (auth !== "authenticated") return;
    void load();
    const events = new EventSource(`${api}/trading/events`, { withCredentials: true });
    events.addEventListener("world-changed", () => void load());
    events.onerror = () => setNotice("Le World se reconnecte…");
    const fallback = window.setInterval(() => void load(), 8_000);
    return () => { events.close(); window.clearInterval(fallback); };
  }, [api, auth, load]);

  const protections = useMemo(() => new Map(
    (world?.protections ?? []).map((item) => [String(at(item, "protection", "ticket")), item])
  ), [world]);
  const openPositions = (world?.positions ?? []).filter((item) => at(item, "position", "status") === "open");
  const equity = Number(at(world?.account, "account", "equity"));
  const freeMargin = Number(at(world?.account, "account", "margin_free"));
  const unrealized = openPositions.reduce((total, item) => total + Number(at(item, "position", "unrealized_pnl") || 0), 0);
  const gates = at(world?.broker, "broker", "gates") ?? {};
  const brokerReady = at(world?.broker, "broker", "status") === "ok" && at(world?.broker, "broker", "exchange_ready") === true;
  const feedHealthy = at(world?.dataPlane, "feed", "healthy") === true;

  async function unlock(password: string) {
    try {
      const response = await fetch(`${api}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!response.ok) return false;
      setAuth("authenticated");
      return true;
    } catch { return false; }
  }

  async function launch(event: FormEvent) {
    event.preventDefault();
    const text = objective.trim();
    if (text.length < 3 || launching) return;
    setLaunching(true);
    setNotice("");
    try {
      const response = await fetch(`${api}/trading/missions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: text, mutationId: mutationId("trading-mission") })
      });
      if (!response.ok) throw new Error();
      const value = await response.json();
      setWorld(value.workspace);
      setObjective("");
      setTab("missions");
    } catch {
      setNotice("La mission n’a pas pu démarrer.");
    } finally { setLaunching(false); }
  }

  async function control(runId: string, command: "pause" | "resume" | "cancel") {
    try {
      const response = await fetch(`${api}/trading/runs/${encodeURIComponent(runId)}/${command}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutationId: mutationId(`trading-${command}`) })
      });
      if (!response.ok) throw new Error();
      setWorld((await response.json()).workspace);
    } catch { setNotice("Cette mission n’a pas changé d’état."); }
  }

  if (auth === "loading") return <main className={styles.loading}><i>✦</i></main>;
  if (auth === "locked") return <Lock unlock={unlock} />;

  return (
    <main className={styles.page}>
      <div className={styles.ambient} />
      <header className={styles.header}>
        <div className={styles.brand}><i>✦</i><div><b>Sentinelle</b><span>Trading</span></div></div>
        <div className={styles.presence}>
          <span><i className={brokerReady ? styles.on : styles.off} />Marché {brokerReady ? "relié" : "indisponible"}</span>
          <span><i className={styles.ai} />Sentinelle veille</span>
          <b>LUCA</b>
        </div>
      </header>

      <div className={styles.mobileTabs}>
        <button className={tab === "market" ? styles.selectedTab : ""} onClick={() => setTab("market")}>Le marché</button>
        <button className={tab === "missions" ? styles.selectedTab : ""} onClick={() => setTab("missions")}>Intelligences <span>{world?.activeMissionCount ?? 0}</span></button>
      </div>

      <div className={styles.layout}>
        <section className={`${styles.market} ${tab !== "market" ? styles.mobileHidden : ""}`}>
          <div className={styles.hero}>
            <div>
              <span>RÉALITÉ MAINTENANT</span>
              <h1>{Number.isFinite(equity) ? money(equity) : "—"}<small> USDT</small></h1>
              <p>Equity observée sur Bybit · aucune estimation frontend</p>
            </div>
            <div className={styles.heroStats}>
              <div><span>PNL OUVERT</span><b className={unrealized >= 0 ? styles.positive : styles.negative}>{unrealized >= 0 ? "+" : ""}{money(unrealized)}</b></div>
              <div><span>MARGE LIBRE</span><b>{Number.isFinite(freeMargin) ? money(freeMargin) : "—"}</b></div>
              <div><span>POSITIONS</span><b>{openPositions.length}</b></div>
            </div>
          </div>

          <div className={styles.healthStrip}>
            <span><i className={brokerReady ? styles.good : styles.bad} />Broker</span>
            <span><i className={feedHealthy ? styles.good : styles.bad} />Market data</span>
            <span><i className={gates.trading ? styles.good : styles.bad} />Trading gate</span>
            <span><i className={gates.new_orders ? styles.good : styles.bad} />New orders</span>
            <span><i className={gates.risk_reduction ? styles.good : styles.bad} />Risk reduction</span>
            <small>{world?.generatedAt ? `observé ${new Date(world.generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "connexion…"}</small>
          </div>

          <section className={styles.section}>
            <header><div><span>POSITIONS VIVANTES</span><h2>Ce qui est réellement exposé</h2></div><b>{openPositions.length}</b></header>
            <div className={styles.positions}>
              {openPositions.length ? openPositions.map((entity) => {
                const position = at(entity, "position") ?? {};
                const protection = protections.get(String(position.ticket));
                const safe = at(protection, "protection") ?? {};
                const pnl = Number(position.unrealized_pnl ?? 0);
                const origin = position.origin ?? {};
                return (
                  <article className={styles.position} key={entity.id} data-world-entity={entity.id}>
                    <div className={styles.positionLead}>
                      <i className={position.side === "long" ? styles.long : styles.short}>{position.side === "long" ? "↗" : "↘"}</i>
                      <div><h3>{shortSymbol(position.symbol)}</h3><span>{String(position.side).toUpperCase()} · {compact(position.quantity)}</span></div>
                    </div>
                    <div className={styles.price}><span>ENTRÉE</span><b>{compact(position.entry_price)}</b></div>
                    <div className={styles.protection}>
                      <span>SL <b>{compact(safe.stop_loss)}</b></span>
                      <span>TP <b>{compact(safe.take_profit)}</b></span>
                      {safe.has_trailing ? <span>TRAIL <b>{compact(safe.trailing_stop)}</b></span> : null}
                    </div>
                    <div className={styles.origin}><span>{origin.kind === "strategy" ? "✦ STRATÉGIE" : origin.kind === "human" ? "● LUCA" : "ORIGINE À RÉCONCILIER"}</span><small>{origin.strategy_id ?? "position manuelle"}</small></div>
                    <strong className={pnl >= 0 ? styles.positive : styles.negative}>{pnl >= 0 ? "+" : ""}{money(pnl)}<small> USDT</small></strong>
                  </article>
                );
              }) : <div className={styles.empty}>Aucune position ouverte. Sentinelle continue d’observer.</div>}
            </div>
          </section>

          <section className={styles.section}>
            <header><div><span>STRATEGY REGISTRY</span><h2>Les identités en observation</h2></div><b>{world?.strategies.length ?? 0}</b></header>
            <div className={styles.strategies}>
              {(world?.strategies ?? []).map((entity) => {
                const strategy = at(entity, "strategy") ?? {};
                return <article key={entity.id} data-world-entity={entity.id}>
                  <i className={strategy.new_entries_enabled ? styles.live : styles.shadow} />
                  <div><b>{String(strategy.family ?? entity.title).replaceAll("_", " ")}</b><span>{strategy.execution ?? "unknown"} · {strategy.timeframe || "event"}</span></div>
                  <strong>{strategy.new_entries_enabled ? "ENTRIES ON" : strategy.enabled ? "OBSERVE" : "OFF"}</strong>
                  <small>{strategy.closed_trades ?? "—"} trades · {strategy.cumulative_r === null || strategy.cumulative_r === undefined ? "—" : `${Number(strategy.cumulative_r).toFixed(2)}R`}</small>
                </article>;
              })}
            </div>
          </section>
        </section>

        <aside className={`${styles.missions} ${tab !== "missions" ? styles.mobileHidden : ""}`}>
          <div className={styles.missionIntro}>
            <span>INTELLIGENCES INDÉPENDANTES</span>
            <h2>Donne une mission.<br />Pas un workflow.</h2>
            <p>Chaque intelligence entre dans un snapshot isolé du projet, voit la réalité Trading vérifiée et choisit librement son chemin.</p>
          </div>
          <form className={styles.launcher} onSubmit={launch}>
            <textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Ex. Trouve pourquoi le churn détruit le RPI et construis la meilleure preuve possible…" maxLength={4000} />
            <div><span><i /> SOL · autonome</span><button disabled={launching || objective.trim().length < 3}>{launching ? "Je la réveille…" : "Lancer"} <b>↗</b></button></div>
          </form>
          <div className={styles.freedom}>
            <span>shell</span><span>code</span><span>tests</span><span>calcul</span><span>artefacts</span>
            <small>Le worker choisit. Le broker LIVE reste gouverné.</small>
          </div>

          <div className={styles.runList}>
            {(world?.missions ?? []).length ? world?.missions.map((mission) => (
              <article className={styles.run} key={mission.id}>
                <header><span><i className={styles[mission.status]} />Sentinelle {statusCopy(mission.status)}</span><small>{new Date(mission.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small></header>
                <p>{mission.objective}</p>
                {mission.currentWork ? <div className={styles.workEvidence}>
                  <span>{mission.currentWork.attempt ? `Worker ${mission.currentWork.attempt.status}` : "Worker en préparation"}</span>
                  {mission.currentWork.changedFiles.length ? <small>{mission.currentWork.changedFiles.length} fichier{mission.currentWork.changedFiles.length > 1 ? "s" : ""} modifié{mission.currentWork.changedFiles.length > 1 ? "s" : ""}</small> : null}
                  {mission.currentWork.tests.length ? <small>{mission.currentWork.tests.filter((item) => item.exitCode === 0).length}/{mission.currentWork.tests.length} tests reçus</small> : null}
                </div> : null}
                {(["running", "queued", "waiting", "paused"] as string[]).includes(mission.status) ? <footer>
                  {mission.status === "paused" ? <button onClick={() => void control(mission.id, "resume")}>Reprendre</button> : <button onClick={() => void control(mission.id, "pause")}>Pause</button>}
                  <button onClick={() => void control(mission.id, "cancel")}>Arrêter</button>
                </footer> : null}
              </article>
            )) : <div className={styles.noRuns}><i>✦</i><p>Aucune mission en cours.</p><span>La première intelligence apparaîtra ici — puis continuera même si tu fermes cette page.</span></div>}
          </div>
        </aside>
      </div>
      {notice ? <button className={styles.notice} onClick={() => setNotice("")}>{notice}</button> : null}
    </main>
  );
}
