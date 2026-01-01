import { useState } from "react";
import "../styles/sidebar.css";
import SidebarHeader from "./SidebarHeader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBarsProgress,
  faGear,
  faBookOpenReader,
  faCircleQuestion,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { useLocale } from "../hooks/useLocale";

export default function Sidebar({ currentTab, setCurrentTab }) {
  const [showSporepediaTooltip, setShowSporepediaTooltip] = useState(false);
  const { t } = useLocale();

  const handleTabClick = (tab) => {
    if (tab === "mods") {
      setCurrentTab(currentTab === "mods" ? "main" : "mods");
      return;
    }

    if (currentTab === tab) {
      setCurrentTab("main");
    } else {
      setCurrentTab(tab);
    }
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-top">
        <SidebarHeader />
      </div>
      <div className="sidebar-middle">
        <button
          className={currentTab === "mods" ? "active" : ""}
          onClick={() => handleTabClick("mods")}
        >
          <FontAwesomeIcon icon={faBarsProgress} className="sidebar-icon" />
          <span className="sidebar-label">{t("sidebar-mods")}</span>
        </button>

        <button
          className={currentTab === "downloads" ? "active" : ""}
          onClick={() => handleTabClick("downloads")}
        >
          <FontAwesomeIcon icon={faDownload} className="sidebar-icon" />
          <span className="sidebar-label">
            {t("sidebar-downloads") ?? "Downloads"}
          </span>
        </button>

        <div className="sidebar-sporepedia-wrapper">
          <button
            className={`sidebar-disabled${
              currentTab === "sporepedia" ? " active" : ""
            }`}
            tabIndex={-1}
            onMouseEnter={() => setShowSporepediaTooltip(true)}
            onMouseLeave={() => setShowSporepediaTooltip(false)}
          >
            <FontAwesomeIcon icon={faBookOpenReader} className="sidebar-icon" />
            <span className="sidebar-label">{t("sidebar-sporepedia")}</span>
          </button>
          {showSporepediaTooltip && (
            <div className="sidebar-tooltip">{t("sidebar-coming-soon")}</div>
          )}
        </div>
      </div>
      <div className="sidebar-bottom">
        <button
          className={currentTab === "faq" ? "active" : ""}
          onClick={() => handleTabClick("faq")}
        >
          <FontAwesomeIcon icon={faCircleQuestion} className="sidebar-icon" />
          <span className="sidebar-label">{t("sidebar-faq")}</span>
        </button>
        <button
          className={currentTab === "settings" ? "active" : ""}
          onClick={() => handleTabClick("settings")}
        >
          <FontAwesomeIcon icon={faGear} className="sidebar-icon" />
          <span className="sidebar-label">{t("sidebar-settings")}</span>
        </button>
      </div>
    </nav>
  );
}
