export function SuccessAlert({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-success-line bg-success-soft px-3 py-2 text-sm text-success-ink"
    >
      {message}
    </div>
  )
}
