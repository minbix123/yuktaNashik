export default function ValidationMessage({ error, id }) {
  if (!error) return null

  const message = typeof error === "string"
    ? { en: error, mr: "कृपया हे क्षेत्र तपासा." }
    : error

  return (
    <p id={id} role="alert" aria-live="assertive" className="mt-1 text-sm text-red-700">
      <span>{message.en}</span>
      <span className="block" lang="mr">{message.mr}</span>
    </p>
  )
}

export function FormValidationSummary({ message, errors }) {
  if (!message && (!errors || Object.keys(errors).length === 0)) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
      className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-800"
    >
      <h2 className="sr-only">Form errors</h2>
      {message && <p className="font-medium">{typeof message === "string" ? message : message.en}</p>}
      {message && typeof message === "object" && <p lang="mr">{message.mr}</p>}
      {errors && Object.keys(errors).length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {Object.entries(errors).map(([field, error]) => (
            <li key={field}>
              <span>{typeof error === "string" ? error : error.en}</span>
              {typeof error === "object" && <span lang="mr"> — {error.mr}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
