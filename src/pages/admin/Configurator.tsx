import { Navigate, useSearchParams } from 'react-router-dom';

export default function Configurator() {
  const [params] = useSearchParams();
  const destination = params.get('tab') === 'communities'
    ? '/admin/communities'
    : params.get('tab') === 'categories'
      ? '/admin/sim-categories'
      : '/admin/work-orders';
  return <Navigate to={destination} replace />;
}
