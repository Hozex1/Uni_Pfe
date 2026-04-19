/*
  TeacherDashboard — modern teacher home: students + courses, scoped to
  the teacher's own promo IDs by the backend
  (backend/src/modules/teacher/teacher.service.ts -> resolveTeacherContext).

  Frontend filters are UX only; they cannot widen access.
*/

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import KPITile from '../../components/dashboard/KPITile';
import EmptyState from '../../components/dashboard/EmptyState';
import FilterBar from '../../components/dashboard/shared/FilterBar';
import StudentsTable from '../../components/dashboard/teacher/StudentsTable';
import CourseOverviewCard from '../../components/dashboard/teacher/CourseOverviewCard';
import ReportStudentModal from '../../components/dashboard/teacher/ReportStudentModal';
import {
  teacherDashboardService,
  summarizeCourses,
  extractFilterOptions,
} from '../../services/teacherDashboard';

const TABS = [
  { id: 'students', label: 'Students' },
  { id: 'courses', label: 'Courses' },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('students');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ groupeId: '', promoId: '', moduleId: '' });
  const [reportTarget, setReportTarget] = useState(null);
  const [toast, setToast] = useState('');

  const hasPresidentMembership = useMemo(
    () =>
      Array.isArray(user?.memberships) &&
      user.memberships.some(
        (membership) => String(membership?.role || '').toLowerCase() === 'president'
      ),
    [user]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingOverview(true);
        const response = await teacherDashboardService.getOverview();
        if (!cancelled) setOverview(response?.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load dashboard.');
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingStudents(true);
        const response = await teacherDashboardService.listStudents({
          moduleId: filters.moduleId ? Number(filters.moduleId) : undefined,
          search: search.trim() || undefined,
          limit: 100,
        });
        if (!cancelled) setStudents(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setError(err?.message || 'Failed to load students.');
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.moduleId, search]);

  const courses = overview?.courses ?? [];
  const filterOptions = useMemo(() => extractFilterOptions(courses), [courses]);

  const visibleStudents = useMemo(() => {
    let list = students;

    if (filters.promoId) {
      const promoId = Number(filters.promoId);
      list = list.filter((s) => s.promo?.id === promoId);
    }

    if (filters.groupeId) {
      const [rawPromoId, rawSection] = String(filters.groupeId).split('::');
      const promoId = Number(rawPromoId);
      list = list.filter(
        (s) => s.promo?.id === promoId && (s.promo?.section || '') === (rawSection || '')
      );
    }

    return list;
  }, [students, filters.promoId, filters.groupeId]);

  const courseSummaries = useMemo(
    () => summarizeCourses(courses, students),
    [courses, students]
  );

  const distinctGroupesCount = filterOptions.groupes.length;
  const distinctCoursesCount = filterOptions.modules.length;

  const handleResetFilters = () => {
    setFilters({ groupeId: '', promoId: '', moduleId: '' });
    setSearch('');
  };

  return (
    <div className="space-y-6">
      <header className="bg-surface rounded-lg border border-edge shadow-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Welcome back, {user?.prenom || 'Teacher'}
            </h1>
            <p className="mt-2 text-sm text-ink-tertiary">
              Manage students in your groupes and your assigned courses.
            </p>
          </div>

          {hasPresidentMembership && (
            <button
              onClick={() => navigate('/dashboard/discipline/president')}
              className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-hover transition-colors"
            >
              Open Decision Panel
            </button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPITile
          title="Students"
          value={loadingStudents ? '…' : students.length}
          subtitle="Across your assigned groupes"
          accent="brand"
        />
        <KPITile
          title="Groupes"
          value={loadingOverview ? '…' : distinctGroupesCount}
          subtitle="Distinct sections you teach"
          accent="success"
        />
        <KPITile
          title="Courses"
          value={loadingOverview ? '…' : distinctCoursesCount}
          subtitle="Modules under your responsibility"
          accent="warning"
        />
      </section>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {toast && (
        <div className="bg-success/10 border border-success/30 text-success text-sm px-4 py-3 rounded-md">
          {toast}
        </div>
      )}

      <nav
        className="flex items-center gap-1 border-b border-edge"
        role="tablist"
        aria-label="Teacher dashboard sections"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-tertiary hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'students' && (
        <div className="space-y-4">
          <FilterBar
            groupes={filterOptions.groupes}
            promos={filterOptions.promos}
            modules={filterOptions.modules}
            searchValue={search}
            selected={filters}
            onChange={setFilters}
            onSearchChange={setSearch}
            onReset={handleResetFilters}
          />

          <StudentsTable
            students={visibleStudents}
            loading={loadingStudents}
            onReport={(student) => setReportTarget(student)}
          />
        </div>
      )}

      {activeTab === 'courses' && (
        <div>
          {loadingOverview ? (
            <div className="bg-surface rounded-lg border border-edge p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-edge-strong border-t-brand rounded-full animate-spin" />
            </div>
          ) : courseSummaries.length === 0 ? (
            <EmptyState
              title="No courses assigned"
              description="Once an admin assigns courses to you, they will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {courseSummaries.map((course) => (
                <CourseOverviewCard key={course.moduleId} course={course} />
              ))}
            </div>
          )}
        </div>
      )}

      <ReportStudentModal
        student={reportTarget}
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        onSubmitted={() => {
          setToast('Report submitted. Case created for review.');
          window.setTimeout(() => setToast(''), 4000);
        }}
      />
    </div>
  );
}
