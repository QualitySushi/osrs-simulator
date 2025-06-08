import { render, screen } from '@testing-library/react';
import { MagicForm } from '../components/features/calculator/MagicForm';
import { RangedForm } from '../components/features/calculator/RangedForm';
import { MeleeForm } from '../components/features/calculator/MeleeForm';

describe('combat forms render', () => {
  it('renders magic form', () => {
    render(<MagicForm />);
    expect(screen.getByText(/Magic Level/i)).toBeInTheDocument();
  });

  it('renders ranged form', () => {
    render(<RangedForm />);
    expect(screen.getByText(/Ranged Level/i)).toBeInTheDocument();
  });

  it('renders melee form', () => {
    render(<MeleeForm />);
    expect(screen.getByText(/Strength Level/i)).toBeInTheDocument();
  });
});
