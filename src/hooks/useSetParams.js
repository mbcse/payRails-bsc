import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return function setParams(params) {
    const currentParams = new URLSearchParams(
      Array.from(searchParams.entries())
    );
    for (const [key, value] of Object.entries(params)) {
      currentParams.set(key, value);
    }

    const search = currentParams.toString();
    const query = search ? `?${search}` : "";

    router.push(`${pathname}${query}`);
  };
}
