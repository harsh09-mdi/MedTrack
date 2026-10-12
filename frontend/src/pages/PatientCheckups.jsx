import React, { useEffect, useState } from "react";
import { ClipboardList, FileText } from "lucide-react";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import api from "../api/axios";
import { openReport } from "../utils/openReport";

export default function PatientCheckups() {
  const [checkups, setCheckups] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/checkups")
      .then((res) => setCheckups(res.data.checkups))
      .finally(() => setLoading(false));

    api
      .get("/reports")
      .then((res) => setReports(res.data.reports))
      .catch(() => {});
  }, []);

  return (
    <>
      <Navbar
        title="Doctor Checkups"
        subtitle="Diagnoses, checkup notes and reports added by your doctors. View only — your doctor keeps this updated."
      />

      <div className="page-body">
        {loading ? (
          <p className="muted">Loading...</p>
        ) : checkups.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No checkups yet"
            message="Once a doctor adds a checkup using your Patient ID, it will show up here."
          />
        ) : (
          <div className="timeline">
            {checkups.map((c) => (
              <div key={c.id} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-card">
                  <div className="record-card-top">
                    <span className="record-date">{new Date(c.date).toLocaleDateString()}</span>
                    {c.followUpDate && (
                      <span className="badge badge-followup">
                        Follow-up: {new Date(c.followUpDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4>{c.diagnosis}</h4>
                  <p className="muted-small">Checked by Dr. {c.doctorName}</p>
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
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 className="section-heading">My Reports</h3>
        {reports.length === 0 ? (
          <p className="muted">No reports uploaded by your doctor yet.</p>
        ) : (
          <div className="record-grid">
            {reports.map((r) => (
              <div key={r.id} className="record-card record-card-teal">
                <div className="record-card-top">
                  <span className="record-date">{new Date(r.date).toLocaleDateString()}</span>
                </div>
                <h4>{r.title}</h4>
                {r.notes && <p className="record-desc">{r.notes}</p>}
                <p className="muted-small">Uploaded by Dr. {r.doctorName}</p>
                <button className="btn-primary" onClick={() => openReport(r.id)}>
                  <FileText size={16} /> View Report
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
