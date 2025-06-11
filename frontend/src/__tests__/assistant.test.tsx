import { render, screen } from '@testing-library/react';
import AssistantPage from '../app/assistant/page';

describe('assistant page', () => {
  it('renders heading', () => {
    render(<AssistantPage />);
    expect(screen.getByRole('heading', { name: /chat assistant/i })).toBeInTheDocument();
  });
});
