"use client";

import { Inter, Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { initializeSingularity } from "singularity-init";
import { useEffect, useRef, useState } from "react";
import Trade from "./trade";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TradingViewTicker from "./trade/TradingViewTicker";
import { usePathname } from "next/navigation";
const inter = Inter({ subsets: ["latin"] });
const montserrat = Montserrat({ subsets: ["latin"] });

// function initializeSingularity(
//   w = window,
//   d = document,
//   v = "latest",
//   e = "production",
//   apiKey,
//   initCallback
// ) {
//   if (apiKey) {
//     window.document.body.addEventListener("Singularity-mounted", () => {
//       window.Singularity.init(apiKey, async () => {
//         if (initCallback) {
//           initCallback();
//         }
//       });
//     });
//   }

//   let s = "script";
//   let o = "Singularity";
//   let js = "";
//   let fjs = "";

//   w[o] =
//     w[o] ||
//     function () {
//       (w[o].q = w[o].q || []).push(arguments);
//     };
//   js = d.createElement(s);
//   fjs = d.getElementsByTagName(s)[0];
//   js.id = o;
//   js.src = `http://localhost:3000/index.js`;
//   js.async = 1;
//   fjs.parentNode.insertBefore(js, fjs);
//   w.SingularityEnv = e;
// }

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(undefined);
  const [userAddress, setUserAddress] = useState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initDone = useRef(false);
  const [userData, setUserData] = useState();
  const [userId, setUserId] = useState();
  const [userPoints, setUserPoints] = useState(0);

  const getUserId = async () => {
    const resp = await fetch(
      "https://cerebro.s9y.gg/v1/external-wallet-protected/get_create_singularity_user",
      {
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_CLIENT_API_KEY,
        },
        body: JSON.stringify({
          evmPublicAddress: userAddress,
          walletMode: userData.metaData.mode,
          label: userData.metaData.wallet.label,
        }),
        method: "POST",
      }
    );

    const data = await resp.json();
    setUserId(data.userId);
  };

  const getUserPointsBalance = async () => {
    try {
      const myHeaders = new Headers();
      myHeaders.append("x-api-key", process.env.NEXT_PUBLIC_CLIENT_API_KEY);

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
      };

      const resp = await fetch(
        `https://cerebro.s9y.gg/v1/transactionPoints/fetchPoints?userId=${userId}`,
        requestOptions
      );
      const data = await resp.json();
      setUserPoints(data.points || 0);
    } catch (error) {
      setUserPoints(0);
    }
  };

  useEffect(() => {
    if (userData && userData.metaData) {
      getUserId();
    }
  }, [userData]);

  useEffect(() => {
    if (userId) {
      getUserPointsBalance();
    } else {
      setUserPoints(0);
    }
  }, [userId]);

  const initSingularity = () => {
    initializeSingularity(
      window,
      document,
      "1.8.6-sandbox.2",
      "qal",
      "sinswapd2c-123454321",
      // "16116",
      async () => {
        console.log("Singularity Init done");

        const userData = await window.SingularityEvent.getConnectUserInfo();
        setUserData(userData);
        const address =
          userData?.metaData?.wallet?.accounts?.evmPublicAddress[0]
            ?.publicAddress;

        setLoggedIn(!!address);
        setUserAddress(address);

        window.SingularityEvent.subscribe("SingularityEvent-logout", () => {
          console.log("logout event received");
          setLoggedIn(false);
          setUserAddress();
          setUserData(null);
          setUserId(null);
          // navigate("/");
          window.SingularityEvent.close();
        });

        window.SingularityEvent.subscribe("SingularityEvent-open", () => {
          setDrawerOpen(true);
        });

        window.SingularityEvent.subscribe("SingularityEvent-close", () => {
          console.log("subscribe close drawer ");
          setDrawerOpen(false);
        });

        window.SingularityEvent.subscribe(
          "SingularityEvent-onTransactionApproval",
          (data) => {
            console.log("Txn approved", JSON.parse(data));
          }
        );

        window.SingularityEvent.subscribe(
          "SingularityEvent-onTransactionSuccess",
          (data) => {
            console.log("Txn Successfull", JSON.parse(data));
          }
        );

        window.SingularityEvent.subscribe(
          "SingularityEvent-onTransactionFailure",
          (data) => {
            console.log("Txn failed", JSON.parse(data));
          }
        );

        window.SingularityEvent.subscribe(
          "SingularityEvent-login",
          async (data) => {
            setLoggedIn(true);
            console.log("login data --->", data);
            window.SingularityEvent.close();

            const userData = await window.SingularityEvent.getConnectUserInfo();
            setUserData(userData);
            const address =
              userData?.metaData?.wallet?.accounts?.evmPublicAddress[0]
                ?.publicAddress;

            setUserAddress(address);
          }
        );
      }
    );
  };

  console.log("tichnas user address", userAddress);

  useEffect(() => {
    if (!initDone.current) initSingularity();
    initDone.current = true;
  }, []);

  return (
    <html lang="en">
      <body
        className={
          montserrat.className +
          " bg-background text-foreground min-h-screen overflow-auto flex flex-col bg-cover relative pb-14"
        }
      >
        {drawerOpen && (
          <div
            className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-50"
            onClick={() => window.SingularityEvent.close()}
          />
        )}

        <Navbar userAddress={userAddress} userPoints={userPoints} />
        <TradingViewTicker />
        {/* <button onClick={initSingularity}>Init Singularity</button> */}
        {/* {children} */}

        <Trade loggedIn={loggedIn} drawerOpen={drawerOpen} />

        <Footer />
      </body>
    </html>
  );
}
