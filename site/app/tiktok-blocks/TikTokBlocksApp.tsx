"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./tiktok-blocks.module.css";

const API_BASE = "https://api.adoptan.ai/tiktok-review";

type Creator = {
  accountId: string;
  nickname: string;
  username: string;
  avatarUrl: string;
  profileUrl: string;
  privacyOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoDurationSec: number;
  canPostNow: boolean;
  loadedAt: string;
};

type ApprovalReceipt = {
  id: string;
  approvedAt: string;
  accountId: string;
  creatorNickname: string;
  mediaSha256: string;
};

type ApprovalItem = {
  id: string;
  accountId: string;
  title: string;
  strategy: string;
  videoUrl: string;
  posterUrl: string;
  media: {
    sha256: string;
    sizeBytes: number;
    durationSec: number;
    width: number;
    height: number;
    videoCodec: string;
    frameRate: string;
  };
  status: "pending" | "publishing" | "processing" | "published" | "failed";
  receipt: ApprovalReceipt | null;
  publishId: string;
  postUrl: string;
  error: string;
  creator: Creator | null;
};

type ApprovalBlock = {
  id: string;
  title: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  items: ApprovalItem[];
};

type ItemForm = {
  title: string;
  privacyLevel: string;
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  commercialDisclosure: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
  isAigc: boolean;
  consent: boolean;
};

function initialForm(item: ApprovalItem): ItemForm {
  return {
    title: item.title,
    privacyLevel: "",
    allowComments: false,
    allowDuet: false,
    allowStitch: false,
    commercialDisclosure: false,
    brandOrganic: false,
    brandContent: false,
    isAigc: false,
    consent: false
  };
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function itemIssues(item: ApprovalItem, form: ItemForm | undefined) {
  if (!form || item.status === "published") {
    return [];
  }
  const issues = [
    !item.creator ? "creator_info indisponible" : "",
    item.creator && !item.creator.canPostNow ? "TikTok suspend temporairement les publications" : "",
    !form.title.trim() ? "Ajoute un titre" : "",
    !form.privacyLevel ? "Choisis la confidentialite" : "",
    form.commercialDisclosure && !form.brandOrganic && !form.brandContent
      ? "Choisis le type de contenu commercial"
      : "",
    form.brandContent && form.privacyLevel === "SELF_ONLY"
      ? "Le contenu de marque ne peut pas etre prive"
      : "",
    !form.consent ? "Confirme la declaration TikTok" : ""
  ];
  return issues.filter(Boolean);
}

export default function TikTokBlocksApp() {
  const [blockId, setBlockId] = useState("");
  const [approvalToken, setApprovalToken] = useState("");
  const [block, setBlock] = useState<ApprovalBlock | null>(null);
  const [forms, setForms] = useState<Record<string, ItemForm>>({});
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState("");
  const [publishingBlock, setPublishingBlock] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    setBlockId(query.get("block") || "");
    setApprovalToken(fragment.get("token") || "");
  }, []);

  const applyBlock = useCallback((nextBlock: ApprovalBlock) => {
    setBlock(nextBlock);
    setForms((current) => Object.fromEntries(
      nextBlock.items.map((item) => [item.id, current[item.id] || initialForm(item)])
    ));
  }, []);

  const loadBlock = useCallback(async () => {
    if (!blockId || !approvalToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/approval-blocks/${encodeURIComponent(blockId)}`, {
        headers: {
          Accept: "application/json",
          "X-Approval-Token": approvalToken
        },
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "Bloc TikTok indisponible.");
      }
      applyBlock(payload.block);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Bloc TikTok indisponible.");
    } finally {
      setLoading(false);
    }
  }, [approvalToken, applyBlock, blockId]);

  useEffect(() => {
    loadBlock();
  }, [loadBlock]);

  function updateForm(itemId: string, patch: Partial<ItemForm>) {
    setForms((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        ...patch
      }
    }));
  }

  async function publishItem(item: ApprovalItem) {
    const form = forms[item.id];
    if (!form || itemIssues(item, form).length > 0 || item.status === "published") {
      return false;
    }

    setPublishingId(item.id);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE}/approval-blocks/${encodeURIComponent(blockId)}/items/${encodeURIComponent(item.id)}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Approval-Token": approvalToken
          },
          body: JSON.stringify({
            title: form.title,
            privacyLevel: form.privacyLevel,
            allowComments: form.allowComments,
            allowDuet: form.allowDuet,
            allowStitch: form.allowStitch,
            commercialDisclosure: form.commercialDisclosure,
            brandOrganic: form.commercialDisclosure && form.brandOrganic,
            brandContent: form.commercialDisclosure && form.brandContent,
            isAigc: form.isAigc,
            musicUsageConfirmed: form.consent,
            expressConsent: form.consent,
            confirmedMediaSha256: item.media.sha256
          })
        }
      );
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || payload?.error || "Publication TikTok impossible.");
      }
      applyBlock(payload.block);
      return true;
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Publication TikTok impossible.");
      await loadBlock();
      return false;
    } finally {
      setPublishingId("");
    }
  }

  async function publishReadyBlock() {
    if (!block) {
      return;
    }
    const readyItems = block.items.filter((item) =>
      item.status !== "published" && item.status !== "processing" && itemIssues(item, forms[item.id]).length === 0
    );
    if (readyItems.length === 0) {
      return;
    }

    setPublishingBlock(true);
    for (const item of readyItems) {
      const published = await publishItem(item);
      if (!published) {
        break;
      }
    }
    setPublishingBlock(false);
  }

  const readyCount = useMemo(() => block?.items.filter((item) =>
    item.status !== "published" && item.status !== "processing" && itemIssues(item, forms[item.id]).length === 0
  ).length || 0, [block, forms]);
  const publishedCount = block?.items.filter((item) => item.status === "published").length || 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/">adoptan.ai</Link>
          <nav className={styles.nav} aria-label="Navigation principale">
            <Link href="/app">TikTok</Link>
            <Link href="/privacy">Confidentialite</Link>
            <Link href="/terms">Conditions</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>TikTok Blocks</p>
            <h1>{block?.title || "Bloc de publication"}</h1>
            {block ? (
              <p className={styles.meta}>
                {block.items.length} videos · {publishedCount} publiees · expire le {formatDate(block.expiresAt)}
              </p>
            ) : null}
          </div>
          <div className={styles.toolbarActions}>
            <button className={styles.secondaryButton} disabled={loading || publishingBlock} onClick={loadBlock} type="button">
              Actualiser
            </button>
            <button
              className={styles.primaryButton}
              disabled={readyCount === 0 || publishingBlock || Boolean(publishingId)}
              onClick={publishReadyBlock}
              type="button"
            >
              {publishingBlock ? "Publication en cours..." : `Publier les videos confirmees (${readyCount})`}
            </button>
          </div>
        </section>

        {loading ? <div className={styles.state}>Chargement du bloc et des comptes TikTok...</div> : null}
        {!loading && (!blockId || !approvalToken) ? (
          <div className={styles.state}>
            <strong>Lien de bloc incomplet</strong>
            <p>Ouvre le lien prive genere par le pipeline de montage.</p>
          </div>
        ) : null}
        {error ? <div className={styles.error} role="alert">{error}</div> : null}

        <div className={styles.list}>
          {block?.items.map((item, index) => {
            const form = forms[item.id];
            const creator = item.creator;
            const issues = itemIssues(item, form);
            const isBusy = publishingId === item.id;
            const isLocked = item.status === "published" || item.status === "processing" || isBusy || publishingBlock;
            const consentText = form?.commercialDisclosure && form.brandContent
              ? "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation."
              : "By posting, you agree to TikTok's Music Usage Confirmation.";

            return (
              <article className={styles.item} key={item.id}>
                <div className={styles.itemHead}>
                  <div className={styles.itemIdentity}>
                    <span className={styles.position}>{String(index + 1).padStart(2, "0")}</span>
                    {creator?.avatarUrl ? <img alt="" src={creator.avatarUrl} /> : <span className={styles.avatar}>TT</span>}
                    <div>
                      <strong>{creator?.nickname || item.accountId}</strong>
                      <a href={creator?.profileUrl || `https://www.tiktok.com/@${item.accountId}`} rel="noreferrer" target="_blank">
                        @{creator?.username || item.accountId}
                      </a>
                    </div>
                  </div>
                  <span className={`${styles.status} ${styles[item.status]}`}>{item.status}</span>
                </div>

                <div className={styles.itemBody}>
                  <div className={styles.previewColumn}>
                    <div className={styles.videoFrame}>
                      <video controls playsInline poster={item.posterUrl || undefined} preload="metadata" src={item.videoUrl} />
                    </div>
                    <div className={styles.mediaMeta}>
                      <span>{item.media.width}x{item.media.height}</span>
                      <span>{item.media.durationSec.toFixed(1)}s</span>
                      <span>{formatBytes(item.media.sizeBytes)}</span>
                      <span>H.264 MP4</span>
                    </div>
                    {item.strategy ? <p className={styles.strategy}>{item.strategy}</p> : null}
                  </div>

                  <div className={styles.controls}>
                    {item.status === "published" ? (
                      <div className={styles.receipt}>
                        <strong>Publication terminee</strong>
                        <p>Approbation recue le {item.receipt ? formatDate(item.receipt.approvedAt) : "-"}.</p>
                        {item.postUrl ? <a href={item.postUrl} rel="noreferrer" target="_blank">Ouvrir sur TikTok</a> : null}
                        <code>{item.media.sha256}</code>
                      </div>
                    ) : (
                      <>
                        <label className={styles.field}>
                          <span>Titre TikTok</span>
                          <textarea
                            disabled={isLocked}
                            maxLength={2200}
                            onChange={(event) => updateForm(item.id, { title: event.target.value })}
                            value={form?.title || ""}
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Confidentialite</span>
                          <select
                            disabled={isLocked || !creator}
                            onChange={(event) => updateForm(item.id, { privacyLevel: event.target.value })}
                            value={form?.privacyLevel || ""}
                          >
                            <option value="">Selection obligatoire</option>
                            {creator?.privacyOptions.map((option) => (
                              <option
                                disabled={form?.brandContent && option === "SELF_ONLY"}
                                key={option}
                                value={option}
                              >
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <fieldset className={styles.group} disabled={isLocked}>
                          <legend>Interactions</legend>
                          <div className={styles.checkGrid}>
                            <Check
                              checked={Boolean(form?.allowComments)}
                              disabled={Boolean(creator?.commentDisabled)}
                              label="Commentaires"
                              onChange={(checked) => updateForm(item.id, { allowComments: checked })}
                            />
                            <Check
                              checked={Boolean(form?.allowDuet)}
                              disabled={Boolean(creator?.duetDisabled)}
                              label="Duet"
                              onChange={(checked) => updateForm(item.id, { allowDuet: checked })}
                            />
                            <Check
                              checked={Boolean(form?.allowStitch)}
                              disabled={Boolean(creator?.stitchDisabled)}
                              label="Stitch"
                              onChange={(checked) => updateForm(item.id, { allowStitch: checked })}
                            />
                          </div>
                        </fieldset>

                        <fieldset className={styles.group} disabled={isLocked}>
                          <legend>Declaration du contenu</legend>
                          <Check
                            checked={Boolean(form?.commercialDisclosure)}
                            label="Ce contenu promeut une marque, un produit ou un service"
                            onChange={(checked) => updateForm(item.id, {
                              commercialDisclosure: checked,
                              brandOrganic: checked ? form?.brandOrganic || false : false,
                              brandContent: checked ? form?.brandContent || false : false
                            })}
                          />
                          {form?.commercialDisclosure ? (
                            <div className={styles.checkGrid}>
                              <Check
                                checked={form.brandOrganic}
                                label="Votre marque"
                                onChange={(checked) => updateForm(item.id, { brandOrganic: checked })}
                              />
                              <Check
                                checked={form.brandContent}
                                label="Contenu de marque"
                                onChange={(checked) => updateForm(item.id, {
                                  brandContent: checked,
                                  privacyLevel: checked && form.privacyLevel === "SELF_ONLY" ? "" : form.privacyLevel
                                })}
                              />
                            </div>
                          ) : null}
                          <Check
                            checked={Boolean(form?.isAigc)}
                            label="Contenu genere par IA"
                            onChange={(checked) => updateForm(item.id, { isAigc: checked })}
                          />
                        </fieldset>

                        <label className={styles.consent}>
                          <input
                            checked={Boolean(form?.consent)}
                            disabled={isLocked}
                            onChange={(event) => updateForm(item.id, { consent: event.target.checked })}
                            type="checkbox"
                          />
                          <span>{consentText}</span>
                        </label>

                        {issues.length > 0 ? <p className={styles.issues}>{issues.join(" · ")}</p> : null}
                        {item.error ? <p className={styles.itemError}>{item.error}</p> : null}

                        <div className={styles.publishRow}>
                          <div>
                            <span>MP4 verifie</span>
                            <code title={item.media.sha256}>{item.media.sha256.slice(0, 12)}...</code>
                          </div>
                          <button
                            className={styles.primaryButton}
                            disabled={issues.length > 0 || isLocked}
                            onClick={() => publishItem(item)}
                            type="button"
                          >
                            {isBusy ? "Envoi..." : "Publier cette video"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Check({
  checked,
  disabled = false,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`${styles.check} ${disabled ? styles.checkDisabled : ""}`}>
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
