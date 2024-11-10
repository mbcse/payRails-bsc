export default function Input({
  label,
  containerClassname = "",
  className = "",
  children,
  ...props
}) {
  return (
    <div className={containerClassname}>
      <label className="px-2 mb-3 text-base font-medium text-[#8F939C]">
        {label}
      </label>
      <div className="relative text-3xl font-medium">
        <input
          className={
            "px-2 bg-transparent border-b border-[rgba(255,255,255,0.16)] w-full focus:outline-none focus:border-[white] " +
            className
          }
          {...props}
        />
        {children}
      </div>
    </div>
  );
}
