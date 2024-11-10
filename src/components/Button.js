export default function Button({
  title,
  disabled = false,
  loading = false,
  className = "",
  onClick,
}) {
  return (
    <button
      className={
        `relative py-4 block w-full rounded-3xl text-lg font-bold ${
          disabled ? "bg-[#a3a3a3] text-[#00000080]" : "bg-primary text-black"
        } ` + className
      }
      disabled={disabled}
      onClick={onClick}
    >
      <span className={loading ? "opacity-0" : ""}>{title}</span>
      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="border-gray-300 h-8 w-8 animate-spin rounded-full border-4 border-t-blue-600" />
        </div>
      )}
    </button>
  );
}
