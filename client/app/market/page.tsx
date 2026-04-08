import { Metadata } from "next";

export const metadata: Metadata = {
  twitter: {
    card: "summary_large_image",
    title: "Will Bitcoin hit $100k?",
    description: "Current Odds: 65%",
    images: ["https://richacle.com/market.png"], 
  },
};

export default function Page() {
  return (
    <div className="bg-black text-white h-screen">
      <h1>Market Dashboard</h1>
    </div>
  );
}