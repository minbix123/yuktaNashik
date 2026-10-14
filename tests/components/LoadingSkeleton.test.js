const { render, screen } = require('@testing-library/react');
const LoadingSkeletonModule = require('../../components/LoadingSkeleton');
const LoadingSkeleton = LoadingSkeletonModule.default || LoadingSkeletonModule;

describe('LoadingSkeleton Component', () => {
  it('renders status container and pulse skeleton when isLoading is true', () => {
    render(<LoadingSkeleton isLoading={true} />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();

    const pulseElement = statusElement.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  it('accepts and renders custom children', () => {
    const customContent = <div data-testid="custom-content">Custom Loading</div>;

    render(<LoadingSkeleton isLoading={true}>{customContent}</LoadingSkeleton>);

    expect(screen.getByRole('status')).toBeInTheDocument();
    const customElement = screen.getByTestId('custom-content');
    expect(customElement).toBeInTheDocument();
    expect(customElement).toHaveClass('animate-pulse');
  });

  it('accepts className prop and applies it', () => {
    const customClass = 'custom-skeleton-class';

    render(<LoadingSkeleton isLoading={true} className={customClass} />);

    const statusElement = screen.getByRole('status');
    const skeletonElement = statusElement.querySelector(`.${customClass}`);
    expect(skeletonElement).toBeInTheDocument();
    expect(skeletonElement).toHaveClass(customClass);
  });

  it('accepts width and height props', () => {
    render(<LoadingSkeleton isLoading={true} width={200} height={100} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders children directly when isLoading is false', () => {
    render(
      <LoadingSkeleton isLoading={false}>
        <div data-testid="loaded-content">Loaded</div>
      </LoadingSkeleton>
    );

    expect(screen.getByTestId('loaded-content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});