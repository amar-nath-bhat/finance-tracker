import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from '@/components/ConfirmModal';

describe('ConfirmModal Component', () => {
    it('does not render when isOpen is false', () => {
        const { container } = render(
            <ConfirmModal 
                isOpen={false} 
                title="Delete" 
                message="Are you sure?" 
                confirmText="Yes" 
                onConfirm={jest.fn()} 
                onCancel={jest.fn()} 
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders and responds to interactions when isOpen is true', () => {
        const onConfirmMock = jest.fn();
        const onCancelMock = jest.fn();

        render(
            <ConfirmModal 
                isOpen={true} 
                title="Delete Action" 
                message="Are you completely sure?" 
                confirmText="Yes, delete" 
                onConfirm={onConfirmMock} 
                onCancel={onCancelMock} 
            />
        );

        expect(screen.getByText('Delete Action')).toBeInTheDocument();
        expect(screen.getByText('Are you completely sure?')).toBeInTheDocument();

        const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelBtn);
        expect(onCancelMock).toHaveBeenCalled();

        const confirmBtn = screen.getByRole('button', { name: /Yes, delete/i });
        fireEvent.click(confirmBtn);
        expect(onConfirmMock).toHaveBeenCalled();
    });
});
