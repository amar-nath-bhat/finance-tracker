import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TransactionManager } from '@/components/TransactionManager';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/components/ConfirmModal', () => {
  return {
    ConfirmModal: ({ isOpen, onConfirm, onCancel }: any) => {
      if (!isOpen) return null;
      return (
        <div data-testid="mock-confirm-modal">
          <button onClick={onConfirm}>Confirm Delete</button>
          <button onClick={onCancel}>Cancel Delete</button>
        </div>
      );
    }
  };
});

global.fetch = jest.fn() as jest.Mock;

const MOCK_TRANSACTION = {
  _id: '1',
  type: 'DEBIT',
  amount: 100,
  category: 'Food',
  date: '2026-04-04T00:00:00.000Z',
  paymentMethod: 'UPI',
  description: 'Lunch'
};

describe('TransactionManager Component', () => {
  const scrollMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = scrollMock;

    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: ['Food', 'Housing', 'Travel'], subCategories: { Housing: ['Rent'] } })
        });
      }
      if (url.includes('/api/transactions')) {
        if (options && ['DELETE', 'PUT', 'POST'].includes(options.method)) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([MOCK_TRANSACTION])
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  // Helper to wait for initial load to complete
  const waitForLoad = async () => {
    await waitFor(() => expect(screen.queryByText('Loading tracking data...')).not.toBeInTheDocument());
  };

  // Helper to get action buttons from row
  const getRowButtons = () => {
    const rows = screen.getAllByRole('row');
    // Row 0 = thead row, Row 1 = data row
    return rows[1].querySelectorAll('button');
  };

  it('renders transactions and fetches data', async () => {
    render(<TransactionManager />);
    expect(screen.getByText('Loading tracking data...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('-₹100.00')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/settings');
    expect(global.fetch).toHaveBeenCalledWith('/api/transactions');
  });

  it('validates form missing fields', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const submitBtn = screen.getByRole('button', { name: /Add Transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid amount > 0')).toBeInTheDocument();
    });
  });

  it('submits valid form data successfully', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const amountInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(amountInputs[0], { target: { value: '500' } });

    const descInput = screen.getByPlaceholderText('What was this for?');
    fireEvent.change(descInput, { target: { value: 'Groceries' } });

    const submitBtn = screen.getByRole('button', { name: /Add Transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/transactions', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });
  });

  it('handles edit and update flow', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const btns = getRowButtons();
    // Button order: Flag(0), Edit(1), Trash(2)
    await act(async () => {
      fireEvent.click(btns[1]);
    });

    expect(screen.getByRole('heading', { name: /Edit Transaction/i })).toBeInTheDocument();
    expect(scrollMock).toHaveBeenCalled();

    const submitBtn = screen.getByRole('button', { name: /Update Transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/transactions?id=1', expect.objectContaining({ method: 'PUT' }));
    });
  });

  it('cancels edit correctly', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const btns = getRowButtons();
    await act(async () => {
      fireEvent.click(btns[1]);
    });

    expect(screen.getByRole('heading', { name: /Edit Transaction/i })).toBeInTheDocument();

    // The X button appears next to the heading when editing
    const xBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-x'));
    if (xBtn) fireEvent.click(xBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Add Transaction/i })).toBeInTheDocument();
    });
  });

  it('handles flagging a transaction', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const btns = getRowButtons();
    await act(async () => {
      fireEvent.click(btns[0]); // Flag button
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/transactions?id=1', expect.objectContaining({ method: 'PUT' }));
    });
  });

  it('handles deleting a transaction', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const btns = getRowButtons();
    await act(async () => {
      fireEvent.click(btns[2]); // Delete button
    });

    await waitFor(() => {
      expect(screen.getByTestId('mock-confirm-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/transactions?id=1', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  it('handles smart search correctly', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const searchInput = screen.getByPlaceholderText(/Search "spent last week"/i);
    fireEvent.change(searchInput, { target: { value: 'Lunch' } });

    await waitFor(() => {
      expect(screen.getByText('-₹100.00')).toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: 'Nonexistent Transaction' } });

    await waitFor(() => {
      expect(screen.queryByText('-₹100.00')).not.toBeInTheDocument();
    });
  });

  it('opens and closes manual filters', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const filtersBtn = screen.getByRole('button', { name: /Filters/i });
    fireEvent.click(filtersBtn);

    await waitFor(() => {
      expect(screen.getByText('Min Amount')).toBeInTheDocument();
    });

    const minInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(minInputs[1], { target: { value: '500' } });

    await waitFor(() => {
      expect(screen.queryByText('-₹100.00')).not.toBeInTheDocument();
    });

    const clearBtn = screen.getByText('Clear Filters');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('-₹100.00')).toBeInTheDocument();
    });
  });

  it('changes transaction type radio', async () => {
    render(<TransactionManager />);
    await waitForLoad();

    const incomeRadio = screen.getByLabelText(/Income/i);
    fireEvent.click(incomeRadio);

    const amountInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(amountInputs[0], { target: { value: '1000' } });

    const submitBtn = screen.getByRole('button', { name: /Add Transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === '/api/transactions' && c[1]?.method === 'POST'
      )?.[1]?.body || '{}');
      expect(body.type).toBe('CREDIT');
    });
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: ['Food'], subCategories: {} })
        });
      }
      if (url.includes('/api/transactions')) {
        if (options && options.method === 'POST') {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'fail' }) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([MOCK_TRANSACTION])
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<TransactionManager />);
    await waitForLoad();

    const amountInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(amountInputs[0], { target: { value: '50' } });

    const submitBtn = screen.getByRole('button', { name: /Add Transaction/i });
    fireEvent.click(submitBtn);

    const { toast } = require('sonner');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
