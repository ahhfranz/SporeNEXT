import React, { useState, useEffect, useMemo, useRef } from "react";
import "../styles/modlist.css";
import ModSearchBar from "./ModSearchBar";
import FiltersBar from "./FiltersBar";
import {
  faThumbsUp,
  faDownload,
  faTrashCan,
  faSpinner,
  faTag,
  faUser,
  faWeightHanging,
  faFolderOpen,
  faBarsProgress,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { supabase } from "../lib/supabaseClient";
import loadingImg from "../../../public/assets/loading.png";
import { useLocale } from "../hooks/useLocale";
import ModListPages from "./ModListPages";
import "../styles/modlistpages.css";
import "../styles/galaxyreset.css";
import galaxyResetImg from "../../../public/assets/galaxyreset.png";
import GalaxyResetModal from "./GalaxyResetModal";
import ModInstallButton from "./ModInstallButton";
import ModApiQuickButtons from "./ModApiQuickButtons";

const SUPPORTED_MODS = ["60fps", "4gbpatch"];
const isValidModKey = (v) =>
  typeof v === "string" && v.trim().length > 0 && v.toLowerCase() !== "null";
const isAutoInstallMod = (mod) => isValidModKey(mod?.mod_key);

export default function ModList({
  setCurrentTab,
  installingModId,
  setInstallingModId,
  installingModKey,
  setInstallingModKey,
  isBusy,
  setIsBusy,
  installingProgress,
  setInstallingProgress,
  installingText,
  setInstallingText,
  isUninstalling,
  setIsUninstalling,
  selectedMod,
  setSelectedMod,
  setIsValidating,
  lastCompletedModKey,
  lastCompletedAction,
  installedRefreshToken,
  installedByKey,
  updateInstalledCache,
  refreshInstalledCache,
  __renderTick,
}) {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, locale } = useLocale();

  const [isValidating, setLocalIsValidating] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isGalaxyResetting, setIsGalaxyResetting] = useState(false);
  const [galaxyResetModal, setGalaxyResetModal] = useState({
    open: false,
    variant: "confirm",
    message: "",
    details: "",
  });

  const [endorsementSort, setEndorsementSort] = useState(null);

  const MODS_PER_PAGE = 10;
  const filteredMods = useMemo(() => {
    const s = (search || "").toLowerCase().trim();

    const base = (mods || [])
      .filter((m) => {
        if (!s) return true;
        return (
          (m.title || "").toLowerCase().includes(s) ||
          (m.file || "").toLowerCase().includes(s) ||
          (m.author || "").toLowerCase().includes(s)
        );
      })
      .filter((m) => {
        if (!selectedFilter || selectedFilter === "ALL") return true;

        const canonicalTag = (m.tags_en || m.tags || "")
          .toString()
          .toUpperCase();
        return canonicalTag === selectedFilter;
      });

    if (endorsementSort === "desc" || endorsementSort === "asc") {
      const dir = endorsementSort === "desc" ? -1 : 1;
      return base.slice().sort((a, b) => {
        const al = Number(a?.likes ?? 0);
        const bl = Number(b?.likes ?? 0);
        if (al !== bl) return (al - bl) * dir;
        return (a?.title || "").localeCompare(
          b?.title || "",
          locale || undefined,
          {
            sensitivity: "base",
            numeric: true,
          }
        );
      });
    }

    return base.slice().sort((a, b) => {
      return (a?.title || "").localeCompare(
        b?.title || "",
        locale || undefined,
        {
          sensitivity: "base",
          numeric: true,
        }
      );
    });
  }, [mods, search, selectedFilter, locale, endorsementSort]);

  useEffect(() => {
    setCurrentPage(1);
  }, [endorsementSort]);

  const totalPages = Math.ceil(filteredMods.length / MODS_PER_PAGE);
  const pagedMods = filteredMods.slice(
    (currentPage - 1) * MODS_PER_PAGE,
    currentPage * MODS_PER_PAGE
  );

  const listRef = useRef(null);

  const scrollListToTop = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = 0;
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredMods.length, totalPages]);

  useEffect(() => {
    if (!selectedMod) scrollListToTop();
  }, [selectedMod]);

  useEffect(() => {
    scrollListToTop();
  }, [currentPage]);

  useEffect(() => {
    scrollListToTop();
  }, [search, selectedFilter]);

  useEffect(() => {
    setIsValidating(isValidating);
  }, [isValidating, setIsValidating]);

  useEffect(() => {
    async function fetchMods() {
      setLoading(true);
      const { data: modsData, error: modsError } = await supabase
        .from("mods")
        .select("*");

      const { data: likesData } = await supabase
        .from("mod_likes")
        .select("mod_id", { count: "exact", head: false });

      const likesCount = {};
      if (likesData) {
        likesData.forEach((like) => {
          likesCount[like.mod_id] = (likesCount[like.mod_id] || 0) + 1;
        });
      }

      if (!modsError && modsData) {
        const modsWithLikes = modsData.map((mod) => {
          const validKey = isValidModKey(mod.mod_key);
          const cached = validKey ? installedByKey?.[mod.mod_key] : undefined;
          return {
            ...mod,
            likes: likesCount[mod.id] || 0,
            installed: validKey
              ? typeof cached === "boolean"
                ? cached
                : null
              : false,
          };
        });

        setMods(modsWithLikes);
      }

      setLoading(false);
      setLocalIsValidating(false);
    }

    fetchMods();
  }, []);

  useEffect(() => {
    setMods((prev) => {
      if (!Array.isArray(prev) || !prev.length) return prev;
      let changed = false;
      const next = prev.map((m) => {
        if (!isValidModKey(m?.mod_key)) return m;
        const cached = installedByKey?.[m.mod_key];
        if (typeof cached !== "boolean") return m;
        if (m.installed === cached) return m;
        changed = true;
        return { ...m, installed: cached };
      });
      return changed ? next : prev;
    });
  }, [installedByKey]);

  const openGalaxyResetConfirm = () => {
    setGalaxyResetModal({
      open: true,
      variant: "confirm",
      message:
        t("galaxyreset-confirm") ||
        "Esto reiniciará tu galaxia de Spore haciendo un backup de %AppData%\\Roaming\\Spore\\Games.",
      details:
        t("galaxyreset-confirm-details") ||
        "Se renombrará la carpeta Games a Games.backup (o Games.backup1, Games.backup2, etc.).",
    });
  };

  const runGalaxyReset = async () => {
    if (isGalaxyResetting || isBusy || installingModId || installingModKey)
      return;

    setIsGalaxyResetting(true);
    try {
      const res = await window.electronAPI.galaxyReset();
      if (res?.ok) {
        setGalaxyResetModal({
          open: true,
          variant: "success",
          message: t("galaxyreset-success") || "Galaxy reset completado.",
          details: res?.to ? String(res.to) : "",
        });
      } else {
        const code = res?.code;
        const isMissingGames = code === "GAMES_FOLDER_NOT_FOUND";
        const isMissingSpore = code === "SPORE_FOLDER_NOT_FOUND";

        const localizedMessage = isMissingGames
          ? t("galaxyreset-missing-games") ||
            "Para reiniciar la galaxia, debes iniciar Spore al menos una vez para que se vuelva a generar otra carpeta."
          : isMissingSpore
          ? t("galaxyreset-missing-spore") ||
            "Carpeta de Spore no encontrada en %AppData%\\Roaming."
          : t("galaxyreset-error") || "Galaxy reset falló.";

        const localizedDetails = isMissingGames
          ? (t("galaxyreset-error-details-games") ||
              "No se encontró la carpeta Games en:") +
            "\n" +
            (res?.path || "")
          : isMissingSpore
          ? (t("galaxyreset-error-details-spore") ||
              "No se encontró la carpeta Spore en:") +
            "\n" +
            (res?.path || "")
          : res?.message || "";

        setGalaxyResetModal({
          open: true,
          variant: "error",
          message: localizedMessage,
          details: localizedDetails,
        });
      }
    } catch (e) {
      setGalaxyResetModal({
        open: true,
        variant: "error",
        message: t("galaxyreset-error") || "Galaxy reset falló.",
        details: String(e?.message || e),
      });
    } finally {
      setIsGalaxyResetting(false);
    }
  };

  const handleGalaxyReset = () => {
    if (isGalaxyResetting || isBusy || installingModId || installingModKey)
      return;
    openGalaxyResetConfirm();
  };

  return (
    <div>
      {galaxyResetModal.open && (
        <GalaxyResetModal
          variant={galaxyResetModal.variant}
          message={galaxyResetModal.message}
          details={galaxyResetModal.details}
          isBusy={isGalaxyResetting}
          onCancel={() =>
            setGalaxyResetModal((prev) => ({ ...prev, open: false }))
          }
          onClose={() =>
            setGalaxyResetModal((prev) => ({ ...prev, open: false }))
          }
          onConfirm={async () => {
            await runGalaxyReset();
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.2rem",
          marginBottom: "1.2rem",
        }}
      >
        <ModSearchBar value={search} onChange={setSearch} />

        <FiltersBar selected={selectedFilter} onSelect={setSelectedFilter} />

        <button
          type="button"
          className="galaxyreset-root"
          onClick={handleGalaxyReset}
          disabled={isGalaxyResetting || isBusy}
          title={t("galaxyreset-title")}
        >
          <img
            src={galaxyResetImg}
            alt={t("galaxyreset-alt") || "Galaxy Reset"}
            className="galaxyreset-icon"
          />
          <span className="galaxyreset-text">
            {t("galaxyreset-label") || "Galaxy Reset"}
          </span>
        </button>

        <ModApiQuickButtons disabled={isGalaxyResetting || isBusy} />
      </div>

      <div className="modlist-table" ref={listRef}>
        <div className="modlist-header">
          <div className="modlist-header-cell">
            <FontAwesomeIcon
              icon={faFolderOpen}
              className="modlist-header-icon"
            />
            {t("modlist-header-name")}
          </div>
          <div className="modlist-header-cell">
            <FontAwesomeIcon
              icon={faBarsProgress}
              className="modlist-header-icon"
            />
            {t("modlist-header-action")}
          </div>
          <div className="modlist-header-cell">
            <FontAwesomeIcon
              icon={faWeightHanging}
              className="modlist-header-icon"
            />
            {t("modlist-header-size")}
          </div>
          <div
            className="modlist-header-cell modlist-header-cell--clickable"
            role="button"
            tabIndex={0}
            aria-label={
              (t("modlist-header-endorsements") || "Endorsements") +
              ". " +
              (t("modlist-sort-endorsements") || "Click to sort")
            }
            title={
              endorsementSort === "desc"
                ? t("modlist-sort-endorsements-desc") ||
                  "Sorted by endorsements (high → low). Click to sort low → high."
                : endorsementSort === "asc"
                ? t("modlist-sort-endorsements-asc") ||
                  "Sorted by endorsements (low → high). Click to reset sorting."
                : t("modlist-sort-endorsements") ||
                  "Click to sort by endorsements."
            }
            onClick={() => {
              setEndorsementSort((prev) =>
                prev === null ? "desc" : prev === "desc" ? "asc" : null
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEndorsementSort((prev) =>
                  prev === null ? "desc" : prev === "desc" ? "asc" : null
                );
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FontAwesomeIcon
              icon={faThumbsUp}
              className="modlist-header-icon"
            />
            {t("modlist-header-endorsements")}
            <span
              aria-hidden="true"
              style={{
                marginLeft: 2,
                opacity: endorsementSort ? 0.95 : 0.6,
                fontSize: "0.95em",
              }}
            >
              {endorsementSort === "desc"
                ? "▼"
                : endorsementSort === "asc"
                ? "▲"
                : "⇅"}
            </span>
          </div>
          <div className="modlist-header-cell">
            <FontAwesomeIcon icon={faUser} className="modlist-header-icon" />
            {t("modlist-header-author")}
          </div>
          <div className="modlist-header-cell">
            <FontAwesomeIcon icon={faTag} className="modlist-header-icon" />
            {t("modlist-header-category")}
          </div>
        </div>

        {loading && mods.length === 0 && (
          <div className="modlist-loading-overlay" aria-hidden="true">
            <img
              src={loadingImg}
              alt={t("modlist-loading-alt")}
              className="modlist-loading-img"
            />
          </div>
        )}

        {!loading && filteredMods.length === 0 && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#b7e0ff",
              fontSize: "1.1rem",
            }}
          >
            {t("modlist-no-mods-found")}
          </div>
        )}
        {pagedMods.map((mod) => {
          return (
            <div
              className="modlist-row"
              key={mod.mod_key || mod.id}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedMod(mod)}
            >
              <div className="modlist-namecell">
                <img src={mod.image} alt={mod.tags} className="modlist-icon" />
                <div>
                  <div className="modlist-name">{mod.title}</div>
                  <div className="modlist-file">{mod.file}</div>
                </div>
              </div>

              <div>
                <ModInstallButton
                  mod={mod}
                  installedByKey={installedByKey}
                  updateInstalledCache={updateInstalledCache}
                  installingModId={installingModId}
                  installingModKey={installingModKey}
                  setInstallingModId={setInstallingModId}
                  setInstallingModKey={setInstallingModKey}
                  installingProgress={installingProgress}
                  installingText={installingText}
                  isBusy={isBusy}
                  setIsBusy={setIsBusy}
                  isUninstalling={isUninstalling}
                  setIsUninstalling={setIsUninstalling}
                  t={t}
                  variant="list"
                />
              </div>

              <div>
                <span className="modlist-size">{mod.size}</span>
              </div>
              <div>
                <span className="modlist-endorsements">
                  <FontAwesomeIcon
                    icon={faThumbsUp}
                    style={{ marginRight: "6px", color: "#7e5ab8" }}
                  />
                  {mod.likes}
                </span>
              </div>
              <div className="modlist-author">{mod.author}</div>
              <div>
                <span
                  className={
                    "modlist-category" +
                    ((mod[`tags_${locale}`] || mod.tags_en || mod.tags) ===
                    "OPTIMIZATION"
                      ? " optimization"
                      : "")
                  }
                >
                  {mod[`tags_${locale}`] || mod.tags_en || mod.tags}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <ModListPages
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
