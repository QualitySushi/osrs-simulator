import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BossSelector } from '../components/features/calculator/BossSelector';
import { ItemSelector } from '../components/features/calculator/ItemSelector';
import { useCalculatorStore } from '../store/calculator-store';
import { useReferenceDataStore } from '../store/reference-data-store';

jest.mock('../services/api');

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeAll(() => {
  global.ResizeObserver = global.ResizeObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = function () {};
  }
});

describe('image alt text', () => {
  beforeEach(() => {
    useCalculatorStore.setState({
      selectedBoss: null,
      selectedBossForm: null,
    } as any);
    useReferenceDataStore.setState({
      bosses: [],
      bossForms: {},
      items: [],
      progress: 1,
      initialized: true,
      loading: false,
      error: false,
      timestamp: 0,
      initData: jest.fn(),
      addBosses: jest.fn(),
      addBossForms: jest.fn(),
      addItems: jest.fn(),
    });
  });

  it('renders boss icon with descriptive alt text', () => {
    const boss = { id: 1, name: 'Zulrah', icon_url: '/zulrah.png' } as any;
    useCalculatorStore.getState().setSelectedBoss(boss);
    useReferenceDataStore.setState({ bosses: [boss], bossForms: { 1: [] } });

    render(<BossSelector />, { wrapper });
    expect(screen.getByAltText('Zulrah icon')).toBeInTheDocument();
  });

  it('renders item icon with descriptive alt text in list', async () => {
    const item = {
      id: 2,
      name: 'Dragon scimitar',
      icons: ['/dragon.png'],
      slot: 'weapon',
      has_special_attack: false,
      has_passive_effect: false,
    } as any;
    useReferenceDataStore.setState({ items: [item] });

    render(<ItemSelector />, { wrapper });
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByAltText('Dragon scimitar icon')).toBeInTheDocument();
  });
});
