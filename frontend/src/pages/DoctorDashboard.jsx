import React, { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, UserRound, ClipboardPlus, History, FileText, Upload } from "lucide-react";
import { openReport } from "../utils/openReport";
import Navbar from "../components/Navbar";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  date: "",
  diagnosis: "",
  symptoms: "",
  vitals: "",
  notes: "",
  followUpDate: "",
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("search"); // "search" | "history"

  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [patient, setPatient] = useState(null);
  const [checkups, setCheckups] = useState([]);

  const [myHistory, setMyHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  // Reports (PDF upload)
  const [reports, setReports] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ title: "", date: "", notes: "" });
  const [reportFile, setReportFile] = useState(null);
  const [reportError, setReportError] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchReports = async (patientCode) => {
    try {
      const res = await api.get("/reports", { params: { patientCode } });
      setReports(res.data.reports);
    } catch (err) {
      setReports([]);
    }
  };

  const openReportModal = () => {
    setReportForm({ title: "", date: "", notes: "" });
    setReportFile(null);
    setReportError("");
    setShowReportModal(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportError("");
    if (!reportFile) return setReportError("Please choose a PDF file.");
    const fd = new FormData();
    fd.append("patientCode", patient.patientCode);
    fd.append("title", reportForm.title);
    fd.append("date", reportForm.date);
    fd.append("notes", reportForm.notes);
    fd.append("file", reportFile);
    setUploading(true);
    try {
      await api.post("/reports", fd);
      setShowReportModal(false);
      fetchReports(patient.patientCode);
    } catch (err) {
      setReportError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleReportDelete = async (id) => {
    if (!window.confirm("Delete this report?")) return;
    await api.delete(`/reports/${id}`);
    fetchReports(patient.patientCode);
  };

  const fetchMyHistory = () => {
    setHistoryLoading(true);
    api
      .get("/checkups")
      .then((res) => setMyHistory(res.data.checkups))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (tab === "history") fetchMyHistory();
  }, [tab]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSearching(true);
    setSearchError("");
    setPatient(null);
    setCheckups([]);
    setReports([]);
    try {
      const res = await api.get("/checkups", { params: { patientCode: code.trim() } });
      setPatient(res.data.patient);
      setCheckups(res.data.checkups);
      fetchReports(res.data.patient.patientCode);
    } catch (err) {
      setSearchError(err.response?.data?.message || "No patient found with this ID.");
    } finally {
      setSearching(false);
    }
  };

  const refreshCheckups = async () => {
    if (!patient) return;
    const res = await api.get("/checkups", { params: { patientCode: patient.patientCode } });
    setCheckups(res.data.checkups);
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingId(c.id);
    setForm({
      date: c.date?.slice(0, 10),
      diagnosis: c.diagnosis,
      symptoms: c.symptoms,
      vitals: c.vitals,
      notes: c.notes,
      followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (editingId) {
        await api.put(`/checkups/${editingId}`, form);
      } else {
        await api.post("/checkups", { ...form, patientCode: patient.patientCode });
      }
      setShowModal(false);
      refreshCheckups();
      if (tab === "history") fetchMyHistory();
    } catch (err) {
      setFormError(err.response?.data?.message || "Something went wrong.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this checkup entry?")) return;
    await api.delete(`/checkups/${id}`);
    refreshCheckups();
    if (tab === "history") fetchMyHistory();
  };

  const renderCheckupCard = (c, { showPatientName } = {}) => {
    const isOwn = c.doctorId === user?.id;
    return (
      <div key={c.id} className="record-card record-card-teal">
        <div className="record-card-top">
          <span className="record-date">{new Date(c.date).toLocaleDateString()}</span>
          {c.followUpDate && (
            <span className="badge badge-followup">Follow-up: {new Date(c.followUpDate).toLocaleDateString()}</span>
          )}
        </div>
        {showPatientName && <h4>{c.patientName}</h4>}
        <p className="record-desc">
          <strong>Diagnosis:</strong> {c.diagnosis}
        </p>
        {c.symptoms && (
          <p className="record-desc">
            <strong>Symptoms:</strong> {c.symptoms}
          </p>
        )}
        {c.vitals && (
          <p className="record-desc">
            <strong>Vitals:</strong> {c.vitals}
          </p>
        )}
        {c.notes && <p className="record-desc">{c.notes}</p>}
        <p className="muted-small">By Dr. {c.doctorName}</p>
        {isOwn && (
          <div className="record-actions">
            <button className="icon-btn" onClick={() => openEditModal(c)}>
              <Pencil size={16} />
            </button>
            <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(c.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar title={`Welcome, Dr. ${user?.name?.split(" ")[0] || ""}`} subtitle="Search a patient to view or add checkup records." />

      <div className="page-body">
        <div className="tab-switcher">
          <button className={tab === "search" ? "tab-active" : ""} onClick={() => setTab("search")}>
            <Search size={15} /> Find Patient
          </button>
          <button className={tab === "history" ? "tab-active" : ""} onClick={() => setTab("history")}>
            <History size={15} /> My Checkup History
          </button>
        </div>

        {tab === "search" && (
          <>
            <form className="doctor-search-bar" onSubmit={handleSearch}>
              <div className="search-box">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Enter Patient ID (e.g. PT-A1B2C)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchError && <div className="alert-error">{searchError}</div>}

            {patient && (
              <>
                <div className="card patient-found-card">
                  <div className="avatar avatar-md">
                    <UserRound size={20} />
                  </div>
                  <div className="patient-found-info">
                    <h3>{patient.name}</h3>
                    <p className="muted-small">
                      {patient.patientCode} • {patient.email}
                    </p>
                    <div className="profile-meta profile-meta-inline">
                      <div>
                        <p className="mini-sub">Age</p>
                        <p className="mini-title">{patient.age || "—"}</p>
                      </div>
                      <div>
                        <p className="mini-sub">Blood Group</p>
                        <p className="mini-title">{patient.bloodGroup || "—"}</p>
                      </div>
                      <div>
                        <p className="mini-sub">Phone</p>
                        <p className="mini-title">{patient.phone || "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button className="btn-primary" onClick={openAddModal}>
                      <Plus size={16} /> Add Checkup
                    </button>
                    <button className="btn-primary" onClick={openReportModal}>
                      <Upload size={16} /> Upload Report
                    </button>
                  </div>
                </div>

                <h3 className="section-heading">Checkup History</h3>
                {checkups.length === 0 ? (
                  <EmptyState
                    icon={ClipboardPlus}
                    title="No checkups yet"
                    message="Add the first checkup entry for this patient."
                    actionLabel="Add Checkup"
                    onAction={openAddModal}
                  />
                ) : (
                  <div className="record-grid">{checkups.map((c) => renderCheckupCard(c))}</div>
                )}

                <h3 className="section-heading">Reports</h3>
                {reports.length === 0 ? (
                  <p className="muted">No reports uploaded yet.</p>
                ) : (
                  <div className="record-grid">
                    {reports.map((r) => (
                      <div key={r.id} className="record-card record-card-teal">
                        <div className="record-card-top">
                          <span className="record-date">{new Date(r.date).toLocaleDateString()}</span>
                        </div>
                        <h4>{r.title}</h4>
                        {r.notes && <p className="record-desc">{r.notes}</p>}
                        <p className="muted-small">By Dr. {r.doctorName}</p>
                        <div className="record-actions">
                          <button className="icon-btn" title="View PDF" onClick={() => openReport(r.id)}>
                            <FileText size={16} />
                          </button>
                          {r.doctorId === user?.id && (
                            <button className="icon-btn icon-btn-danger" onClick={() => handleReportDelete(r.id)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {!patient && !searchError && (
              <EmptyState
                icon={Search}
                title="Search for a patient"
                message="Enter the Patient ID shared by your patient to view or add their checkup details."
              />
            )}
          </>
        )}

        {tab === "history" && (
          <>
            {historyLoading ? (
              <p className="muted">Loading...</p>
            ) : myHistory.length === 0 ? (
              <EmptyState
                icon={History}
                title="No checkups added yet"
                message="Checkups you add for patients will show up here."
              />
            ) : (
              <div className="record-grid">{myHistory.map((c) => renderCheckupCard(c, { showPatientName: true }))}</div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <Modal title={editingId ? "Edit Checkup" : `Add Checkup for ${patient?.name}`} onClose={() => setShowModal(false)}>
          {formError && <div className="alert-error">{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <label className="field">
                <span>Checkup date</span>
                <input type="date" name="date" value={form.date} onChange={handleFormChange} required />
              </label>
              <label className="field">
                <span>Follow-up date (optional)</span>
                <input type="date" name="followUpDate" value={form.followUpDate} onChange={handleFormChange} />
              </label>
            </div>

            <label className="field">
              <span>Diagnosis</span>
              <input
                name="diagnosis"
                value={form.diagnosis}
                onChange={handleFormChange}
                required
                placeholder="e.g. Viral fever"
              />
            </label>

            <label className="field">
              <span>Symptoms</span>
              <input
                name="symptoms"
                value={form.symptoms}
                onChange={handleFormChange}
                placeholder="e.g. Fever, sore throat, fatigue"
              />
            </label>

            <label className="field">
              <span>Vitals</span>
              <input
                name="vitals"
                value={form.vitals}
                onChange={handleFormChange}
                placeholder="e.g. BP 120/80, Temp 99.5°F, Weight 65kg"
              />
            </label>

            <label className="field">
              <span>Notes / Prescription</span>
              <textarea
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleFormChange}
                placeholder="Medicines prescribed, advice, etc."
              />
            </label>

            <button className="btn-primary btn-block" type="submit">
              {editingId ? "Save Changes" : "Save Checkup"}
            </button>
          </form>
        </Modal>
      )}

      {showReportModal && (
        <Modal title={`Upload Report for ${patient?.name}`} onClose={() => setShowReportModal(false)}>
          {reportError && <div className="alert-error">{reportError}</div>}
          <form onSubmit={handleReportSubmit}>
            <label className="field">
              <span>Report title</span>
              <input
                value={reportForm.title}
                required
                placeholder="e.g. Blood Test Report"
                onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Report date</span>
              <input
                type="date"
                value={reportForm.date}
                required
                onChange={(e) => setReportForm({ ...reportForm, date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Notes (optional)</span>
              <textarea
                rows={2}
                value={reportForm.notes}
                onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })}
              />
            </label>
            <label className="field">
              <span>PDF file (max 5 MB)</span>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setReportFile(e.target.files[0])}
              />
            </label>
            <button className="btn-primary btn-block" type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Report"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
