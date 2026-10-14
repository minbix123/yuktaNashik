import React from 'react'

const LoadingSkeleton = ({ isLoading, children, fallback, className }) => {
  if (!isLoading) return children

  const loadingContent = (() => {
    if (fallback) {
      return React.cloneElement(fallback, {
        'aria-hidden': true,
        className: `${fallback.props.className || ''} animate-pulse bg-gray-200 dark:bg-gray-700`.trim(),
      })
    }

    if (children) {
      return React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              'aria-hidden': true,
              className: `${child.props.className || ''} animate-pulse bg-gray-200 dark:bg-gray-700`.trim(),
            })
          : child
      )
    }

    return <div aria-hidden="true" className={`h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className || ''}`} />
  })()

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading</span>
      {loadingContent}
    </div>
  )
}

export default LoadingSkeleton
