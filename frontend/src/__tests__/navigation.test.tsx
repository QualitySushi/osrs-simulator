import { render, screen } from '@testing-library/react';
import mockRouter from 'next-router-mock';
import { usePathname } from 'next/navigation';
import NotFound from '../app/not-found';

jest.mock('next/navigation', () => require('next-router-mock/navigation'));

function TestApp() {
  const pathname = usePathname();
  if (pathname === '/') {
    return <div>home</div>;
  }
  return <NotFound />;
}

describe('app routing', () => {
  it('renders 404 page for unknown routes', () => {
    mockRouter.push('/does-not-exist');
    render(<TestApp />);
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});
