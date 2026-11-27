'use client';

export default function DeleteButton({
  label,
  confirmMessage,
}: {
  label: string;
  confirmMessage: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className="font-medium text-red-600 hover:underline"
    >
      {label}
    </button>
  );
}
