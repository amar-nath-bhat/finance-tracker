import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BillsManager } from '@/components/BillsManager';

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

describe('BillsManager Component', () => {
  const scrollMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = scrollMock;
    
    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: ['Utilities', 'Subscriptions'], subCategories: {} })
        });
      }
      if (url.includes('/api/bills') && !url.includes('pay')) {
         if (options && ['DELETE', 'PUT', 'POST'].includes(options.method)) {
              return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
          }
         return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { _id: 'b1', name: 'Netflix', amount: 15, category: 'Subscriptions', deadlineDay: 1, frequency: 'MONTHLY', paymentMethod: 'CC', paidPeriods: [] },
            { _id: 'b2', name: 'Rent', amount: 1000, category: 'Housing', deadlineDay: 28, frequency: 'ANNUALLY', paymentMethod: 'UPI', paidPeriods: ['2026-04'] }
          ])
        });
      }
      if (url.includes('pay')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  const waitForLoad = async () => {
    await waitFor(() => expect(screen.queryByText('Loading bills...')).not.toBeInTheDocument());
  };

  it('renders and fetches bills', async () => {
    render(<BillsManager />);
    expect(screen.getByText('Loading bills...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText(/15\.00/)).toBeInTheDocument();
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/settings');
    expect(global.fetch).toHaveBeenCalledWith('/api/bills');
  });

  it('validates form missing fields', async () => {
    render(<BillsManager />);
    await waitForLoad();

    const submitBtn = screen.getByRole('button', { name: /Save Bill/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Enter a valid amount > 0')).toBeInTheDocument();
    });
  });

  it('submits a valid bill successfully', async () => {
     render(<BillsManager />);
     await waitForLoad();

     const nameInput = screen.getByPlaceholderText('e.g., Rent, Internet, Netflix');
     fireEvent.change(nameInput, { target: { value: 'Gym' } });

     const amountInput = screen.getByPlaceholderText('0.00');
     fireEvent.change(amountInput, { target: { value: '50' } });

     const submitBtn = screen.getByRole('button', { name: /Save Bill/i });
     fireEvent.click(submitBtn);

     await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/bills', expect.objectContaining({ method: 'POST' }));
     });
  });

  it('opens pay modal and submits payment', async () => {
    render(<BillsManager />);
    await waitForLoad();

    const payBtns = screen.getAllByRole('button', { name: /Pay/i });
    fireEvent.click(payBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Payment')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Payment/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bills/b1/pay', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('cancels pay modal', async () => {
    render(<BillsManager />);
    await waitForLoad();

    const payBtns = screen.getAllByRole('button', { name: /Pay/i });
    fireEvent.click(payBtns[0]); 

    await waitFor(() => {
      expect(screen.getByText('Confirm Payment')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Confirm Payment')).not.toBeInTheDocument();
    });
  });

  it('handles edit and update flow', async () => {
    render(<BillsManager />);
    await waitForLoad();

    // Row 0 = header, Row 1 = Netflix, Row 2 = Rent
    // Each data row has: Pay, Edit, Delete buttons
    const firstRow = screen.getAllByRole('row')[1];
    const rowBtns = firstRow.querySelectorAll('button');
    
    await act(async () => {
      fireEvent.click(rowBtns[1]); // Edit button
    });

    expect(screen.getByText('Edit Bill')).toBeInTheDocument();
    expect(scrollMock).toHaveBeenCalled();

    const submitBtn = screen.getByRole('button', { name: /Update Bill/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledWith('/api/bills/b1', expect.objectContaining({ method: 'PUT' }));
    });
  });

  it('cancels edit mode', async () => {
    render(<BillsManager />);
    await waitForLoad();

    const firstRow = screen.getAllByRole('row')[1];
    const rowBtns = firstRow.querySelectorAll('button');
    
    await act(async () => {
      fireEvent.click(rowBtns[1]); // Edit button
    });

    expect(screen.getByText('Edit Bill')).toBeInTheDocument();

    const xBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-x'));
    if (xBtn) fireEvent.click(xBtn);

    await waitFor(() => {
       expect(screen.queryByText('Edit Bill')).not.toBeInTheDocument();
    });
  });

  it('handles delete flow', async () => {
     render(<BillsManager />);
     await waitForLoad();

     const firstRow = screen.getAllByRole('row')[1];
     const rowBtns = firstRow.querySelectorAll('button');
     
     await act(async () => {
       fireEvent.click(rowBtns[2]); // Delete button
     });

     await waitFor(() => {
        expect(screen.getByTestId('mock-confirm-modal')).toBeInTheDocument();
     });

     fireEvent.click(screen.getByText('Confirm Delete'));

     await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/bills/b1', expect.objectContaining({ method: 'DELETE' }));
     });
  });

  it('shows overdue statuses properly', async () => {
      render(<BillsManager />);
      await waitForLoad();
      
      const netflixRowText = screen.getByText('Netflix').closest('tr')?.innerHTML || '';
      expect(netflixRowText).toMatch(/Unpaid|Overdue/);
  });

  it('handles POST error gracefully', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: ['Utilities'], subCategories: {} })
        });
      }
      if (url.includes('/api/bills') && !url.includes('pay')) {
        if (options && options.method === 'POST') {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'fail' }) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<BillsManager />);
    await waitForLoad();

    const nameInput = screen.getByPlaceholderText('e.g., Rent, Internet, Netflix');
    fireEvent.change(nameInput, { target: { value: 'Test' } });

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '10' } });

    const submitBtn = screen.getByRole('button', { name: /Save Bill/i });
    fireEvent.click(submitBtn);

    const { toast } = require('sonner');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
