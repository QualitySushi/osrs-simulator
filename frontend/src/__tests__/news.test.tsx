import { render, screen } from '@testing-library/react';
import NewsPage from '../app/news/page';

describe('news page', () => {
  it('renders heading', () => {
    render(<NewsPage />);
    expect(screen.getByRole('heading', { name: /news/i })).toBeInTheDocument();
  });
});
