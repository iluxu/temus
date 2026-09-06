"use client";
import { ArrowUpRight, CheckCircle2, Circle, Loader2, TriangleAlert } from "lucide-react";
import styles from "./factory.module.css";

type Item = { id: string; hook: string; accountId: string; status: string; postUrl: string; error: string; publishId?: string; submittedAt?: string; tiktokStatus?: string; lastCheckedAt?: string; receipt?: unknown };
export default function PublicationTracker({ clips }: { clips: Item[] }) {
  const items = clips.filter((c) => c.receipt || c.submittedAt || c.publishId);
  if (!items.length) return null;
  const sent = items.filter((c) => c.publishId).length;
  const published = items.filter((c) => c.status === "publié").length;
  const failed = items.filter((c) => c.status === "échec").length;
  const uncertain = items.some((c) => c.status === "à vérifier");
  const pending = items.some((c) => ["envoi", "approuvé", "traitement"].includes(c.status) || (c.status === "à vérifier" && c.publishId));
  return <section className={styles.delivery} aria-label="Suivi des publications TikTok">
    <div className={styles.deliveryHead}><h2>{pending ? <Loader2 size={18} className={styles.spin} /> : failed || uncertain ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}Publications TikTok</h2><span aria-live="polite">{published} / {items.length} publiées</span></div>
    <div className={styles.deliveryTrack} role="progressbar" aria-label="Publications confirmées" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={published}><span style={{ width: `${100 * published / items.length}%` }} /></div>
    <div className={styles.deliveryCounts}><span>{sent} envois acceptés</span><span>{items.filter((c) => c.status === "traitement").length} en traitement</span>{failed > 0 && <span>{failed} échec(s)</span>}</div>
    <ol className={styles.deliveryList}>{items.map((c) => {
      const completed = c.status === "publié", error = ["échec", "à vérifier"].includes(c.status);
      const label = completed ? c.postUrl ? "Publié" : "Publié · lien en attente" : c.status === "traitement" ? c.tiktokStatus === "PROCESSING_DOWNLOAD" ? "TikTok récupère la vidéo" : "Traitement chez TikTok" : c.status === "approuvé" ? "Dans la file d’envoi" : c.status === "envoi" ? "Envoi de la demande" : c.status;
      return <li key={c.id}>{completed ? <CheckCircle2 size={18} className={styles.published} /> : error ? <TriangleAlert size={18} /> : c.status === "approuvé" ? <Circle size={18} /> : <Loader2 size={18} className={styles.spin} />}<div><strong>{c.hook}</strong><small>@{c.accountId}</small><span>{label}</span>{error && c.error && <p className={styles.inlineError}>{c.error}</p>}</div>{c.postUrl && <a href={c.postUrl} target="_blank" rel="noreferrer" aria-label={`Voir ${c.hook} sur TikTok`}>Voir <ArrowUpRight size={16} /></a>}</li>;
    })}</ol>
  </section>;
}
