export default function ellipsize(str, startLength, endLength) {
  if (str.length <= startLength + endLength) return str;

  return str.slice(0, startLength) + "..." + str.slice(-endLength);
}
