/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './components/auth/AuthProvider';
import { AppProvider } from './context';
import withAuth from './components/auth/withAuth';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';

// Route-level code splitting (P1): every page — and the app shell itself — is
// its own lazy chunk, so the initial download stays minimal.
const Layout = React.lazy(() => import('./components/Layout'));
const Landing = React.lazy(() => import('./pages/Landing'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })));
const Signup = React.lazy(() => import('./pages/Login').then(m => ({ default: m.SignupPage })));

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Home = React.lazy(() => import('./pages/Home'));
const Analysis = React.lazy(() => import('./pages/Analysis'));
const Script = React.lazy(() => import('./pages/Script'));
const Scenes = React.lazy(() => import('./pages/Scenes'));
const ShotList = React.lazy(() => import('./pages/ShotList'));
const Schedule = React.lazy(() => import('./pages/Schedule'));
const Promo = React.lazy(() => import('./pages/Promo'));

// Auth-guarded wrappers, created once.
const GuardedDashboard = withAuth(Dashboard);
const GuardedHome = withAuth(Home);
const GuardedAnalysis = withAuth(Analysis);
const GuardedScript = withAuth(Script);
const GuardedScenes = withAuth(Scenes);
const GuardedShotList = withAuth(ShotList);
const GuardedSchedule = withAuth(Schedule);
const GuardedPromo = withAuth(Promo);

/** Fallback shown while a lazy page chunk downloads. */
function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-zinc-500">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      <p className="text-sm">Chargement...</p>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastContainer />
      <AuthProvider>
        <AppProvider>
          <Router>
            <Routes>
              {/* Public marketing surface */}
              <Route path="/" element={<Suspense fallback={<RouteFallback />}><Landing /></Suspense>} />
              <Route path="/pricing" element={<Suspense fallback={<RouteFallback />}><Pricing /></Suspense>} />
              <Route path="/login" element={<Suspense fallback={<RouteFallback />}><Login /></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={<RouteFallback />}><Signup /></Suspense>} />

              {/* Application — behind auth, under the shared Layout shell */}
              <Route
                path="/app"
                element={
                  <ErrorBoundary>
                    <Suspense fallback={<RouteFallback />}>
                      <Layout />
                    </Suspense>
                  </ErrorBoundary>
                }
              >
                <Route index element={<Suspense fallback={<RouteFallback />}><GuardedDashboard /></Suspense>} />
                <Route path="new" element={<Suspense fallback={<RouteFallback />}><GuardedHome /></Suspense>} />
                <Route path="analysis" element={<Suspense fallback={<RouteFallback />}><GuardedAnalysis /></Suspense>} />
                <Route path="script" element={<Suspense fallback={<RouteFallback />}><GuardedScript /></Suspense>} />
                <Route path="scenes" element={<Suspense fallback={<RouteFallback />}><GuardedScenes /></Suspense>} />
                <Route path="shotlist" element={<Suspense fallback={<RouteFallback />}><GuardedShotList /></Suspense>} />
                <Route path="schedule" element={<Suspense fallback={<RouteFallback />}><GuardedSchedule /></Suspense>} />
                <Route path="promo" element={<Suspense fallback={<RouteFallback />}><GuardedPromo /></Suspense>} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Route>

              {/* Backwards compatibility: old flat routes redirect into /app */}
              <Route path="/analysis" element={<Navigate to="/app/analysis" replace />} />
              <Route path="/script" element={<Navigate to="/app/script" replace />} />
              <Route path="/scenes" element={<Navigate to="/app/scenes" replace />} />
              <Route path="/shotlist" element={<Navigate to="/app/shotlist" replace />} />
              <Route path="/schedule" element={<Navigate to="/app/schedule" replace />} />
              <Route path="/promo" element={<Navigate to="/app/promo" replace />} />
              <Route path="/new" element={<Navigate to="/app/new" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
