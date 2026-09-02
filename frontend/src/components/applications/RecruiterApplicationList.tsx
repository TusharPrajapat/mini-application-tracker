import React, { useState, useEffect } from "react";
import {
  Application,
  ApplicationStage,
  ApplicationListQuery,
} from "../../types/application";
import { Job, PaginationMeta } from "../../types/job";
import { exportApplications } from "../../services/applicationService";
import { useDebouncedCallback } from "../../hooks/useDebounce";

interface RecruiterApplicationListProps {
  applications: Application[];
  jobs: Job[];
  pagination?: PaginationMeta;
  loading: boolean;
  onSelectApplication: (app: Application) => void;
  onFilterChange: (query: ApplicationListQuery) => void;
  onBulkUpdateStage: (
    applicationIds: number[],
    stage: ApplicationStage
  ) => Promise<void>;
  onShowToast?: (message: string) => void;
}

export const RecruiterApplicationList: React.FC<
  RecruiterApplicationListProps
> = ({
  applications,
  jobs,
  pagination,
  loading,
  onSelectApplication,
  onFilterChange,
  onBulkUpdateStage,
  onShowToast,
}) => {
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [sortOption, setSortOption] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Row Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStage, setBulkStage] = useState<string>("");
  const [submittingBulk, setSubmittingBulk] = useState<boolean>(false);

  // Export State
  const [exporting, setExporting] = useState<boolean>(false);

  // Clear row selections when filters or page changes
  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkStage("");
  };

  // Stable handwritten debounced filter change callback (400ms)
  const debouncedFilterChange = useDebouncedCallback(
    (query: ApplicationListQuery) => {
      onFilterChange(query);
    },
    400
  );

  useEffect(() => {
    debouncedFilterChange({
      page: currentPage,
      limit: 10,
      search: searchInput.trim() ? searchInput.trim() : undefined,
      job_id: selectedJobId ? Number(selectedJobId) : undefined,
      stage: selectedStage ? (Number(selectedStage) as ApplicationStage) : undefined,
      sort: sortOption,
    });
  }, [
    currentPage,
    searchInput,
    selectedJobId,
    selectedStage,
    sortOption,
    debouncedFilterChange,
  ]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
    clearSelection();
  };

  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedJobId(e.target.value);
    setCurrentPage(1);
    clearSelection();
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStage(e.target.value);
    setCurrentPage(1);
    clearSelection();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as "newest" | "oldest");
    setCurrentPage(1);
    clearSelection();
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSelectedJobId("");
    setSelectedStage("");
    setSortOption("newest");
    setCurrentPage(1);
    clearSelection();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    clearSelection();
  };

  // Selection Checkbox Handlers
  const toggleSelectAll = () => {
    const currentPageIds = applications.map((a) => Number(a.id));
    const allSelected = currentPageIds.every((id) => selectedIds.has(id));

    const updated = new Set(selectedIds);
    if (allSelected) {
      currentPageIds.forEach((id) => updated.delete(id));
    } else {
      currentPageIds.forEach((id) => updated.add(id));
    }
    setSelectedIds(updated);
  };

  const toggleSelectOne = (rawId: number) => {
    const id = Number(rawId);
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.size === 0 || !bulkStage) return;

    try {
      setSubmittingBulk(true);
      const stageEnum = Number(bulkStage) as ApplicationStage;
      const idsArray = Array.from(selectedIds).map((id) => Number(id));
      await onBulkUpdateStage(idsArray, stageEnum);
      clearSelection();
    } catch {
      // Error toast handled in parent
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Export CSV Handler (unpaginated, using current filter state)
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const query: ApplicationListQuery = {
        search: searchInput.trim() ? searchInput.trim() : undefined,
        job_id: selectedJobId ? Number(selectedJobId) : undefined,
        stage: selectedStage ? (Number(selectedStage) as ApplicationStage) : undefined,
        sort: sortOption,
      };

      const blob = await exportApplications(query);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (onShowToast) {
        onShowToast("Applications exported successfully");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to export applications";
      if (onShowToast) {
        onShowToast(`⚠️ ${errorMsg}`);
      }
    } finally {
      setExporting(false);
    }
  };

  const isFilterActive =
    Boolean(searchInput.trim()) ||
    Boolean(selectedJobId) ||
    Boolean(selectedStage) ||
    sortOption === "oldest";

  const isAllCurrentPageSelected =
    applications.length > 0 &&
    applications.every((app) => selectedIds.has(Number(app.id)));

  const renderStageBadge = (stage: ApplicationStage) => {
    switch (stage) {
      case ApplicationStage.APPLIED:
        return <span style={{ ...styles.badge, ...styles.badgeApplied }}>Applied</span>;
      case ApplicationStage.SCREENING:
        return <span style={{ ...styles.badge, ...styles.badgeScreening }}>Screening</span>;
      case ApplicationStage.INTERVIEW:
        return <span style={{ ...styles.badge, ...styles.badgeInterview }}>Interview</span>;
      case ApplicationStage.OFFER:
        return <span style={{ ...styles.badge, ...styles.badgeOffer }}>Offer</span>;
      case ApplicationStage.REJECTED:
        return <span style={{ ...styles.badge, ...styles.badgeRejected }}>Rejected</span>;
      default:
        return <span style={{ ...styles.badge, ...styles.badgeApplied }}>Applied</span>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const activePage = pagination?.page || currentPage;
  const totalPages = pagination?.totalPages || 0;
  const totalRecords = pagination?.total || 0;

  return (
    <div style={styles.container}>
      {/* Bulk Action Toolbar (rendered when items are selected) */}
      {selectedIds.size > 0 && (
        <div style={styles.bulkToolbar}>
          <div style={styles.bulkCountWrapper}>
            <span style={styles.bulkCountText}>
              ☑ {selectedIds.size} {selectedIds.size === 1 ? "application" : "applications"} selected
            </span>
          </div>

          <div style={styles.bulkActionRow}>
            <select
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value)}
              style={styles.bulkSelect}
              disabled={submittingBulk}
            >
              <option value="">-- Change Stage ▼ --</option>
              <option value={ApplicationStage.APPLIED}>1 - Applied</option>
              <option value={ApplicationStage.SCREENING}>2 - Screening</option>
              <option value={ApplicationStage.INTERVIEW}>3 - Interview</option>
              <option value={ApplicationStage.OFFER}>4 - Offer</option>
              <option value={ApplicationStage.REJECTED}>5 - Rejected</option>
            </select>

            <button
              onClick={handleBulkSubmit}
              disabled={!bulkStage || submittingBulk}
              style={
                !bulkStage || submittingBulk
                  ? { ...styles.bulkSubmitBtn, ...styles.btnDisabled }
                  : styles.bulkSubmitBtn
              }
            >
              {submittingBulk
                ? "Updating..."
                : `Update ${selectedIds.size} ${selectedIds.size === 1 ? "Application" : "Applications"}`}
            </button>

            <button
              onClick={clearSelection}
              disabled={submittingBulk}
              style={styles.bulkCancelBtn}
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={styles.filterToolbar}>
        <div style={styles.searchRow}>
          <div style={styles.searchInputWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search candidate name or email..."
              value={searchInput}
              onChange={handleSearchChange}
              style={styles.searchInput}
            />
            {searchInput && (
              <button onClick={handleClearFilters} style={styles.clearSearchBtn}>
                ✕
              </button>
            )}
          </div>
        </div>

        <div style={styles.controlsRow}>
          <div style={styles.filterGroup}>
            <label htmlFor="filter-job" style={styles.controlLabel}>
              Job:
            </label>
            <select
              id="filter-job"
              value={selectedJobId}
              onChange={handleJobChange}
              style={styles.selectControl}
            >
              <option value="">All Jobs ({jobs.length})</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label htmlFor="filter-stage" style={styles.controlLabel}>
              Stage:
            </label>
            <select
              id="filter-stage"
              value={selectedStage}
              onChange={handleStageChange}
              style={styles.selectControl}
            >
              <option value="">All Stages</option>
              <option value={ApplicationStage.APPLIED}>Applied (1)</option>
              <option value={ApplicationStage.SCREENING}>Screening (2)</option>
              <option value={ApplicationStage.INTERVIEW}>Interview (3)</option>
              <option value={ApplicationStage.OFFER}>Offer (4)</option>
              <option value={ApplicationStage.REJECTED}>Rejected (5)</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label htmlFor="filter-sort" style={styles.controlLabel}>
              Sort:
            </label>
            <select
              id="filter-sort"
              value={sortOption}
              onChange={handleSortChange}
              style={styles.selectControl}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <div style={styles.actionButtonGroup}>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              style={
                exporting
                  ? { ...styles.exportBtn, ...styles.btnDisabled }
                  : styles.exportBtn
              }
              title="Export all matching applications to CSV"
            >
              {exporting ? "Exporting..." : "📥 Export CSV"}
            </button>

            {isFilterActive && (
              <button onClick={handleClearFilters} style={styles.clearFiltersBtn}>
                🔄 Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Applications Table / Loading / Empty States */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Filtering candidate applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIcon}>{isFilterActive ? "🔍" : "📬"}</div>
          <h3 style={styles.emptyTitle}>
            {isFilterActive
              ? "No applications match your filters"
              : "No candidate applications received yet"}
          </h3>
          <p style={styles.emptyText}>
            {isFilterActive
              ? "Try broadening your search term, changing the job/stage filters, or clearing filters."
              : "Applications submitted by candidates for your job postings will appear here."}
          </p>
          {isFilterActive && (
            <button onClick={handleClearFilters} style={styles.resetEmptyBtn}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={styles.tableWrapperContainer}>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={{ ...styles.th, width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAll}
                      style={styles.checkbox}
                      title="Select all applications on current page"
                    />
                  </th>
                  <th style={styles.th}>Job Title</th>
                  <th style={styles.th}>Candidate</th>
                  <th style={styles.th}>Stage</th>
                  <th style={styles.th}>Applied Date</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const isSelected = selectedIds.has(Number(app.id));
                  const candidateName = app.candidate?.candidateProfile?.full_name;
                  const candidateEmail =
                    app.candidate?.email || `Candidate #${app.candidate_id}`;

                  return (
                    <tr
                      key={app.id}
                      style={{
                        ...styles.tr,
                        ...(isSelected ? styles.trSelected : {}),
                      }}
                    >
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(app.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={styles.tdTitle}>
                        {app.job ? app.job.title : `Job #${app.job_id}`}
                      </td>
                      <td style={styles.tdCandidate}>
                        <div>
                          {candidateName ? (
                            <div style={styles.candidateName}>{candidateName}</div>
                          ) : null}
                          <div style={styles.candidateEmail}>{candidateEmail}</div>
                        </div>
                      </td>
                      <td style={styles.td}>{renderStageBadge(app.stage)}</td>
                      <td style={styles.tdDate}>{formatDate(app.created_at)}</td>
                      <td style={styles.tdActions}>
                        <button
                          onClick={() => onSelectApplication(app)}
                          style={styles.manageBtn}
                        >
                          View / Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && totalPages > 0 && (
            <div style={styles.paginationBar}>
              <button
                onClick={() => handlePageChange(activePage - 1)}
                disabled={activePage <= 1 || loading}
                style={
                  activePage <= 1 || loading
                    ? { ...styles.pageBtn, ...styles.pageBtnDisabled }
                    : styles.pageBtn
                }
              >
                ‹ Previous
              </button>
              <span style={styles.pageInfo}>
                Page {activePage} of {totalPages} ({totalRecords} total)
              </span>
              <button
                onClick={() => handlePageChange(activePage + 1)}
                disabled={activePage >= totalPages || loading}
                style={
                  activePage >= totalPages || loading
                    ? { ...styles.pageBtn, ...styles.pageBtnDisabled }
                    : styles.pageBtn
                }
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  bulkToolbar: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    borderRadius: "1rem",
    padding: "1rem 1.25rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    backdropFilter: "blur(12px)",
  },
  bulkCountWrapper: {
    display: "flex",
    alignItems: "center",
  },
  bulkCountText: {
    color: "#38bdf8",
    fontWeight: "700",
    fontSize: "0.95rem",
  },
  bulkActionRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  bulkSelect: {
    backgroundColor: "#0f172a",
    border: "1px solid #38bdf8",
    borderRadius: "0.5rem",
    padding: "0.55rem 0.85rem",
    color: "#f8fafc",
    fontSize: "0.9rem",
    fontWeight: "600",
    outline: "none",
  },
  bulkSubmitBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.55rem 1.1rem",
    fontSize: "0.9rem",
    fontWeight: "700",
    cursor: "pointer",
  },
  bulkCancelBtn: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "0.5rem",
    padding: "0.55rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  filterToolbar: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    backdropFilter: "blur(12px)",
  },
  searchRow: {
    width: "100%",
  },
  searchInputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "1rem",
    fontSize: "1rem",
    color: "#94a3b8",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.75rem 2.5rem 0.75rem 2.5rem",
    color: "#f8fafc",
    fontSize: "0.95rem",
    outline: "none",
  },
  clearSearchBtn: {
    position: "absolute",
    right: "0.75rem",
    backgroundColor: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1rem",
    cursor: "pointer",
  },
  controlsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "center",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  controlLabel: {
    color: "#94a3b8",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  selectControl: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.85rem",
    color: "#f8fafc",
    fontSize: "0.875rem",
    outline: "none",
  },
  actionButtonGroup: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginLeft: "auto",
  },
  exportBtn: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.95rem",
    fontSize: "0.875rem",
    fontWeight: "700",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  clearFiltersBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.85rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  loadingBox: {
    textAlign: "center",
    padding: "3rem",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid rgba(255, 255, 255, 0.1)",
    borderTop: "3px solid #38bdf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 1rem auto",
  },
  loadingText: {
    color: "#94a3b8",
    margin: 0,
    fontSize: "0.95rem",
  },
  emptyContainer: {
    textAlign: "center",
    padding: "3.5rem 1.5rem",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: "1rem",
    border: "1px dashed rgba(255, 255, 255, 0.15)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: "0.5rem",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#f8fafc",
    margin: 0,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: "0.95rem",
    maxWidth: "450px",
    margin: 0,
    lineHeight: "1.5",
  },
  resetEmptyBtn: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.55rem 1.1rem",
    fontSize: "0.875rem",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  tableWrapperContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  tableWrapper: {
    overflowX: "auto",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.95rem",
  },
  tableHeaderRow: {
    borderBottom: "1px solid #334155",
    backgroundColor: "#0f172a",
  },
  th: {
    padding: "1rem 1.25rem",
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  trSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
  },
  checkbox: {
    accentColor: "#38bdf8",
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  td: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#e2e8f0",
  },
  tdTitle: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#f8fafc",
    fontWeight: "600",
  },
  tdCandidate: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
  },
  candidateName: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: "0.95rem",
  },
  candidateEmail: {
    color: "#38bdf8",
    fontSize: "0.85rem",
  },
  tdDate: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    color: "#94a3b8",
    fontSize: "0.875rem",
    whiteSpace: "nowrap",
  },
  tdActions: {
    padding: "1rem 1.25rem",
    verticalAlign: "middle",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  manageBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "0.375rem",
    padding: "0.4rem 0.85rem",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  badge: {
    padding: "0.25rem 0.65rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "inline-block",
  },
  badgeApplied: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  badgeScreening: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
    border: "1px solid rgba(168, 85, 247, 0.3)",
  },
  badgeInterview: {
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    color: "#facc15",
    border: "1px solid rgba(250, 204, 21, 0.3)",
  },
  badgeOffer: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.3)",
  },
  badgeRejected: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  paginationBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: "0.75rem",
    padding: "0.75rem 1.25rem",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  pageInfo: {
    color: "#94a3b8",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
  pageBtn: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "0.5rem",
    padding: "0.45rem 1rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#64748b",
    backgroundColor: "transparent",
  },
};
