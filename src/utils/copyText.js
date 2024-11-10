import toast from "react-hot-toast";

export default function copyText(text, message) {
  try {
    navigator.clipboard.writeText(text);
    if (message) toast.success(message);
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
}
