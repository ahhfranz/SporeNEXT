import React, { useEffect, useState } from "react";
import "../styles/modprofiles.css";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArchive,
  faWeightHanging,
  faTags,
  faThumbsUp,
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocale } from "../hooks/useLocale";
import ModInstallButton from "./ModInstallButton";

function getRawReadmeUrl(githubUrl) {
  const match = githubUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const [, user, repo] = match;
  return `https://raw.githubusercontent.com/${user}/${repo}/main/README.md`;
}

function absolutizeReadmeImageUrls(readme, githubUrl) {
  const match = githubUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return readme;
  const [, user, repo] = match;
  const baseUrl = `https://raw.githubusercontent.com/${user}/${repo}/main/`;

  return readme.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
    (m, alt, relUrl) => {
      const cleanUrl = relUrl.replace(/^\.\//, "");
      return `![${alt}](${baseUrl}${cleanUrl})`;
    }
  );
}

export default function ModProfiles({
  mod,
  onClose,
  onGoHome,
  isValidating,
  isBusy,
  setIsBusy,
  installingModId,
  setInstallingModId,
  installingModKey,
  setInstallingModKey,
  installingProgress,
  installingText,
  isUninstalling,
  setIsUninstalling,
  lastCompletedModKey,
  lastCompletedAction,
  installedByKey,
  updateInstalledCache,
  refreshInstalledCache,
  __renderTick,
}) {
  const { t, locale } = useLocale();

  const [readme, setReadme] = useState(null);
  const [loadingReadme, setLoadingReadme] = useState(false);

  const showProgress = Boolean(
    mod &&
      (installingModId === mod.id ||
        (installingModKey && installingModKey === mod.mod_key))
  );

  useEffect(() => {
    setReadme(null);
    if (mod?.github_url) {
      const rawUrl = getRawReadmeUrl(mod.github_url);
      if (rawUrl) {
        setLoadingReadme(true);
        fetch(rawUrl)
          .then((res) => (res.ok ? res.text() : null))
          .then((text) => {
            if (text) {
              setReadme(absolutizeReadmeImageUrls(text, mod.github_url));
            } else {
              setReadme(null);
            }
          })
          .catch(() => setReadme(null))
          .finally(() => setLoadingReadme(false));
      }
    }
  }, [mod]);

  if (!mod) return null;

  return (
    <div className="modprofiles-backdrop" onClick={() => onClose?.(mod)}>
      <div className="modprofiles-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modprofiles-content">
          <div className="modprofiles-breadcrumbs">
            <span className="modprofiles-breadcrumb-link" onClick={onGoHome}>
              Spore NEXT
            </span>
            <span className="modprofiles-breadcrumb-separator">/</span>
            <span
              className="modprofiles-breadcrumb-link"
              onClick={() => onClose?.(mod)}
            >
              {t("modprofiles-breadcrumb-mods")}
            </span>
            <span className="modprofiles-breadcrumb-separator">/</span>
            <span className="modprofiles-breadcrumb-current">{mod.title}</span>
          </div>

          <div className="modprofiles-header">
            <div className="modprofiles-header-flex">
              <img
                src={mod.image}
                alt={mod[`tags_${locale}`] || mod.tags_en || mod.tags}
                className="modprofiles-header-img"
              />
              <div>
                <h2
                  className="modprofiles-title"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {mod.title}
                  {mod.github_url && (
                    <span
                      className="modprofiles-github-link"
                      title={t("modprofiles-github-view")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.electronAPI?.openExternal) {
                          window.electronAPI.openExternal(mod.github_url);
                        } else {
                          window.open(mod.github_url, "_blank");
                        }
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faGithub}
                        className="modprofiles-github-icon"
                      />
                    </span>
                  )}
                </h2>

                <div className="modprofiles-author">{mod.author}</div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2rem",
                    margin: "0.7rem 0 0 0",
                    minHeight: 40,
                  }}
                >
                  <div
                    className="modprofiles-actions-fixed"
                    style={{
                      minWidth: 130,
                      minHeight: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
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
                      variant="profile"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modprofiles-sections-wrapper">
            <div className="modprofiles-section">
              <div className="modprofiles-section-title">
                {t("modprofiles-section-about")}
              </div>
              <div className="modprofiles-description">
                {mod[`description_${locale}`] ||
                  mod.description_en ||
                  mod.description}
              </div>
            </div>

            <div className="modprofiles-section">
              <div className="modprofiles-section-title">
                {t("modprofiles-section-details")}
              </div>
              <ul className="modprofiles-details">
                <li>
                  <FontAwesomeIcon
                    icon={faFileArchive}
                    className="modprofiles-details-icon"
                  />
                  <b>{t("modprofiles-details-file")}</b> {mod.file}
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faWeightHanging}
                    className="modprofiles-details-icon"
                  />
                  <b>{t("modprofiles-details-size")}</b> {mod.size}
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faTags}
                    className="modprofiles-details-icon"
                  />
                  <b>{t("modprofiles-details-category")}</b>{" "}
                  {mod[`tags_${locale}`] || mod.tags_en || mod.tags}
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faThumbsUp}
                    className="modprofiles-details-icon"
                    style={{ color: "#7e5ab8" }}
                  />
                  <b>
                    {t("modprofiles-details-endorsements") || "Endorsements"}
                  </b>{" "}
                  {mod.likes}
                </li>
              </ul>

              {mod.github_url && (
                <div className="modprofiles-readme-section">
                  <div
                    className="modprofiles-section-title"
                    style={{ marginTop: "1.5rem" }}
                  >
                    {t("modprofiles-section-readme")}
                  </div>

                  {loadingReadme && (
                    <div style={{ color: "#b7e0ff", margin: "1rem 0" }}>
                      {t("modprofiles-readme-loading")}
                    </div>
                  )}

                  {!loadingReadme && readme && (
                    <div className="modprofiles-readme-markdown">
                      <ReactMarkdown
                        children={readme}
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ node, ...props }) => (
                            <img
                              {...props}
                              style={{
                                maxWidth: "100%",
                                borderRadius: "8px",
                                margin: "1rem 0",
                              }}
                              alt={props.alt}
                            />
                          ),
                          a: ({ node, ...props }) => (
                            <a
                              {...props}
                              href={props.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#7e5ab8",
                                textDecoration: "underline",
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.electronAPI?.openExternal) {
                                  window.electronAPI.openExternal(props.href);
                                } else {
                                  window.open(props.href, "_blank");
                                }
                              }}
                            />
                          ),
                        }}
                      />
                    </div>
                  )}

                  {!loadingReadme && !readme && (
                    <div style={{ color: "#b7e0ff", margin: "1rem 0" }}>
                      {t("modprofiles-readme-notfound")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
