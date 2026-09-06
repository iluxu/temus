"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, Check, ChevronDown, Clock3, Film, Globe2, History, Link2, Loader2, LockKeyhole, Network, Plus, Send, Settings2, Sparkles, Upload, X } from "lucide-react";
import styles from "./factory.module.css";

const API = "/api/factory", TARGET = "xaviernielreplays";
type Account = { id: string; connected: boolean; displayName: string; privacyOptions?: string[]; commentDisabled?: boolean; duetDisabled?: boolean; stitchDisabled?: boolean };
type Clip = { id: string; accountId: string; hook: string; title: string; why: string; radarScore: number | null; durationSec: number | null; status: string; previewUrl: string; posterUrl: string; mediaSha256: string; postUrl: string; error: string; renderError: string; receipt?: { approvedAt: string; mediaSha256: string } };
type Run = { id: string; prompt: string; accountId: string; accountIds: string[]; status: string; answer: string; error: string; createdAt: string; clips: Clip[]; events: { at: string; message?: string; stage: string }[] };
type Source = { id: string; name: string; duration: number };
type Settings = { privacyLevel: string; allowComments: boolean; allowDuet: boolean; allowStitch: boolean; commercialDisclosure: boolean; brandOrganic: boolean; brandContent: boolean; isAigc: boolean; musicUsageConfirmed: boolean; expressConsent: boolean };
const defaults: Settings = { privacyLevel: "", allowComments: false, allowDuet: false, allowStitch: false, commercialDisclosure: false, brandOrganic: false, brandContent: false, isAigc: false, musicUsageConfirmed: false, expressConsent: false };
const labels: Record<string, string> = { PUBLIC_TO_EVERYONE: "Public", MUTUAL_FOLLOW_FRIENDS: "Amis", FOLLOWER_OF_CREATOR: "Abonnés", SELF_ONLY: "Moi uniquement" };
const stages: Record<string, string> = { worker: "Sélection des moments", montage: "Montage en cours", ready: "La sélection est prête", publishing: "Envoi vers TikTok", validating: "Vérification", done: "Traitement terminé", failed: "À reprendre", interrupted: "Traitement interrompu" };
const playable = (c: Clip) => c.status === "prêt" && !c.renderError && Boolean(c.mediaSha256);
async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.message || data.error || "Requête impossible.");
  return data;
}
const post = (path: string, body: unknown = {}) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function FactoryConsole() {
  const [tab, setTab] = useState<"studio" | "network" | "history">("studio");
  const [auth, setAuth] = useState<"loading" | "ready" | "locked">("loading");
  const [key, setKey] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [destinations, setDestinations] = useState<string[]>([TARGET]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [history, setHistory] = useState<Run[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [prompt, setPrompt] = useState("Trouve 3 extraits punchy de Xavier Niel sur l'entrepreneuriat.");
  const [selected, setSelected] = useState<string[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings>({ ...defaults });
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [live, setLive] = useState(false);
  const [online, setOnline] = useState(true);
  const upload = useRef<HTMLInputElement>(null), action = useRef(false), known = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    const data = await request("/accounts"); setAccounts(data.accounts || []); setLive(data.live); setAuth("ready");
    const sources: Source[] = (await request("/sources")).sources || [];
    setSources(sources); setSourceId((current) => current || sources.find((s) => /niel/i.test(s.name))?.id || "");
    setHistory((await request("/runs")).runs || []);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
        if (invitation) { await post("/session", { key: invitation }); window.history.replaceState(null, "", location.pathname); }
        await refresh();
        const id = localStorage.getItem("sentinelle.factory.run");
        if (id) { const data = await request(`/runs/${encodeURIComponent(id)}`).catch(() => null); if (!cancelled && data) setRun(data.run); }
        if (new URLSearchParams(location.search).get("oauth") === "cancelled") setError("Connexion TikTok annulée. Tu peux réessayer.");
      } catch (err) { if (!cancelled) { setAuth("locked"); setError((err as Error).message); } }
    })();
    const connectivity = () => setOnline(navigator.onLine);
    window.addEventListener("online", connectivity); window.addEventListener("offline", connectivity);
    navigator.serviceWorker?.register("/sentinelle-factory-sw.js", { scope: "/sentinelle/factory" }).catch(() => {});
    return () => { cancelled = true; window.removeEventListener("online", connectivity); window.removeEventListener("offline", connectivity); };
  }, [refresh]);
  useEffect(() => {
    if (!run || auth !== "ready") return;
    localStorage.setItem("sentinelle.factory.run", run.id);
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try { setRun((await request(`/runs/${run.id}`)).run); } catch (err) { setError((err as Error).message); }
    }, 2500);
    return () => clearInterval(timer);
  }, [run?.id, auth]);
  useEffect(() => {
    const fresh = (run?.clips || []).filter((c) => playable(c) && !known.current.has(c.id));
    if (fresh.length) { fresh.forEach((c) => known.current.add(c.id)); setSelected((old) => [...new Set([...old, ...fresh.map((c) => c.id)])]); setSettings({ ...defaults }); }
  }, [run]);
  const update = (field: keyof Settings, value: string | boolean) => setSettings((s) => ({ ...s, [field]: value, ...(field === "musicUsageConfirmed" ? { expressConsent: value as boolean } : { musicUsageConfirmed: false, expressConsent: false }), ...(field === "commercialDisclosure" && !value ? { brandContent: false, brandOrganic: false } : {}) }));
  const busy = working || ["worker", "montage", "publishing", "validating"].includes(run?.status || "");
  const clips = run?.clips || [], selectedClips = clips.filter((c) => selected.includes(c.id) && playable(c));
  const chosen = accounts.filter((a) => (run?.accountIds || destinations).includes(a.id));
  const privacy = chosen.length ? (chosen[0].privacyOptions || []).filter((p) => chosen.every((a) => a.privacyOptions?.includes(p))) : [];
  const canPublish = !busy && online && live && selectedClips.length > 0 && chosen.length > 0 && chosen.every((a) => a.connected) && privacy.includes(settings.privacyLevel) && settings.musicUsageConfirmed && (!settings.commercialDisclosure || settings.brandContent || settings.brandOrganic) && !(settings.brandContent && settings.privacyLevel === "SELF_ONLY");
  async function connect() {
    if (action.current) return; action.current = true; setWorking(true); setError("");
    try { window.location.assign((await post("/oauth/start")).url); } catch (err) { setError((err as Error).message); } finally { action.current = false; setWorking(false); }
  }
  async function launch() {
    if (busy || action.current || !prompt.trim()) return; action.current = true; setWorking(true); setError("");
    try { const data = await post("/runs", { prompt, count: 3, accountIds: destinations, sourceId }); known.current = new Set(); setSelected([]); setTitles({}); setSettings({ ...defaults }); setRun(data.run); }
    catch (err) { setError((err as Error).message); } finally { action.current = false; setWorking(false); }
  }
  async function publish() {
    if (!canPublish || action.current || !run) return; action.current = true; setWorking(true); setError("");
    try { const data = await post(`/runs/${run.id}/publish`, { settings, clips: selectedClips.map((c) => ({ id: c.id, title: titles[c.id] ?? c.title, mediaSha256: c.mediaSha256 })) }); setRun(data.run); setSettings({ ...defaults }); }
    catch (err) { setError((err as Error).message); } finally { action.current = false; setWorking(false); }
  }
  async function importVideo(file: File) {
    if (file.size > 80 * 1024 * 1024) { setError("La vidéo doit peser moins de 80 Mo."); return; }
    setUploading(true); setError("");
    try { const data = await request(`/sources?name=${encodeURIComponent(file.name)}`, { method: "POST", headers: { "Content-Type": "video/mp4" }, body: file }); setSources((items) => [...items, data.source]); setSourceId(data.source.id); }
    catch (err) { setError((err as Error).message); } finally { setUploading(false); }
  }
  return <div className={styles.shell}>
    <header className={styles.topbar}>
      <a href="/sentinelle/factory" className={styles.brand}><img src="/sentinelle-icon-192.png" width="32" height="32" alt="" /><strong>sentinelle<span>studio</span></strong></a>
      <div className={styles.topActions}><span className={styles.connection}><i className={online && auth === "ready" ? styles.green : ""} />{!online ? "Hors connexion" : auth === "ready" ? "Studio connecté" : "Espace privé"}</span><button type="button" className={styles.connect} onClick={connect} disabled={auth !== "ready" || working}><Link2 size={15} /><span>{accounts.find((a) => a.id === TARGET)?.connected ? "TikTok connecté" : "Connecter TikTok"}</span></button></div>
    </header>
    <div className={styles.workspace}>
      <nav className={styles.rail} aria-label="Navigation du studio">{([{ id: "studio", label: "Studio", icon: Film }, { id: "network", label: "Réseau", icon: Network }, { id: "history", label: "Historique", icon: History }] as const).map(({ id, label, icon: Icon }) => <button key={id} title={label} aria-label={label} aria-current={tab === id ? "page" : undefined} className={tab === id ? styles.activeNav : ""} onClick={() => { setTab(id); if (id === "history") refresh().catch(() => {}); }}><Icon size={21} /><span>{label}</span></button>)}</nav>
      <main className={styles.main}>
        {auth === "locked" ? <section className={styles.access}><LockKeyhole size={28} /><h1>Ton studio privé.</h1><form onSubmit={async (e) => { e.preventDefault(); try { await post("/session", { key }); setError(""); await refresh(); } catch (err) { setError((err as Error).message); } }}><label htmlFor="access">Code d’accès</label><input id="access" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" /><button className={styles.primary}>Ouvrir le studio <ArrowUpRight size={17} /></button></form></section> : <>
          <div className={styles.pageHead}><div><p className={styles.eyebrow}>ESPACE DE PRODUCTION</p><h1>{tab === "network" ? "Un studio. Tes comptes." : tab === "history" ? "Les dernières sessions." : "Les idées deviennent vidéos."}</h1></div><span className={styles.target}>@XavierNielReplays</span></div>
          {tab === "studio" && <>
            <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); launch(); }}>
              <label className={styles.promptLabel} htmlFor="prompt"><Sparkles size={16} />Qu’est-ce qu’on publie ?</label>
              <textarea id="prompt" rows={2} maxLength={800} value={prompt} disabled={busy} onChange={(e) => setPrompt(e.target.value)} />
              <div className={styles.composerFoot}><div className={styles.sourceTools}><label className={styles.sourcePicker}><Film size={14} /><select aria-label="Source vidéo" value={sourceId} disabled={busy || uploading} onChange={(e) => setSourceId(e.target.value)}><option value="">Bibliothèque Lucia</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><ChevronDown size={12} /></label><button type="button" className={styles.iconButton} aria-label="Importer une vidéo" title="Importer une vidéo (80 Mo, 5 min maximum)" disabled={busy || uploading} onClick={() => upload.current?.click()}>{uploading ? <Loader2 size={18} className={styles.spin} /> : <Plus size={18} />}</button><input hidden ref={upload} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { if (e.target.files?.[0]) importVideo(e.target.files[0]); e.target.value = ""; }} /></div><button className={styles.primary} disabled={busy || uploading || auth !== "ready" || !online || !prompt.trim()}>{busy ? <Loader2 size={16} className={styles.spin} /> : <ArrowUp size={17} />}<span>{busy ? "En cours" : "Créer 3 clips"}</span></button></div>
            </form>
            <div className={styles.editorialBar}><button onClick={() => setTab("network")} className={styles.textButton}><Globe2 size={14} />{destinations.length === 1 ? `@${destinations[0]}` : `${destinations.length} comptes`}<ChevronDown size={12} /></button><span>9:16 <b>·</b> Sous-titres <b>·</b> Voix originale</span></div>
            <section className={styles.production} aria-label="Sélection vidéo">
              <div className={styles.sectionHead}><h2>{run ? stages[run.status] || "Sélection" : "Ta prochaine sélection"}</h2><span>{clips.length ? `${clips.filter((c) => c.status === "publié").length} publiés · ${clips.length} clips` : "01 / 03"}</span></div>
              {run && <div className={styles.progress} aria-live="polite">{busy ? <Loader2 className={styles.spin} size={14} /> : <Check size={14} />}<span>{run.error || run.events?.at(-1)?.message || run.answer}</span></div>}
              {clips.length ? <div className={styles.clips}>{clips.map((c, i) => <article className={styles.clip} key={c.id}>
                <div className={styles.frame}>{c.previewUrl ? <video key={c.previewUrl} src={c.previewUrl.startsWith("/media/") ? `${API}${c.previewUrl}` : c.previewUrl} poster={c.posterUrl || undefined} controls muted playsInline loop preload="metadata" aria-label={`Aperçu : ${c.hook}`} /> : <div className={styles.rendering}><Loader2 size={26} className={styles.spin} /><span>{c.renderError || "Montage"}</span></div>}<span className={styles.clipNumber}>{String(i + 1).padStart(2, "0")}</span>{playable(c) && <label className={styles.checkClip}><input aria-label={`Sélectionner ${c.hook}`} type="checkbox" checked={selected.includes(c.id)} disabled={busy} onChange={() => { setSelected((items) => items.includes(c.id) ? items.filter((id) => id !== c.id) : [...items, c.id]); setSettings((s) => ({ ...s, musicUsageConfirmed: false, expressConsent: false })); }} /></label>}</div>
                <div className={styles.clipHeading}><h3>{c.hook}</h3><span>{c.durationSec ? `${Math.round(c.durationSec)}s` : ""}</span></div><span className={styles.clipAccount}>@{c.accountId}</span>
                <textarea className={styles.caption} aria-label={`Légende : ${c.hook}`} rows={3} maxLength={2200} value={titles[c.id] ?? c.title} disabled={!playable(c) || busy} onChange={(e) => { setTitles((old) => ({ ...old, [c.id]: e.target.value })); setSettings((s) => ({ ...s, musicUsageConfirmed: false, expressConsent: false })); }} />
                <div className={styles.clipFooter}><span className={c.status === "publié" ? styles.published : ""}>{c.status === "publié" ? <Check size={13} /> : <Clock3 size={13} />}{c.status}</span>{c.postUrl && <a href={c.postUrl} target="_blank" rel="noreferrer">Voir le post <ArrowUpRight size={14} /></a>}</div>{c.error && <p className={styles.inlineError}>{c.error}</p>}
                <details className={styles.clipDetail}><summary>Choix éditorial{c.radarScore != null ? ` · ${c.radarScore}/100` : ""}</summary><p>{c.why}</p>{c.receipt && <p>Validé le {new Date(c.receipt.approvedAt).toLocaleString("fr-FR")} · SHA256 {c.receipt.mediaSha256.slice(0, 12)}</p>}</details>
              </article>)}</div> : <div className={styles.empty}><div className={styles.emptyVisual}><img src="/sentinelle-demo/media/poster-niel.jpg" alt="Xavier Niel dans un entretien France Inter" /><span>XAVIER NIEL / FRANCE INTER</span><div className={styles.filmMark}><Film size={26} /></div></div><div className={styles.emptyContent}><span className={styles.miniLabel}>PROCHAINE SOURCE</span><h2>Xavier Niel,<br />à l’écran.</h2><button className={styles.textButton} disabled={auth !== "ready" || uploading} onClick={() => upload.current?.click()}><Upload size={16} />Importer une vidéo <ArrowUpRight size={16} /></button><small>MP4 · 80 Mo max · 5 min max</small></div></div>}
            </section>
            {selectedClips.length > 0 && <section className={styles.publishZone} aria-label="Publication TikTok">
              <div className={styles.settingsRow}><label className={styles.privacy}><Globe2 size={15} /><select aria-label="Confidentialité TikTok" value={settings.privacyLevel} disabled={busy} onChange={(e) => update("privacyLevel", e.target.value)}><option value="">Visibilité</option>{privacy.map((p) => <option key={p} value={p} disabled={p === "SELF_ONLY" && settings.brandContent}>{labels[p] || p}</option>)}</select></label><label><input type="checkbox" checked={settings.allowComments} disabled={busy || chosen.some((a) => a.commentDisabled)} onChange={(e) => update("allowComments", e.target.checked)} />Commentaires</label><details className={styles.moreSettings}><summary><Settings2 size={15} />Réglages</summary><div>{([{ key: "allowDuet", label: "Duo", disabled: chosen.some((a) => a.duetDisabled) }, { key: "allowStitch", label: "Collage", disabled: chosen.some((a) => a.stitchDisabled) }, { key: "commercialDisclosure", label: "Contenu commercial" }, { key: "isAigc", label: "Contenu généré par IA" }] as const).map((item) => <label key={item.key}><input type="checkbox" checked={settings[item.key]} disabled={busy || ("disabled" in item && item.disabled)} onChange={(e) => update(item.key, e.target.checked)} />{item.label}</label>)}{settings.commercialDisclosure && <><label><input type="checkbox" checked={settings.brandOrganic} onChange={(e) => update("brandOrganic", e.target.checked)} />Votre marque</label><label><input type="checkbox" checked={settings.brandContent} disabled={settings.privacyLevel === "SELF_ONLY"} onChange={(e) => update("brandContent", e.target.checked)} />Partenariat rémunéré</label><small>{settings.brandContent ? "Paid partnership" : settings.brandOrganic ? "Promotional content" : "Choisis au moins une catégorie."}</small></>}</div></details></div>
              <div className={styles.publishBottom}><label className={styles.consent}><input type="checkbox" checked={settings.musicUsageConfirmed} disabled={busy} onChange={(e) => update("musicUsageConfirmed", e.target.checked)} /><span>By posting, you agree to TikTok’s {settings.brandContent && <><a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a> and </>}<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>.</span></label><button className={styles.primary} disabled={!canPublish} onClick={publish}><Send size={16} />Publier la sélection ({selectedClips.length})</button></div><small className={styles.processingNote}>{!live ? "Publication réelle désactivée sur ce serveur." : "TikTok peut prendre quelques minutes pour traiter et afficher les vidéos."}</small>
            </section>}
          </>}
          {tab === "network" && <section className={styles.network}><div className={styles.sectionHead}><h2>Comptes de diffusion</h2><span>{accounts.filter((a) => a.connected).length} connectés</span></div>{accounts.map((a) => <div className={styles.accountRow} key={a.id}><input type="checkbox" aria-label={`Diffuser sur ${a.id}`} checked={destinations.includes(a.id)} disabled={busy || (!a.connected && !destinations.includes(a.id))} onChange={() => setDestinations((items) => items.includes(a.id) ? items.length > 1 ? items.filter((id) => id !== a.id) : items : [...items, a.id])} /><span className={styles.avatar}>{a.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{a.displayName}</strong><small>@{a.id}</small></span><span className={a.connected ? styles.published : styles.muted}>{a.connected ? "Connecté" : "À connecter"}</span>{a.id === TARGET && !a.connected && <button className={styles.iconButton} title="Connecter XavierNielReplays" aria-label="Connecter XavierNielReplays" type="button" onClick={connect}><Link2 size={18} /></button>}</div>)}<button className={styles.primary} onClick={() => setTab("studio")}>Revenir au studio <ArrowUpRight size={17} /></button></section>}
          {tab === "history" && <section className={styles.history}>{history.length ? history.map((item) => <button key={item.id} onClick={() => { known.current = new Set(); setSelected([]); setTitles({}); setSettings({ ...defaults }); setRun(item); setTab("studio"); }}><Film size={20} /><span><strong>{item.prompt}</strong><small>{new Date(item.createdAt).toLocaleString("fr-FR")} · @{item.accountId}</small></span><span>{item.clips.filter((c) => c.status === "publié").length}/{item.clips.length} publiés</span><ArrowUpRight size={17} /></button>) : <p>Aucune session pour le moment.</p>}</section>}
        </>}
        {error && <div className={styles.error} role="alert"><span>{error}</span><button aria-label="Fermer le message" onClick={() => setError("")}><X size={17} /></button></div>}
        <footer className={styles.footer}><span>Sentinelle / Studio</span><span>Création. Validation. Publication.</span></footer>
      </main>
    </div>
  </div>;
}
