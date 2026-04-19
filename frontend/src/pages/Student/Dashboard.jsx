/*
  StudentDashboard — read-only home for students.
  Shows: personal info, groupe + promo, and the courses linked to that promo.

  Data is scoped server-side to the authenticated student
  (backend/src/modules/student/student-panel.service.ts -> resolveStudentContext).
  No actions, no other students, no cross-promo data.
*/

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileCard from '../../components/dashboard/student/ProfileCard';
import GroupePromoCard from '../../components/dashboard/student/GroupePromoCard';
import CoursesGrid from '../../components/dashboard/student/CoursesGrid';
import { studentDashboardService } from '../../services/studentDashboard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await studentDashboardService.getOverview();
        if (!cancelled) setData(response?.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load your dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-edge-strong border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  const profile = data?.profile;
  const courses = Array.isArray(data?.modules) ? data.modules : [];
  const greetingName = profile?.prenom || user?.prenom || 'Student';

  return (
    <div className="space-y-6">
      <header className="bg-surface rounded-lg border border-edge shadow-card p-6">
        <h1 className="text-xl font-bold text-ink tracking-tight">
          Welcome, {greetingName}
        </h1>
        <p className="mt-2 text-sm text-ink-tertiary">
          Your personal dashboard — read-only overview of your academic profile.
        </p>
      </header>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfileCard profile={profile} />
        <GroupePromoCard promo={profile?.promo} />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-semibold text-ink">Your courses</h2>
          <span className="text-xs text-ink-tertiary">{courses.length} module{courses.length === 1 ? '' : 's'}</span>
        </div>
        <CoursesGrid courses={courses} />
      </section>
    </div>
  );
}
