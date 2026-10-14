const { render, screen } = require('@testing-library/react');
const ValidationMessageModule = require('../../components/ValidationMessage');
const ValidationMessage = ValidationMessageModule.default || ValidationMessageModule;

describe('ValidationMessage Component', () => {
  it('renders validation message in both English and Marathi', () => {
    const error = {
      en: 'This field is required.',
      mr: 'हे क्षेत्र आवश्यक आहे.'
    };

    render(<ValidationMessage error={error} />);

    expect(screen.getByText('This field is required.')).toBeInTheDocument();
    expect(screen.getByText('हे क्षेत्र आवश्यक आहे.')).toBeInTheDocument();
  });

  it('renders alert role containing both English and Marathi text', () => {
    const error = {
      en: 'This field is required.',
      mr: 'हे क्षेत्र आवश्यक आहे.'
    };

    render(<ValidationMessage error={error} />);

    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveTextContent('This field is required.');
    expect(alertElement).toHaveTextContent('हे क्षेत्र आवश्यक आहे.');
  });

  it('handles empty error gracefully', () => {
    render(<ValidationMessage error={{ en: '', mr: '' }} />);

    // Should not crash and should not display any text
    expect(screen.queryByText(/This field is required/)).not.toBeInTheDocument();
    expect(screen.queryByText(/हे क्षेत्र आवश्यक/)).not.toBeInTheDocument();
  });

  it('handles undefined error gracefully', () => {
    render(<ValidationMessage error={undefined} />);

    // Should not crash
    expect(screen.queryByText(/This field is required/)).not.toBeInTheDocument();
    expect(screen.queryByText(/हे क्षेत्र आवश्यक/)).not.toBeInTheDocument();
  });
});