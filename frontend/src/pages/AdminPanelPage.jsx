import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Settings2,
  UserCog,
  Users,
} from 'lucide-react';
import AdminSectionCard from '../components/admin/AdminSectionCard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';

const SIDEBAR_THEME_KEYS = ['slate', 'blue', 'indigo', 'emerald', 'rose'];

const CARD_THEME_STYLES = {
  slate: {
    card: 'border-slate-200/80 bg-slate-50 hover:bg-slate-100',
    iconWrap: 'bg-slate-100',
    icon: 'text-slate-600',
    title: 'text-slate-800',
    description: 'text-slate-600',
    action: 'text-slate-700 group-hover:text-slate-800',
    actionButton: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300',
  },
  blue: {
    card: 'border-blue-200/80 bg-blue-50 hover:bg-blue-100',
    iconWrap: 'bg-blue-100',
    icon: 'text-blue-600',
    title: 'text-blue-700',
    description: 'text-blue-700/80',
    action: 'text-blue-600 group-hover:text-blue-700',
    actionButton: 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-300',
  },
  indigo: {
    card: 'border-indigo-200/80 bg-indigo-50 hover:bg-indigo-100',
    iconWrap: 'bg-indigo-100',
    icon: 'text-indigo-600',
    title: 'text-indigo-700',
    description: 'text-indigo-700/80',
    action: 'text-indigo-600 group-hover:text-indigo-700',
    actionButton: 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300',
  },
  emerald: {
    card: 'border-emerald-200/80 bg-emerald-50 hover:bg-emerald-100',
    iconWrap: 'bg-emerald-100',
    icon: 'text-emerald-600',
    title: 'text-emerald-700',
    description: 'text-emerald-700/80',
    action: 'text-emerald-600 group-hover:text-emerald-700',
    actionButton: 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300',
  },
  rose: {
    card: 'border-rose-200/80 bg-rose-50 hover:bg-rose-100',
    iconWrap: 'bg-rose-100',
    icon: 'text-rose-600',
    title: 'text-rose-700',
    description: 'text-rose-700/80',
    action: 'text-rose-600 group-hover:text-rose-700',
    actionButton: 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300',
  },
};

function getStoredThemeColor() {
  if (typeof window === 'undefined') return 'blue';
  const stored = localStorage.getItem('themeColor');
  return SIDEBAR_THEME_KEYS.includes(stored) ? stored : 'blue';
}

const MAIN_SECTIONS = [
  {
    key: 'users',
    title: 'User Management',
    description: 'Create accounts, assign roles, and supervise access across the platform.',
    to: '/dashboard/admin/users',
    icon: Users,
  },
  {
    key: 'students',
    title: 'Student Management',
    description: 'Maintain student records, onboarding, and academic profile data.',
    to: '/dashboard/admin/users',
    icon: GraduationCap,
  },
  {
    key: 'teachers',
    title: 'Teacher Management',
    description: 'Manage teacher profiles, permissions, and instructional responsibilities.',
    to: '/dashboard/admin/users',
    icon: UserCog,
  },
  {
    key: 'academic-assignment',
    title: 'Academic Assignment',
    description: 'Handle affectation academique and align classes with faculty resources.',
    to: '/dashboard/admin/academic/assignments',
    icon: Settings2,
  },
  {
    key: 'pfe-management',
    title: 'PFE Management',
    description: 'Create subjects, assign groups, validate choices, and set jury composition.',
    to: '/dashboard/admin/pfe',
    icon: BookOpen,
  },
  {
    key: 'disciplinary',
    title: 'Disciplinary Management',
    description: 'Review cases, apply decisions, and keep disciplinary workflows compliant.',
    to: '/dashboard/disciplinary',
    icon: ShieldAlert,
  },
];

export default function AdminPanelPage() {
  const { user } = useAuth();
  const { sidebarColor } = useTheme();

  const resolvedThemeColor = SIDEBAR_THEME_KEYS.includes(sidebarColor)
    ? sidebarColor
    : getStoredThemeColor();
  const cardThemeStyle = CARD_THEME_STYLES[resolvedThemeColor] || CARD_THEME_STYLES.blue;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-500/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Administration</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Admin Control Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Manage your system efficiently with a modern, centralized control panel.</p>
          <p className="mt-1 text-xs text-slate-500">Signed in as {user?.prenom} {user?.nom}</p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Main Sections</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a section to continue administration tasks.</p>
          </div>
          <Link
            to="/dashboard/admin/site-settings"
            className={`inline-flex items-center rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg ${cardThemeStyle.actionButton}`}
          >
            Site Configuration
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MAIN_SECTIONS.map((section) => (
            <AdminSectionCard
              key={section.key}
              to={section.to}
              title={section.title}
              description={section.description}
              Icon={section.icon}
              themeStyle={cardThemeStyle}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
