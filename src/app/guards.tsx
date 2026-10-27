import { Navigate, Outlet } from 'react-router-dom';
import { useCertificate } from '../features/certificate/CertificateContext';

export function RequireTemplate() {
  const { templateId } = useCertificate();
  return templateId ? <Outlet /> : <Navigate to="/create/template" replace />;
}

export function RequireValidDetails() {
  const { templateId, validationIssues } = useCertificate();
  if (!templateId) return <Navigate to="/create/template" replace />;
  return validationIssues.length === 0 ? <Outlet /> : <Navigate to="/create/details" replace />;
}
