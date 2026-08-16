import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Landing } from '@/pages/public/Landing';
import { Product } from '@/pages/public/Product';
import { HowItWorks } from '@/pages/public/HowItWorks';
import { Solutions } from '@/pages/public/Solutions';
import { Pricing } from '@/pages/public/Pricing';
import { Docs } from '@/pages/public/docs/Docs';
import { SecurityPage } from '@/pages/public/SecurityPage';
import { FAQ } from '@/pages/public/FAQ';
import { About } from '@/pages/public/About';
import { Contact } from '@/pages/public/Contact';
import { Privacy } from '@/pages/public/Privacy';
import { Terms } from '@/pages/public/Terms';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Login } from '@/pages/auth/Login';
import { Signup } from '@/pages/auth/Signup';
import { Onboarding } from '@/pages/app/Onboarding';
import { AppLayout } from '@/layouts/AppLayout';
import { Dashboard } from '@/pages/app/Dashboard';
import { CreateClient } from '@/pages/app/clients/CreateClient';
import { ClientProfile } from '@/pages/app/clients/ClientProfile';
import { ClientContracts } from '@/pages/app/clients/ClientContracts';
import { ClientInvoices } from '@/pages/app/clients/ClientInvoices';
import { ClientTones } from '@/pages/app/clients/ClientTones';
import { ClientActivity } from '@/pages/app/clients/ClientActivity';
import { InvoiceDetail } from '@/pages/app/invoices/InvoiceDetail';
import { Profile } from '@/pages/app/Profile';
import { Subscription } from '@/pages/app/Subscription';
import { Settings } from '@/pages/app/Settings';
import { NotificationsPage } from '@/pages/app/NotificationsPage';
import { SearchPage } from '@/pages/app/SearchPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cadence-bg">
        <div className="w-5 h-5 border-2 border-cadence-border border-t-cadence-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cadence-bg">
        <div className="w-5 h-5 border-2 border-cadence-border border-t-cadence-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!needsOnboarding) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="product" element={<Product />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="solutions" element={<Solutions />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="docs" element={<Docs />} />
        <Route path="docs/:topic" element={<Docs />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

      {/* App */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="client/new" element={<CreateClient />} />
        <Route path="client/:clientId" element={<ClientProfile />} />
        <Route path="client/:clientId/contracts" element={<ClientContracts />} />
        <Route path="client/:clientId/invoices" element={<ClientInvoices />} />
        <Route path="client/:clientId/tones" element={<ClientTones />} />
        <Route path="client/:clientId/activity" element={<ClientActivity />} />
        <Route path="invoice/:invoiceId" element={<InvoiceDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="subscription" element={<Subscription />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
