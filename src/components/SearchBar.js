import { SearchIcon } from "./Icons";

export default function SearchBar({
  placeholder,
  className = "",
  value,
  setValue,
}) {
  return (
    <div className="relative">
      <SearchIcon className="text-[#7C7C7D] absolute top-1/2 -translate-y-1/2 left-4" />

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || "Search"}
        className="w-full bg-foreground/5 rounded-lg text-[#7C7C7D] text-sm py-3 pl-11 pr-4 focus:outline-none"
      />
    </div>
  );
}
