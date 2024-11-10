export default function ListItem({
  className = "",
  image,
  title,
  subtitle,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={
        "font-medium text-foreground flex gap-2.5 items-center cursor-pointer " +
        className
      }
    >
      {image && (
        <img src={image} alt={title} className="w-9 h-9 rounded-full" />
      )}

      <div>
        <p className="text-sm mb-1">{title}</p>
        <p className="text-xs opacity-60">{subtitle}</p>
      </div>
    </div>
  );
}
