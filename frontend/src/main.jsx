import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  GitCompareArrows,
  BarChart3,
  History,
  Pencil,
  Power,
  LogOut,
  Plus,
  Flag,
  RotateCcw,
  Settings,
  Ship,
  Trash2,
  Upload,
  UserCog,
} from "lucide-react";
import "./styles.css";

const API = "/api";

function headers(token, contentType = true) {
  return {
    ...(contentType ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || response.statusText);
  }
  return response.json();
}

function flattenTree(nodes, depth = 0) {
  return nodes.flatMap((node) => [{ ...node, depth }, ...flattenTree(node.children || [], depth + 1)]);
}

function collectLevel(nodes, level) {
  return flattenTree(nodes).filter((item) => item.active !== false && item.level === level);
}

function collectInspectionChildren(node) {
  if (node.active === false) return [];
  if (node.is_inspection) return [node];
  return flattenTree(node.children || []).filter((item) => item.active !== false && item.is_inspection);
}

function App() {
  const [role, setRole] = useState("admin");
  const [user, setUser] = useState("yard-user");
  const [authToken, setAuthToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [page, setPage] = useState("main");
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [tree, setTree] = useState([]);
  const [ships, setShips] = useState([]);
  const [shipId, setShipId] = useState("");
  const [mainEditShipId, setMainEditShipId] = useState("");
  const [progress, setProgress] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [overview, setOverview] = useState(null);
  const [seaTrialDetail, setSeaTrialDetail] = useState(null);
  const [seaTrialDetailShipId, setSeaTrialDetailShipId] = useState(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importMode, setImportMode] = useState("partial");
  const [showInactive, setShowInactive] = useState(false);
  const [showInactivePanel, setShowInactivePanel] = useState(false);
  const [inactiveItems, setInactiveItems] = useState([]);
  const [newProject, setNewProject] = useState("");
  const [newShip, setNewShip] = useState({ hull_no: "", name: "" });
  const [editingShipId, setEditingShipId] = useState(null);
  const [shipDraft, setShipDraft] = useState({ hull_no: "", name: "" });
  const [newItem, setNewItem] = useState({ parent_code: "", code: "", title_zh: "", title_en: "" });
  const [editingItpItemId, setEditingItpItemId] = useState(null);
  const [itpItemDraft, setItpItemDraft] = useState({ parent_code: "", code: "", title_zh: "", title_en: "" });
  const [expanded, setExpanded] = useState({});
  const [adminExpanded, setAdminExpanded] = useState({});

  const flatTree = useMemo(() => flattenTree(tree), [tree]);
  const inactiveChildrenByParent = useMemo(() => {
    const children = {};
    for (const item of inactiveItems) {
      if (item.parent_id) children[item.parent_id] = true;
    }
    return children;
  }, [inactiveItems]);
  const thirdLevelGroups = useMemo(() => collectLevel(tree, 3), [tree]);
  const fourthLevelGroups = useMemo(() => collectLevel(tree, 4), [tree]);
  const progressByItem = useMemo(() => Object.fromEntries(progress.map((item) => [item.item_id, item])), [progress]);
  const itpDone = progress.filter((item) => item.status === "done").length;
  const itpPercent = progress.length ? Math.round((itpDone / progress.length) * 100) : 0;
  const selectedProject = projects.find((project) => String(project.id) === String(projectId));
  const selectedShip = ships.find((ship) => String(ship.id) === String(shipId));
  const editingItpItem = flatTree.find((item) => item.id === editingItpItemId);
  const isMainEditingShip = page === "main" && mainEditShipId && String(mainEditShipId) === String(shipId);
  const overviewShips = useMemo(
    () => [...(overview?.ships || [])].sort((left, right) => {
      if (right.before_sea_trial_done !== left.before_sea_trial_done) {
        return right.before_sea_trial_done - left.before_sea_trial_done;
      }
      if (right.completion_done !== left.completion_done) {
        return right.completion_done - left.completion_done;
      }
      return String(left.hull_no).localeCompare(String(right.hull_no), undefined, { numeric: true });
    }),
    [overview],
  );
  const mainShipCards = useMemo(
    () => overviewShips.filter((ship) => String(ship.project_id) === String(projectId)),
    [overviewShips, projectId],
  );

  async function loginWithPassword() {
    const result = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
    setRole(result.role);
    setUser(result.user);
    setAuthToken(result.token);
    setPage("main");
    setIsLoggedIn(true);
    setMessage("");
    setLoginPassword("");
  }

  function logout() {
    setIsLoggedIn(false);
    setAuthToken("");
    setLoginPassword("");
    setProjectId("");
    setShipId("");
    setMainEditShipId("");
    setTree([]);
    setShips([]);
    setProgress([]);
  }

  async function loadProjects() {
    const data = await request("/projects");
    setProjects(data);
    if (!data.some((project) => String(project.id) === String(projectId))) {
      setProjectId(data[0] ? String(data[0].id) : "");
    }
  }

  async function loadOverview() {
    setOverview(await request("/overview"));
  }

  async function loadSeaTrialDetail(ship) {
    if (String(seaTrialDetailShipId) === String(ship.ship_id)) {
      setSeaTrialDetailShipId(null);
      setSeaTrialDetail(null);
      return;
    }
    setSeaTrialDetailShipId(ship.ship_id);
    setSeaTrialDetail(await request(`/ships/${ship.ship_id}/unfinished-before-sea-trial`));
  }

  function startMainShipEdit(ship) {
    setShipId(String(ship.ship_id ?? ship.id));
    setMainEditShipId(String(ship.ship_id ?? ship.id));
    setProgress([]);
    setExpanded({});
  }

  async function loadProjectData(id = projectId, options = {}) {
    if (!id) return;
    const [treeData, shipData, historyData] = await Promise.all([
      request(`/projects/${id}/tree?include_inactive=${showInactive ? "true" : "false"}`),
      request(`/projects/${id}/ships`),
      request(`/history?project_id=${id}&limit=80`),
    ]);
    setTree(treeData);
    setShips(shipData);
    setHistoryRows(historyData);
    if (!options.preserveMainExpanded) setExpanded({});
    if (!options.preserveAdminExpanded) setAdminExpanded({});
    if (!shipData.some((ship) => String(ship.id) === String(shipId))) {
      setShipId(shipData[0] ? String(shipData[0].id) : "");
    }
  }

  async function loadInactiveItems(id = projectId) {
    if (!id) {
      setInactiveItems([]);
      return;
    }
    const fullTree = await request(`/projects/${id}/tree?include_inactive=true`);
    setInactiveItems(flattenTree(fullTree).filter((item) => item.active === false));
  }

  async function loadProgress(id = shipId) {
    if (!id) {
      setProgress([]);
      return;
    }
    setProgress(await request(`/ships/${id}/progress`));
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    loadProjects().catch((error) => setMessage(error.message));
    loadOverview().catch((error) => setMessage(error.message));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadProjectData(projectId).catch((error) => setMessage(error.message));
    if (showInactivePanel) loadInactiveItems(projectId).catch((error) => setMessage(error.message));
    setMainEditShipId("");
  }, [projectId, isLoggedIn, showInactive, showInactivePanel]);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadProgress(shipId).catch((error) => setMessage(error.message));
  }, [shipId, isLoggedIn]);

  async function createProject() {
    if (!newProject.trim()) return;
    const project = await request("/projects", {
      method: "POST",
      headers: headers(authToken),
      body: JSON.stringify({ name: newProject.trim() }),
    });
    setNewProject("");
    await loadProjects();
    await loadOverview();
    setProjectId(String(project.id));
    setMessage(`Project ${project.name} created.`);
  }

  async function addShip() {
    if (!projectId || !newShip.hull_no.trim()) return;
    const ship = await request("/ships", {
      method: "POST",
      headers: headers(authToken),
      body: JSON.stringify({ project_id: Number(projectId), hull_no: newShip.hull_no.trim(), name: newShip.name.trim() || null }),
    });
    setNewShip({ hull_no: "", name: "" });
    await loadProjectData(projectId);
    await loadOverview();
    setShipId(String(ship.id));
  }

  async function addItem() {
    if (!projectId || !newItem.code.trim()) return;
    await request("/itp-items", {
      method: "POST",
      headers: headers(authToken),
      body: JSON.stringify({
        project_id: Number(projectId),
        parent_code: newItem.parent_code.trim() || null,
        code: newItem.code.trim(),
        title_zh: newItem.title_zh.trim() || null,
        title_en: newItem.title_en.trim() || newItem.code.trim(),
      }),
    });
    setNewItem({ parent_code: "", code: "", title_zh: "", title_en: "" });
    await loadProjectData(projectId);
    await loadOverview();
  }

  async function previewImport() {
    if (!selectedFile) return;
    const form = new FormData();
    form.append("file", selectedFile);
    const response = await fetch(`${API}/import/preview`, {
      method: "POST",
      headers: headers(authToken, false),
      body: form,
    });
    if (!response.ok) throw new Error((await response.json()).detail || "Import preview failed");
    setPreview(await response.json());
  }

  async function applyImport() {
    if (!selectedFile) return;
    if (importMode === "global" && !window.confirm("Global Replace will deactivate active ITP items that are missing from this Excel. Continue?")) return;
    const form = new FormData();
    form.append("file", selectedFile);
    const response = await fetch(`${API}/import/apply?mode=${importMode}`, {
      method: "POST",
      headers: headers(authToken, false),
      body: form,
    });
    if (!response.ok) throw new Error((await response.json()).detail || "Import failed");
    const project = await response.json();
    setPreview(null);
    await loadProjects();
    await loadOverview();
    setProjectId(String(project.id));
    setMessage(`Imported ${project.name} with ${importMode === "global" ? "Global Replace" : "Partial Update"}.`);
  }

  async function exportItp() {
    if (!projectId || !selectedProject) return;
    const response = await fetch(`${API}/projects/${projectId}/export`, {
      method: "GET",
      headers: headers(authToken, false),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail || "Export failed");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedProject.name} ITP.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function exportShipRecords(ship) {
    const response = await fetch(`${API}/ships/${ship.id}/records/export`, {
      method: "GET",
      headers: headers(authToken, false),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail || "Export failed");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ship.hull_no} Inspection Records.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function importShipRecords(ship, file) {
    if (!file) return;
    if (!window.confirm(`Import inspection records for ${ship.hull_no}? This will overwrite current status for matched items.`)) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API}/ships/${ship.id}/records/import`, {
      method: "POST",
      headers: headers(authToken, false),
      body: form,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail || "Import failed");
    }
    const result = await response.json();
    await loadProjectData(projectId, { preserveAdminExpanded: true });
    if (String(ship.id) === String(shipId)) await loadProgress(shipId);
    await loadOverview();
    setMessage(`Imported ${result.imported} records for ${ship.hull_no}. Skipped ${result.skipped}.`);
  }

  async function updateProgress(item, status) {
    if (!shipId) return;
    await request(`/ships/${shipId}/progress/${item.id}`, {
      method: "PUT",
      headers: headers(authToken),
      body: JSON.stringify({
        status,
        notes: progressByItem[item.id]?.notes || "",
        updated_by: user,
        expected_revision: progressByItem[item.id]?.revision ?? 0,
      }),
    });
    await loadProgress(shipId);
    await loadOverview();
  }

  async function deleteProject() {
    if (!projectId || !selectedProject) return;
    if (!window.confirm(`Delete project ${selectedProject.name}? This will delete its ITP template, ships, and progress records.`)) return;
    await request(`/projects/${projectId}`, {
      method: "DELETE",
      headers: headers(authToken),
    });
    setProjectId("");
    setShipId("");
    setTree([]);
    setShips([]);
    setProgress([]);
    await loadProjects();
    await loadOverview();
    setMessage(`Deleted project ${selectedProject.name}.`);
  }

  async function deleteShip(ship) {
    if (!window.confirm(`Delete ship ${ship.hull_no}? Its progress records will also be deleted.`)) return;
    await request(`/ships/${ship.id}`, {
      method: "DELETE",
      headers: headers(authToken),
    });
    if (String(ship.id) === String(shipId)) {
      setShipId("");
      setProgress([]);
    }
    await loadProjectData(projectId);
    await loadOverview();
    setMessage(`Deleted ship ${ship.hull_no}.`);
  }

  function startEditShip(ship) {
    setEditingShipId(ship.id);
    setShipDraft({ hull_no: ship.hull_no, name: ship.name || "" });
  }

  async function saveShip(ship) {
    if (!shipDraft.hull_no.trim()) {
      setMessage("Hull no. cannot be empty.");
      return;
    }
    const updated = await request(`/ships/${ship.id}`, {
      method: "PUT",
      headers: headers(authToken),
      body: JSON.stringify({
        hull_no: shipDraft.hull_no.trim(),
        name: shipDraft.name.trim() || null,
      }),
    });
    setEditingShipId(null);
    await loadProjectData(projectId);
    await loadOverview();
    setMessage(`Updated ship ${updated.hull_no}.`);
  }

  async function deleteItpItem(item) {
    if (!window.confirm(`Permanently delete ITP item ${item.code}? This will also delete its UID, inspection records, and status event history. Items with child items cannot be deleted.`)) return;
    const result = await request(`/itp-items/${item.id}`, {
      method: "DELETE",
      headers: headers(authToken),
    });
    await loadProjectData(projectId, { preserveAdminExpanded: true });
    await loadProgress(shipId);
    await loadOverview();
    setMessage(`Permanently deleted ${item.code}. Removed ${result.progress_deleted ?? 0} progress record(s) and ${result.events_deleted ?? 0} event(s).`);
  }

  function startEditItpItem(item) {
    setEditingItpItemId(item.id);
    setItpItemDraft({
      parent_code: item.parent_code || "",
      code: item.code,
      title_zh: item.title_zh || "",
      title_en: item.title_en || "",
    });
  }

  async function saveItpItem(item) {
    if (!itpItemDraft.code.trim()) {
      setMessage("Current code cannot be empty.");
      return;
    }
    if (!itpItemDraft.title_en.trim()) {
      setMessage("English description cannot be empty.");
      return;
    }
    const updated = await request(`/itp-items/${item.id}`, {
      method: "PUT",
      headers: headers(authToken),
      body: JSON.stringify({
        parent_code: itpItemDraft.parent_code.trim() || null,
        code: itpItemDraft.code.trim(),
        title_zh: itpItemDraft.title_zh.trim() || null,
        title_en: itpItemDraft.title_en.trim(),
      }),
    });
    setEditingItpItemId(null);
    await loadProjectData(projectId, { preserveAdminExpanded: true });
    await loadProgress(shipId);
    await loadOverview();
    setMessage(`Updated ITP item ${updated.code}.`);
  }

  async function toggleBeforeSeaTrial(item) {
    await request(`/itp-items/${item.id}/before-sea-trial`, {
      method: "PUT",
      headers: headers(authToken),
    });
    await loadProjectData(projectId, { preserveAdminExpanded: true });
    await loadOverview();
    setMessage(`${item.before_sea_trial ? "Unmarked" : "Marked"} ${item.code} as Items before sea trial.`);
  }

  async function toggleItemActive(item) {
    const nextActive = item.active === false;
    await request(`/itp-items/${item.id}/active?active=${nextActive ? "true" : "false"}`, {
      method: "PUT",
      headers: headers(authToken),
    });
    await loadProjectData(projectId, { preserveAdminExpanded: true });
    await loadProgress(shipId);
    await loadOverview();
    setMessage(`${nextActive ? "Restored" : "Deactivated"} ${item.code}.`);
  }

  async function restoreInactiveItem(item) {
    await request(`/itp-items/${item.id}/active?active=true`, {
      method: "PUT",
      headers: headers(authToken),
    });
    await loadProjectData(projectId, { preserveAdminExpanded: true });
    await loadInactiveItems(projectId);
    await loadProgress(shipId);
    await loadOverview();
    setMessage(`Restored ${item.code}.`);
  }

  async function permanentlyDeleteInactiveItem(item) {
    if (!window.confirm(`Permanently delete inactive ITP item ${item.code}? This will also delete its UID, inspection records, and status event history. Items with child items cannot be deleted.`)) return;
    const result = await request(`/itp-items/${item.id}`, {
      method: "DELETE",
      headers: headers(authToken),
    });
    await loadProjectData(projectId, { preserveAdminExpanded: true });
    await loadInactiveItems(projectId);
    await loadProgress(shipId);
    await loadOverview();
    setMessage(`Permanently deleted ${item.code}. Removed ${result.progress_deleted ?? 0} progress record(s) and ${result.events_deleted ?? 0} event(s).`);
  }

  async function rollbackHistory(row) {
    await request(`/history/${row.id}/rollback`, {
      method: "POST",
      headers: headers(authToken),
    });
    await loadProjectData(projectId);
    await loadProgress(shipId);
    await loadOverview();
    setMessage(`Rolled back history #${row.id}.`);
  }

  function renderOverviewProgress(label, done, total, percent, open, options = {}) {
    return (
      <div className={`overview-progress ${options.primary ? "primary" : ""}`}>
        <div>
          <span>{label}</span>
          <strong>{done} / {total} ({percent}%)</strong>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="overview-progress-footer">
          <small>{open} open</small>
          {options.action}
        </div>
      </div>
    );
  }

  function renderInspectionRow(item) {
    const status = progressByItem[item.id]?.status || "not_started";
    const done = status === "done";
    return (
      <div className={`inspection-row ${done ? "done" : "pending"}`} key={item.id}>
        <div>
          <code>{item.code}</code>
          <span>{item.title_en}<small>{item.title_zh ? ` / ${item.title_zh}` : ""}</small></span>
        </div>
        <button
          className={`status-toggle ${done ? "done" : "pending"}`}
          onClick={() => updateProgress(item, done ? "not_started" : "done").catch((error) => setMessage(error.message))}
        >
          {done ? "Completed" : "Unfinished"}
        </button>
      </div>
    );
  }

  function renderMainGroup(group) {
    const inspectionItems = collectInspectionChildren(group);
    const completeCount = inspectionItems.filter((item) => progressByItem[item.id]?.status === "done").length;
    const groupDone = inspectionItems.length > 0 && completeCount === inspectionItems.length;
    const isOpen = expanded[group.id] ?? false;
    const categoryChildren = group.children || [];
    const levelIndent = Math.max(group.level - 3, 0) * 34;
    return (
      <div className={`category-block ${groupDone ? "done" : ""}`} key={group.id}>
        <button
          className={`category-header level-${group.level}`}
          style={{ "--level-indent": `${levelIndent}px` }}
          onClick={() => setExpanded({ ...expanded, [group.id]: !isOpen })}
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <code>{group.code}</code>
          <span>{group.title_en}<small>{group.title_zh ? ` / ${group.title_zh}` : ""}</small></span>
          <strong>{completeCount} / {inspectionItems.length}</strong>
        </button>
        {isOpen && group.level < 4 && (
          <div className="category-nested">
            {categoryChildren.map((child) => renderMainGroup(child))}
          </div>
        )}
        {isOpen && group.level >= 4 && (
          <div className="inspection-list" style={{ "--level-indent": `${levelIndent + 34}px` }}>
            {inspectionItems.length
              ? inspectionItems.map((item) => renderInspectionRow(item))
              : <div className="empty-inspection">No inspection items.</div>}
          </div>
        )}
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div>
            <h1>JN VLEC Project ITP Database</h1>
            <p>Enter password to continue.</p>
          </div>
          {message && <div className="login-error">{message}</div>}
          <div className="login-actions">
            <div className="admin-login">
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loginWithPassword().catch((error) => setMessage(error.message));
                }}
              />
              <button className="login-choice" onClick={() => loginWithPassword().catch((error) => setMessage(error.message))}>Login</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>JN VLEC Project ITP Database</h1>
          <p>PG Newbuilding</p>
        </div>
        <nav className="nav-panel">
          <button className={page === "overview" ? "nav-active" : ""} onClick={() => setPage("overview")}><BarChart3 size={16} /> Overview</button>
          <button className={page === "main" ? "nav-active" : ""} onClick={() => setPage("main")}><Ship size={16} /> Main</button>
          {role === "admin" && <button className={page === "admin" ? "nav-active" : ""} onClick={() => setPage("admin")}><Settings size={16} /> Admin</button>}
          <span><UserCog size={16} /> {user}</span>
          <button className="ghost-button" onClick={logout} title="Log out"><LogOut size={16} /></button>
        </nav>
      </header>

      {message && <div className="toast" onClick={() => setMessage("")}>{message}</div>}

      {page === "overview" && (
        <section className="overview-page">
          <div className="metric-grid">
            <div className="metric-card"><span>Projects</span><strong>{overview?.project_count ?? 0}</strong></div>
            <div className="metric-card"><span>Ships</span><strong>{overview?.ship_count ?? 0}</strong></div>
            <div className="metric-card"><span>Inspection Items</span><strong>{overview?.itp_item_count ?? 0}</strong></div>
          </div>
          <section className="overview-board">
            <div className="panel-title">
              <h2>Ship Overview</h2>
              <span>Read-only progress by ship. Sea trial open items can be reviewed here.</span>
            </div>
            <div className="ship-card-grid">
              {overviewShips.map((ship) => (
                <article className={`ship-card ${String(seaTrialDetailShipId) === String(ship.ship_id) ? "selected" : ""}`} key={ship.ship_id}>
                  <div className="ship-card-title">
                    <div>
                      <h3>{ship.hull_no}</h3>
                      <span>{ship.ship_name || "Unnamed ship"}</span>
                    </div>
                    <small>{ship.project_name}</small>
                  </div>
                  {renderOverviewProgress(
                    "Before Sea Trial",
                    ship.before_sea_trial_done,
                    ship.before_sea_trial_total,
                    ship.before_sea_trial_percent,
                    ship.before_sea_trial_open ?? Math.max(ship.before_sea_trial_total - ship.before_sea_trial_done, 0),
                    {
                      primary: true,
                      action: (
                        <button
                          className="soft-button compact-button"
                          onClick={() => loadSeaTrialDetail(ship).catch((error) => setMessage(error.message))}
                          disabled={!ship.before_sea_trial_total}
                        >
                          <Eye size={14} /> Open Items
                        </button>
                      ),
                    },
                  )}
                  {renderOverviewProgress(
                    "Before Delivery",
                    ship.completion_done,
                    ship.completion_total,
                    ship.completion_percent,
                    ship.completion_open ?? Math.max(ship.completion_total - ship.completion_done, 0),
                  )}
                </article>
              ))}
            </div>
            {seaTrialDetail && (
              <aside className="sea-trial-detail">
                <div className="panel-title">
                  <h2>{seaTrialDetail.hull_no} - Before Sea Trial Open Items</h2>
                  <span>{seaTrialDetail.open} open / {seaTrialDetail.total} total</span>
                </div>
                {seaTrialDetail.groups.length === 0 ? (
                  <div className="empty-state compact">No open items before sea trial.</div>
                ) : (
                  <div className="open-group-list">
                    {seaTrialDetail.groups.map((group) => (
                      <section className="open-group" key={group.code}>
                        <h3>{group.code} <span>{group.title_en}</span><small>{group.open_count}</small></h3>
                        {group.groups.map((subgroup) => (
                          <div className="open-subgroup" key={subgroup.code}>
                            <h4>{subgroup.code} <span>{subgroup.title_en}</span><small>{subgroup.open_count}</small></h4>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                )}
              </aside>
            )}
          </section>
        </section>
      )}

      {page === "main" && (
        <section className="main-page">
          <div className="selector-band">
            <label>
              <span>Project</span>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">Select project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          </div>

          {!projectId ? (
            <div className="empty-state">Select a project first.</div>
          ) : !isMainEditingShip ? (
            <section className="ship-select-board">
              <div className="panel-title">
                <h2>Select Ship to Edit</h2>
                <span>Choose the ship before changing ITP status.</span>
              </div>
              {mainShipCards.length === 0 ? (
                <div className="empty-state compact">No ships found for this project.</div>
              ) : (
                <div className="ship-card-grid">
                  {mainShipCards.map((ship) => (
                    <article className="ship-card edit-card" key={ship.ship_id} onClick={() => startMainShipEdit(ship)}>
                      <div className="ship-card-title">
                        <div>
                          <h3>{ship.hull_no}</h3>
                          <span>{ship.ship_name || "Unnamed ship"}</span>
                        </div>
                        <small>{ship.project_name}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="itp-browser">
              <div className="editing-context">
                <div>
                  <span>Editing Ship</span>
                  <strong>{selectedShip ? `${selectedShip.hull_no}${selectedShip.name ? ` - ${selectedShip.name}` : ""}` : "Selected ship"}</strong>
                  <small>{selectedProject?.name || "Project"}</small>
                </div>
                <button
                  className="soft-button"
                  onClick={() => {
                    setMainEditShipId("");
                    setExpanded({});
                  }}
                >
                  Change Ship
                </button>
              </div>
              <div className="panel-title">
                <h2>{selectedProject ? selectedProject.name : "Project"} / {selectedShip ? selectedShip.hull_no : "Ship"}</h2>
                <span>{progress.filter((item) => item.status === "done").length} / {progress.length} completed</span>
              </div>
              {projectId && shipId && (
                <div className="trial-progress">
                  <div>
                    <span>ITP Completeness</span>
                    <strong>{itpDone} / {progress.length} ({itpPercent}%)</strong>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${itpPercent}%` }} />
                  </div>
                </div>
              )}
              {thirdLevelGroups.length === 0 ? (
                <div className="empty-state">No third-level ITP categories found.</div>
              ) : (
                <div className="category-list">
                  {thirdLevelGroups.map((group) => renderMainGroup(group))}
                </div>
              )}
            </section>
          )}
        </section>
      )}

      {page === "admin" && role === "admin" && (
        <>
          <section className="workspace admin-workspace">
            <aside className="sidebar">
              <h2>Projects</h2>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">Select project</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <div className="inline-form">
                <input placeholder="New project name" value={newProject} onChange={(event) => setNewProject(event.target.value)} />
                <button onClick={() => createProject().catch((error) => setMessage(error.message))} title="Create project"><Plus size={16} /></button>
              </div>
              <button className="danger-button" onClick={() => deleteProject().catch((error) => setMessage(error.message))} disabled={!projectId}><Trash2 size={16} /> Delete Project</button>

              <h2>Excel Import</h2>
              <input
                type="file"
                accept=".xlsx,.xlsm"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] || null);
                  setPreview(null);
                }}
              />
              <div className="segmented-control">
                <button className={importMode === "partial" ? "active" : ""} onClick={() => setImportMode("partial")}>Partial Update</button>
                <button className={importMode === "global" ? "active" : ""} onClick={() => setImportMode("global")}>Global Replace</button>
              </div>
              <div className="button-row">
                <button onClick={() => previewImport().catch((error) => setMessage(error.message))} disabled={!selectedFile}><GitCompareArrows size={16} /> Preview</button>
                <button onClick={() => applyImport().catch((error) => setMessage(error.message))} disabled={!selectedFile || !preview}><Upload size={16} /> Apply</button>
              </div>
              {preview && (
                <div className="preview">
                  <strong>{preview.project_name}</strong>
                  <span>{preview.rows} rows</span>
                  <span>{preview.creates.length} creates</span>
                  <span>{preview.updates.length} updates</span>
                  <span>{preview.missing_from_upload.length} {importMode === "global" ? "will be deactivated" : "missing from upload"}</span>
                </div>
              )}
              <h2>Excel Export</h2>
              <button onClick={() => exportItp().catch((error) => setMessage(error.message))} disabled={!projectId}>
                <Download size={16} /> Export ITP
              </button>
            </aside>

            <section className="panel">
              <div className="panel-title">
                <h2>{selectedProject ? `${selectedProject.name} ITP Template` : "ITP Template"}</h2>
                <span>{flatTree.filter((item) => item.is_inspection && item.active !== false).length} active inspection items</span>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
                Show inactive items
              </label>
              <div className="inline-form item-form">
                <input placeholder="Parent code" value={newItem.parent_code} onChange={(event) => setNewItem({ ...newItem, parent_code: event.target.value })} />
                <input placeholder="Code" value={newItem.code} onChange={(event) => setNewItem({ ...newItem, code: event.target.value })} />
                <input placeholder="Chinese description" value={newItem.title_zh} onChange={(event) => setNewItem({ ...newItem, title_zh: event.target.value })} />
                <input placeholder="English description" value={newItem.title_en} onChange={(event) => setNewItem({ ...newItem, title_en: event.target.value })} />
                <button onClick={() => addItem().catch((error) => setMessage(error.message))}><Plus size={16} /></button>
              </div>
              <div className="tree-list">
                {flatTree
                  .filter((item) => (showInactive || item.active !== false) && (item.depth === 0 || adminExpanded[item.parent_id]))
                  .map((item) => {
                    const hasChildren = flatTree.some((candidate) => candidate.parent_id === item.id);
                    const isOpen = adminExpanded[item.id] ?? false;
                    const isEditing = editingItpItemId === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <div
                          className={`tree-row ${item.is_inspection ? "leaf" : ""} ${hasChildren ? "clickable" : ""} ${item.active === false ? "inactive" : ""}`}
                          style={{ paddingLeft: `${12 + item.depth * 22}px` }}
                          onClick={() => {
                            if (hasChildren) setAdminExpanded({ ...adminExpanded, [item.id]: !isOpen });
                          }}
                          title={hasChildren ? "Click to expand or collapse" : undefined}
                        >
                          <code>{item.code}</code>
                          <span>{item.title_en}<small>{item.title_zh ? ` / ${item.title_zh}` : ""}</small></span>
                          <small>{item.active === false ? "Inactive" : hasChildren ? (isOpen ? "Open" : "Closed") : `L${item.level}`}</small>
                          <button
                            className={`icon-button ${isEditing ? "active" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isEditing) {
                                setEditingItpItemId(null);
                              } else {
                                startEditItpItem(item);
                              }
                            }}
                            title="Edit ITP item"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className={`mark-button ${item.before_sea_trial ? "active" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleBeforeSeaTrial(item).catch((error) => setMessage(error.message));
                            }}
                            title="Toggle Items before sea trial"
                          >
                            <Flag size={14} />
                          </button>
                          <button
                            className={`icon-button ${item.active === false ? "active" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleItemActive(item).catch((error) => setMessage(error.message));
                            }}
                            title={item.active === false ? "Restore ITP item" : "Deactivate ITP item"}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            className="icon-danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteItpItem(item).catch((error) => setMessage(error.message));
                            }}
                            title="Delete ITP item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </React.Fragment>
                    );
                  })}
              </div>
            </section>

            <section className="panel ship-panel">
              <div className="panel-title">
                <h2><Ship size={18} /> Ships</h2>
                <span>{ships.length} hulls</span>
              </div>
              <select value={shipId} onChange={(event) => setShipId(event.target.value)}>
                <option value="">Select ship</option>
                {ships.map((ship) => <option key={ship.id} value={ship.id}>{ship.hull_no}{ship.name ? ` - ${ship.name}` : ""}</option>)}
              </select>
              <div className="inline-form">
                <input placeholder="Hull no." value={newShip.hull_no} onChange={(event) => setNewShip({ ...newShip, hull_no: event.target.value })} />
                <input placeholder="Ship name" value={newShip.name} onChange={(event) => setNewShip({ ...newShip, name: event.target.value })} />
                <button onClick={() => addShip().catch((error) => setMessage(error.message))}><Plus size={16} /></button>
              </div>
              <div className="ship-list">
                {ships.map((ship) => (
                  <div className={`ship-row ${editingShipId === ship.id ? "editing" : ""}`} key={ship.id}>
                    {editingShipId === ship.id ? (
                      <>
                        <input value={shipDraft.hull_no} onChange={(event) => setShipDraft({ ...shipDraft, hull_no: event.target.value })} />
                        <input value={shipDraft.name} onChange={(event) => setShipDraft({ ...shipDraft, name: event.target.value })} placeholder="Ship name" />
                        <button onClick={() => saveShip(ship).catch((error) => setMessage(error.message))}>Save</button>
                        <button className="soft-button" onClick={() => setEditingShipId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span>{ship.hull_no}{ship.name ? ` - ${ship.name}` : ""}</span>
                        <button className="icon-button" onClick={() => exportShipRecords(ship).catch((error) => setMessage(error.message))} title="Export inspection records"><Download size={14} /></button>
                        <label className="icon-button file-icon" title="Import inspection records">
                          <Upload size={14} />
                          <input
                            type="file"
                            accept=".xlsx,.xlsm"
                            onChange={(event) => {
                              importShipRecords(ship, event.target.files?.[0]).catch((error) => setMessage(error.message));
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <button className="icon-button" onClick={() => startEditShip(ship)} title="Edit ship"><Pencil size={14} /></button>
                        <button className="icon-danger" onClick={() => deleteShip(ship).catch((error) => setMessage(error.message))} title="Delete ship"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </section>

          <section className="inactive-panel">
            <div className="panel-title">
              <h2><Power size={18} /> Inactive ITP Items</h2>
              <span>{inactiveItems.length} inactive item(s)</span>
              <button
                className="soft-button compact-button"
                onClick={() => {
                  const next = !showInactivePanel;
                  setShowInactivePanel(next);
                  if (next) loadInactiveItems(projectId).catch((error) => setMessage(error.message));
                }}
                disabled={!projectId}
              >
                {showInactivePanel ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {showInactivePanel ? "Hide" : "View"}
              </button>
            </div>
            {showInactivePanel && (
              inactiveItems.length === 0 ? (
                <div className="empty-state compact">No inactive ITP items.</div>
              ) : (
                <div className="inactive-list">
                  {inactiveItems.map((item) => {
                    const hasChildren = inactiveChildrenByParent[item.id];
                    return (
                      <div className="inactive-row" key={item.id}>
                        <code>{item.code}</code>
                        <span>{item.title_en}<small>{item.title_zh ? ` / ${item.title_zh}` : ""}</small></span>
                        <small>{hasChildren ? "Has child items" : `L${item.level}`}</small>
                        <button className="icon-button active" onClick={() => restoreInactiveItem(item).catch((error) => setMessage(error.message))} title="Restore ITP item">
                          <Power size={14} />
                        </button>
                        <button
                          className="icon-danger"
                          onClick={() => permanentlyDeleteInactiveItem(item).catch((error) => setMessage(error.message))}
                          disabled={hasChildren}
                          title={hasChildren ? "Delete child items first" : "Permanently delete ITP item"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </section>

          <section className="history-panel">
            <div className="panel-title">
              <h2><History size={18} /> History</h2>
              <span>Audited template and progress changes</span>
            </div>
            <div className="history-grid">
              {historyRows.map((row) => (
                <div className="history-row" key={row.id}>
                  <CheckCircle2 size={15} />
                  <span>{new Date(row.created_at).toLocaleString()}</span>
                  <strong>{row.action}</strong>
                  <span>{row.summary}</span>
                  <small>{row.actor}</small>
                  <button
                    className="rollback-button"
                    onClick={() => rollbackHistory(row).catch((error) => setMessage(error.message))}
                    disabled={row.action === "rollback"}
                    title="Roll back this history record"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {editingItpItem && (
        <div className="modal-backdrop" onClick={() => setEditingItpItemId(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-title">
              <div>
                <h2>Edit ITP Item</h2>
                <span>{editingItpItem.code}</span>
              </div>
              <button className="soft-button" onClick={() => setEditingItpItemId(null)}>Cancel</button>
            </div>
            <div className="itp-edit-form">
              <label>
                <span>Parent Code</span>
                <input placeholder="Parent code" value={itpItemDraft.parent_code} onChange={(event) => setItpItemDraft({ ...itpItemDraft, parent_code: event.target.value })} />
              </label>
              <label>
                <span>Current Code</span>
                <input placeholder="Current code" value={itpItemDraft.code} onChange={(event) => setItpItemDraft({ ...itpItemDraft, code: event.target.value })} />
              </label>
              <label>
                <span>Chinese Description</span>
                <input placeholder="Chinese description" value={itpItemDraft.title_zh} onChange={(event) => setItpItemDraft({ ...itpItemDraft, title_zh: event.target.value })} />
              </label>
              <label>
                <span>English Description</span>
                <input placeholder="English description" value={itpItemDraft.title_en} onChange={(event) => setItpItemDraft({ ...itpItemDraft, title_en: event.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => saveItpItem(editingItpItem).catch((error) => setMessage(error.message))}><CheckCircle2 size={16} /> Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

