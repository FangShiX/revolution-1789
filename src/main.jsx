import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Download,
  Upload,
  RotateCcw,
  X,
  Library,
  Check,
  Sun,
  Moon,
  History,
} from "lucide-react";
import { campaign as publicCampaign } from "./data/publicCampaign.js";
import {
  advance,
  newSave,
  rewind,
  validateCampaign,
  validateSave,
  choiceAvailable,
} from "./engine.js";
import "./styles.css";

const STORAGE = "revolution-1789-v1";
function readSave(c) {
  try {
    return validateSave(
      JSON.parse(localStorage.getItem(`${STORAGE}:${c.id}`)),
      c,
    );
  } catch {
    return newSave(c);
  }
}
function download(name, value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Icon({ label, children, ...props }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

function App() {
  const [campaign, setCampaign] = useState(() =>
    validateCampaign(publicCampaign),
  );
  const [save, setSave] = useState(() => readSave(publicCampaign));
  const [panel, setPanel] = useState(null),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("revolution-theme") || "light";
    } catch {
      return "light";
    }
  });
  const [large, setLarge] = useState(false),
    [importType, setImportType] = useState("save");
  const storyRef = useRef(null),
    fileRef = useRef(null);
  const nodes = useMemo(
    () => new Map(campaign.sections.map((n) => [n.id, n])),
    [campaign],
  );
  const current = nodes.get(save.path.at(-1)),
    endings = campaign.sections.filter((n) => n.terminal_type);
  const isPublic = campaign.id === publicCampaign.id;
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE}:${campaign.id}`, JSON.stringify(save));
    } catch {
      setNotice("浏览器存储不可用，请导出存档保留进度。");
    }
  }, [save, campaign.id]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("revolution-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    document.title = `${current.title || `第 ${current.id} 节`} · 革命之间`;
  }, [current]);
  useEffect(() => {
    if (!panel && !confirm) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    const handle = (e) => {
      if (e.key === "Escape") {
        setPanel(null);
        setConfirm(false);
      }
      if (e.key === "Tab") {
        const els = document
          .querySelector('[role="dialog"]')
          ?.querySelectorAll("button,input,a[href]");
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    document.body.style.overflow = "hidden";
    const t = setTimeout(
      () => document.querySelector('[role="dialog"] button')?.focus(),
      0,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [panel, confirm]);
  function move(id) {
    try {
      const next = advance(save, campaign, id);
      setSave(next);
    } catch (error) {
      setNotice(error.message);
      return;
    }
    requestAnimationFrame(() => {
      storyRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  function rollback(i) {
    setSave((s) => rewind(s, i));
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function importFile(type) {
    setImportType(type);
    fileRef.current.value = "";
    fileRef.current.click();
  }
  async function onImport(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 8000000) throw new Error("文件超过 8 MB。");
      const data = JSON.parse(await file.text());
      if (importType === "save") {
        setSave(validateSave(data, campaign));
        setNotice("存档已恢复。");
      } else {
        if (data.id === publicCampaign.id) {
          throw new Error("本地剧本不能覆盖内置剧本的存档标识。");
        }
        const c = validateCampaign({
          ...data,
          id: data.id || "local-book",
          title: data.title || "原书档案",
          sources: data.sources || [],
        });
        setCampaign(c);
        setSave(readSave(c));
        setNotice("本地剧本已载入，文件没有上传。");
      }
      setPanel(null);
    } catch (error) {
      setNotice(`导入失败：${error.message}`);
    }
  }
  function restart() {
    setSave((s) => ({
      ...newSave(campaign),
      endings: s.endings,
      bookmarks: s.bookmarks,
    }));
    setConfirm(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const sources = (campaign.sources || []).filter((s) =>
    (current.sourceIds || []).includes(s.id),
  );
  return (
    <div className={`app ${large ? "large-type" : ""}`}>
      <a className="skip-link" href="#story">
        跳至正文
      </a>
      <header className="masthead">
        <a className="wordmark" href="#story" aria-label="革命之间，回到正文">
          <span className="seal">
            R<span>1789</span>
          </span>
          <span>
            革命之间<small>ENTRE LES RÉVOLUTIONS</small>
          </span>
        </a>
        <div className="header-meta">
          <span className="live-dot" />
          {isPublic ? "历史纪事" : "本地原书"}
          <span className="version">1.0</span>
        </div>
        <nav aria-label="游戏工具">
          <Icon
            label="回退一步"
            disabled={save.path.length < 2}
            onClick={() => rollback(save.path.length - 2)}
          >
            <ArrowLeft />
          </Icon>
          <Icon label="旅程记录" onClick={() => setPanel("history")}>
            <History />
          </Icon>
          <Icon label="档案与存档" onClick={() => setPanel("library")}>
            <Library />
          </Icon>
          <Icon
            label={theme === "light" ? "切换深色" : "切换浅色"}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Icon>
          <Icon label="重新开始" onClick={() => setConfirm(true)}>
            <RotateCcw />
          </Icon>
        </nav>
      </header>
      <main className="game-layout">
        <aside className="era-rail" aria-label="时代线">
          <span className="eyebrow">法国 / 1789—1799</span>
          {["1789", "1791", "1792", "1793", "1794", "1795", "1799"].map((y) => (
            <div
              key={y}
              className={
                String(current.date).includes(y) ? "era active" : "era"
              }
            >
              <span />
              {y}
            </div>
          ))}
          <button className="text-action" onClick={() => setPanel("history")}>
            <History size={16} />
            旅程记录<span>{save.path.length}</span>
          </button>
          <p className="rail-note">
            {isPublic ? "一个记录者的革命岁月" : campaign.title}
          </p>
        </aside>
        <div className="reading-column">
          <div className="chapter-bar">
            <span>{current.date || "革命年代"}</span>
            <span>档案 {String(current.id).padStart(3, "0")}</span>
          </div>
          <article id="story" ref={storyRef} tabIndex={-1} className="story">
            <span className="eyebrow">
              {current.terminal_type ? "你的结局" : "身在历史之中"}
            </span>
            <h1>{current.title || `第 ${current.id} 节`}</h1>
            <div className="story-tools">
              <button
                aria-pressed={save.bookmarks.includes(current.id)}
                onClick={() =>
                  setSave((s) => ({
                    ...s,
                    bookmarks: s.bookmarks.includes(current.id)
                      ? s.bookmarks.filter((id) => id !== current.id)
                      : [...s.bookmarks, current.id],
                  }))
                }
              >
                <Bookmark
                  size={16}
                  fill={
                    save.bookmarks.includes(current.id)
                      ? "currentColor"
                      : "none"
                  }
                />
                留存
              </button>
              <button
                aria-label="放大正文"
                aria-pressed={large}
                onClick={() => setLarge(!large)}
              >
                Aa
              </button>
            </div>
            <div className="prose">
              {current.text
                .split(/\n+/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </article>
          <section className="decision" aria-label="当前选择">
            <div className="decision-heading">
              <span className="eyebrow">
                {current.terminal_type ? "旅程暂告一段落" : "你的决定"}
              </span>
              <span>
                {current.terminal_type
                  ? "档案已收藏"
                  : `${current.choices.length} 条道路`}
              </span>
            </div>
            {current.terminal_type ? (
              <div className="ending-actions">
                <button className="primary" onClick={() => setPanel("endings")}>
                  <BookOpen size={18} />
                  查看结局收藏
                </button>
                <button onClick={() => setConfirm(true)}>
                  <RotateCcw size={18} />
                  再走一条路
                </button>
              </div>
            ) : (
              current.choices.map((ch, i) => (
                <button
                  className="choice"
                  key={ch.id}
                  disabled={!choiceAvailable(save, ch)}
                  title={
                    choiceAvailable(save, ch) ? undefined : "需要先收集相关线索"
                  }
                  onClick={() => move(ch.id)}
                >
                  <span className="choice-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{ch.label}</span>
                  <ArrowRight size={20} />
                </button>
              ))
            )}
          </section>
          {current.historicalNote && (
            <section className="history-note">
              <span className="eyebrow">史实与注解</span>
              <p>{current.historicalNote}</p>
              {sources.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                  <ArrowRight size={14} />
                </a>
              ))}
            </section>
          )}
          <footer className="reading-footer">
            <span>{campaign.title || "原书档案"}</span>
            <button onClick={() => setPanel("about")}>资料与版本</button>
          </footer>
        </div>
        <aside className="context-rail">
          <figure>
            <img
              src={`${import.meta.env.BASE_URL}art/tennis-court-oath.jpg`}
              alt="雅克·路易·大卫笔下的网球厅宣誓，代表们在大厅中举手宣誓"
            />
            <figcaption>
              网球厅宣誓 · 大卫
              <br />
              Musée Carnavalet / CC0
            </figcaption>
          </figure>
          <div className="context-title">
            <span className="eyebrow">你留下的痕迹</span>
            <strong>
              {new Set(save.path).size}
              <small>段经历</small>
            </strong>
          </div>
          <button
            className="collection-link"
            onClick={() => setPanel("endings")}
          >
            <BookOpen size={18} />
            <span>结局收藏</span>
            <span>
              {save.endings.length} / {endings.length}
            </span>
          </button>
          <div className="recent">
            <span className="eyebrow">来路</span>
            {save.path.slice(-4).map((id, i) => (
              <p key={`${i}-${id}`}>{nodes.get(id).title || `第 ${id} 节`}</p>
            ))}
          </div>
        </aside>
      </main>
      <input
        hidden
        type="file"
        ref={fileRef}
        accept="application/json,.json"
        onChange={onImport}
      />
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {(panel || confirm) && (
        <div
          className="scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPanel(null);
              setConfirm(false);
            }
          }}
        >
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="dialog-head">
              <h2 id="dialog-title">
                {confirm
                  ? "重新出发？"
                  : {
                      history: "旅程记录",
                      library: "档案与存档",
                      endings: "结局收藏",
                      about: "资料与版本",
                    }[panel]}
              </h2>
              <Icon
                label="关闭"
                onClick={() => {
                  setPanel(null);
                  setConfirm(false);
                }}
              >
                <X />
              </Icon>
            </div>
            {confirm ? (
              <>
                <p>本次路线将回到起点，结局收藏和留存档案会保留。</p>
                <div className="ending-actions">
                  <button onClick={() => setConfirm(false)}>
                    继续当前旅程
                  </button>
                  <button className="primary" onClick={restart}>
                    重新开始
                  </button>
                </div>
              </>
            ) : (
              <>
                {panel === "history" && (
                  <div className="history-list">
                    {save.path.map((id, i) => (
                      <button key={i} onClick={() => rollback(i)}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>
                            {nodes.get(id).title || `第 ${id} 节`}
                          </strong>
                          <small>{nodes.get(id).date}</small>
                        </div>
                        {i === save.path.length - 1 ? (
                          <Check size={18} />
                        ) : (
                          <ArrowLeft size={18} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {panel === "library" && (
                  <>
                    <div className="library-actions">
                      <button
                        onClick={() => download("revolution-save.json", save)}
                      >
                        <Download />
                        导出存档
                      </button>
                      <button onClick={() => importFile("save")}>
                        <Upload />
                        导入存档
                      </button>
                      <button onClick={() => importFile("campaign")}>
                        <BookOpen />
                        载入本地剧本
                      </button>
                      {!isPublic && (
                        <button
                          onClick={() => {
                            setCampaign(publicCampaign);
                            setSave(readSave(publicCampaign));
                            setPanel(null);
                          }}
                        >
                          <Library />
                          历史纪事
                        </button>
                      )}
                    </div>
                    <h3>留存档案</h3>
                    {save.bookmarks.length ? (
                      save.bookmarks.map((id) => (
                        <p key={id}>{nodes.get(id).title || `第 ${id} 节`}</p>
                      ))
                    ) : (
                      <p className="muted">尚无留存。</p>
                    )}
                    <p className="muted">
                      本地文件在浏览器内读取，不会上传。不同剧本的存档独立保存。
                    </p>
                  </>
                )}
                {panel === "endings" && (
                  <div className="ending-list">
                    {endings.map((n) => (
                      <div
                        key={n.id}
                        className={
                          save.endings.includes(n.id) ? "discovered" : ""
                        }
                      >
                        <BookOpen size={20} />
                        <div>
                          <strong>
                            {save.endings.includes(n.id)
                              ? n.title || `结局 ${n.id}`
                              : "尚未到达"}
                          </strong>
                          {save.endings.includes(n.id) && (
                            <p>{n.text.split("\n")[0]}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {panel === "about" && (
                  <>
                    <p>革命之间 1.0.0</p>
                    <p>
                      历史纪事是依据公开历史资料创作的互动故事。玩家及个人经历为虚构，选择影响个人道路，不代表历史事实发生了变化。
                    </p>
                    <h3>历史资料</h3>
                    {(campaign.sources || []).map((s) => (
                      <p key={s.id}>
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.title}
                        </a>
                      </p>
                    ))}
                    <h3>图像</h3>
                    <p>
                      <a
                        href="https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/serment-du-jeu-de-paume-le-20-juin-1789"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Serment du Jeu de paume, le 20 juin 1789
                      </a>{" "}
                      · Jacques-Louis David · Paris Musées / Musée Carnavalet ·
                      CC0。
                    </p>
                    <p>
                      原书模式需要自行载入本地资料。公开发行不附带原书译文或扫描文件。
                    </p>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>档案读取遇到问题</h1>
        <p>{this.state.error.message}</p>
        <button onClick={() => window.location.reload()}>重新加载</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
