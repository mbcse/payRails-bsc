import ellipsize from "@/utils/ellipsize";
import copyText from "@/utils/copyText";
import LogoHorizontal from "./Icons/LogoHorizontal";
import PointsLogo from "./Icons/PointsLogo";
import Link from "next/link";
export default function Navbar({ userAddress, userPoints }) {
  return (
    <nav className="py-3 px-9 bg-[#1c1c1c] flex">
      <LogoHorizontal className="mr-auto" />

      <div className="h-[17px] justify-start items-start gap-[1px] top-4 py-1 inline-flex space-x-4">
        <Link
          href="/"
          className="text-[#8f939c] hover:text-[#caff33] text-sm font-normal"
        >
          Trade
        </Link>
        {/* <div className="text-[#8f939c] text-sm font-normal font-['Montserrat']">Transaction History</div> */}

        {!!userAddress && (
          <div
            className="bg-[#333] rounded-full  px-4 flex items-center gap-2.5 text-sm cursor-pointer"
            onClick={() => {
              if (window.SingularityEvent && window.SingularityEvent.open) {
                window.SingularityEvent.open();
              }
            }}
          >
            <div className="rounded-full bg-primary w-1.5 h-1.5" />
            {ellipsize(userAddress, 4, 5)}
          </div>
        )}
      </div>
    </nav>
  );
}
