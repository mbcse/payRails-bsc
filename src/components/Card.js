export default function Card({ className = "", children }) {
  return (
    <div
      className={
        "border border-[#313131] rounded-2xl shadow-lg p-7 " + className
      }
    >
      {children}
    </div>
  );
}
