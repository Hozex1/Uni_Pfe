import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

/* ── Public (guest-accessible) pages ── */
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ActualitesPage from './pages/ActualitesPage';
import RequestsPage from './pages/RequestsPage';
import PublicLayout from './components/public/PublicLayout';

/* ── Auth pages ── */
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

/* ── Protected (requires login) ── */
import DashboardLayout from './layouts/DashboardLayout';
import SettingsPage from './pages/SettingsPage';
import SupportPage from './pages/SupportPage';
import ProfilePage from './pages/ProfilePage';
import DisciplinaryCasesPage from './pages/DisciplinaryCasesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUsersListPage from './pages/AdminUsersListPage';
import AdminPanelPage from './pages/AdminPanelPage';
import AdminAcademicManagementPage from './pages/AdminAcademicManagementPage';
import AdminAcademicAssignmentsPage from './pages/AdminAcademicAssignmentsPage';
import AdminSiteSettingsPage from './pages/AdminSiteSettingsPage';
import AdminAlertsPage from './pages/AdminAlertsPage';
import PfeManagementPage from './pages/admin/PfeManagementPage';
import AIAssistantPage from './pages/AIAssistantPage';
import DocumentsPage from './pages/DocumentsPage';
import StudentNotesPage from './pages/StudentNotesPage';
import StudentSpecialiteChoicePage from './pages/StudentSpecialiteChoicePage';
import AdminGroupsPage from './pages/admin/Groups';
import ProjectsPage from './pages/PFE/ProjectsPage';
import SubjectsPage from './pages/PFE/SubjectsPage';
import GroupsPage from './pages/PFE/GroupsPage';
import DefensePage from './pages/PFE/DefensePage';

/* ── Misc ── */
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';
import AIChatbot from './components/ai/AIChatbot';
import ComponentShowcase from './pages/ComponentShowcase';

function hasAdminRole(user) {
  if (!Array.isArray(user?.roles)) {
    return false;
  }

  return user.roles.some((roleName) => String(roleName || '').toLowerCase() === 'admin');
}

function DisciplinaryLandingRedirect() {
  const { user } = useAuth();
  const targetPath = hasAdminRole(user)
    ? '/dashboard/discipline/admin'
    : '/dashboard/discipline/report';

  return <Navigate to={targetPath} replace />;
}

function TeacherDisciplinaryView() {
  return <DisciplinaryCasesPage role="teacher" />;
}

function AdminDisciplinaryView() {
  return <DisciplinaryCasesPage role="admin" />;
}

function PresidentDisciplinaryView() {
  return <DisciplinaryCasesPage role="president" />;
}

function App() {
  const { i18n } = useTranslation();

  /* Keep document dir & lang in sync with the active language */
  useEffect(() => {
    const lang = i18n.language?.substring(0, 2) || 'fr';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return (
    <ThemeProvider>
      <SiteSettingsProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <div className="min-h-full">
              <Routes>
              {/* ── Public / Guest routes (PublicLayout: navbar + footer, no sidebar) ── */}
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/actualites" element={<PublicLayout contained><ActualitesPage role="guest" /></PublicLayout>} />
              <Route path="/requests" element={<PublicLayout contained><RequestsPage role="guest" /></PublicLayout>} />

              {/* ── Auth routes (standalone — no sidebar, no navbar) ── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* ── Component Showcase (for documentation/reports) ── */}
              <Route path="/showcase" element={<ComponentShowcase />} />

              {/* ── Protected routes (DashboardLayout: sidebar + topbar) ── */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/support" element={<ProtectedRoute><DashboardLayout><SupportPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardLayout><ProfilePage /></DashboardLayout></ProtectedRoute>} />
              <Route
                path="/dashboard/disciplinary"
                element={
                  <ProtectedRoute allowedRoles={['enseignant', 'admin']}>
                    <DashboardLayout><DisciplinaryLandingRedirect /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/discipline/report"
                element={
                  <ProtectedRoute allowedRoles={['enseignant']}>
                    <DashboardLayout><TeacherDisciplinaryView /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/discipline/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout><AdminDisciplinaryView /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/discipline/president"
                element={
                  <ProtectedRoute
                    allowedRoles={['enseignant']}
                    accessFn={(user) => Array.isArray(user?.memberships) && user.memberships.some((m) => String(m?.role || '').toLowerCase() === 'president')}
                  >
                    <DashboardLayout><PresidentDisciplinaryView /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard/actualites" element={<ProtectedRoute><DashboardLayout><ActualitesPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/ai" element={<ProtectedRoute><DashboardLayout><AIAssistantPage /></DashboardLayout></ProtectedRoute>} />
              <Route
                path="/dashboard/documents"
                element={
                  <ProtectedRoute allowedRoles={['enseignant', 'teacher', 'admin']}>
                    <DashboardLayout><DocumentsPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard/projects" element={<ProtectedRoute><DashboardLayout><ProjectsPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/projects/subjects" element={<ProtectedRoute><DashboardLayout><SubjectsPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/projects/groups" element={<ProtectedRoute><DashboardLayout><GroupsPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/projects/defense" element={<ProtectedRoute><DashboardLayout><DefensePage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/notes" element={<ProtectedRoute><DashboardLayout><StudentNotesPage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/specialite-choice" element={<ProtectedRoute><DashboardLayout><StudentSpecialiteChoicePage /></DashboardLayout></ProtectedRoute>} />
              <Route path="/dashboard/requests" element={<ProtectedRoute><DashboardLayout><RequestsPage /></DashboardLayout></ProtectedRoute>} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['users:manage']}
                    accessMode="any"
                  >
                    <DashboardLayout><AdminPanelPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['users:manage']}
                    accessMode="any"
                  >
                    <Navigate to="/admin" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/users"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['users:manage']}
                    accessMode="any"
                  >
                    <DashboardLayout><AdminUsersPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/users/list-create"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['roles:assign']}
                    accessMode="any"
                  >
                    <DashboardLayout><AdminUsersListPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/academic/management"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['departments:manage', 'specialites:manage']}
                    accessMode="any"
                  >
                    <DashboardLayout><AdminAcademicManagementPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/academic/assignments"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['users:manage', 'roles:assign']}
                    accessMode="any"
                  >
                    <DashboardLayout><AdminAcademicAssignmentsPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/site-settings"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['users:manage']}
                    accessMode="any"
                  >
                    <DashboardLayout><AdminSiteSettingsPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/alerts"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                    requiredPermissions={['users:manage']}
                    accessMode="any"
                  >
                    <DashboardLayout><AdminAlertsPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/pfe"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin']}
                  >
                    <DashboardLayout><PfeManagementPage /></DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard/admin/groups" element={<ProtectedRoute><DashboardLayout><AdminGroupsPage /></DashboardLayout></ProtectedRoute>} />

              {/* ── Error pages ── */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <AIChatbot />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
