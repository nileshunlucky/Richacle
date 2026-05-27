"use client";

import React, { useState, useEffect } from "react";
import { notFound, useRouter } from 'next/navigation'; 
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft
} from "lucide-react";

export default function ProfilePage({ params }) {
  // Safe param unwrapping for Next.js client context
  const resolvedParams = React.use(params);
  const username = resolvedParams.username;

  // React states to handle the dynamic API cycle
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function getProfileData() {
      try {
        setLoading(true)

        const apiResponse = await fetch(`https://api.richacle.com/api/user/${username}`);
        
        if (!apiResponse.ok) {
          console.error("Richacle API lookup failed:", apiResponse.statusText);
          setError(true);
          return;
        }
        
        const apiData = await apiResponse.json();
        const targetEmail = apiData.email; // Got the email from the DB!

        if (!targetEmail) {
          console.error("Target user has no email tied to their account.");
          setError(true);
          return;
        }

        // 2. Fetch trade history using the TARGET USER's email
        const formData = new FormData();
        formData.append("email", targetEmail);

        const tradeResponse = await fetch("https://api.richacle.com/api/trade-history", {
          method: "POST",
          body: formData,
        });

        let displayNetWorth = "$0.00";
        let displayNetWorthChange = "$0.00 (0.00%)";
        let isNegative = false;

        if (tradeResponse.ok) {
          const tradeData = await tradeResponse.json();
          
          if (tradeData.status === "success" && tradeData.calendar && tradeData.calendar.length > 0) {
            const calendar = tradeData.calendar;

            // Sort calendar data chronologically by date string
            calendar.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Calculate overall net worth by summing total historic realized PnL
            const totalPnL = calendar.reduce((sum, day) => sum + (day.pnl || 0), 0);
            displayNetWorth = `$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            // Pull the latest active day's PnL to reflect real-time daily change metrics
            const latestDay = calendar[calendar.length - 1];
            const latestPnL = latestDay.pnl || 0;
            
            isNegative = latestPnL < 0;

            // Calculate percentage relative to previous equity baseline
            const historicBaseline = totalPnL - latestPnL;
            let percentageChange = 0;
            if (historicBaseline !== 0) {
              percentageChange = (latestPnL / Math.abs(historicBaseline)) * 100;
            }
            

            displayNetWorthChange = `$${Math.abs(latestPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.abs(percentageChange).toFixed(2)}%)`;
          }
        } else {
          console.error("Trade history API endpoint returned an error status");
        }

        // 4. Update the layout state seamlessly matching your explicit UI requirements
        setUser({
          name: apiData.name || "Nilesh Shinde",
          username: apiData.username || username,
          bio: apiData.bio || "Founder & CEO, Richacle",
          netWorth: displayNetWorth,
          netWorthChange: displayNetWorthChange,
          isChangeNegative: isNegative,
          rank: "1",
          avatar: apiData.avatar || "https://upload.wikimedia.org/wikipedia/commons/0/0e/Elon_Musk_%2854816836217%29_%28cropped_2%29_%28b%29.jpg", 
        });

      } catch (err) {
        console.error("Execution error fetching profile details:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    getProfileData();
  }, [username]);

  // Loading state placeholder
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex flex-col justify-between items-center text-white text-center p-6">
  {/* Clear invisible spacer to force the center item into a true middle balance */}
  <div className="h-12 w-full opacity-0 pointer-events-none" aria-hidden="true" />

  {/* Main Center Body Content */}
  <div className="flex flex-col items-center justify-center gap-5">
    {/* Set exactly to 20px height */}
    <img className="h-12 w-auto object-contain" src="/logo.png" alt="logo" />
  </div>

  {/* True Flow Footer — Securely stuck to the bottom */}
  <div className="pb-4">
    <p className="text-zinc-500 text-lg">from</p>
    <p className="theseason text-xl tracking-wider">RICHACLE</p>
  </div>
</main>
    );
  }

  // Graceful 404 trigger if endpoint fails or session is missing
  if (error || !user) {
    notFound();
  }

  return (
    // Outer container matching the dark contrast background from the Forbes layout
    <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">


           
      
      {/* Forbes Profile Card Container */}
      <div className="w-full max-w-sm overflow-hidden rounded-sm ">
        
         <button 
              onClick={() => router.back()}
              className="text-neutral-400 hover:text-white fixed cursor-pointer"
            >
              <ChevronLeft />
            </button>
        {/* Top Half: Dark Section hosting the main profile square picture */}
        <div className="bg-neutral-950 p-6 flex justify-center pt-10 pb-0">
          <div className="w-48 h-48 overflow-hidden rounded">
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        {/* Bottom Half: Clean White Details Card Section */}
        <div className="px-8 pt-6 pb-12 text-center flex flex-col items-center">
          
          {/* Forbes Brand Identifier Style Label */}
          <div className="flex items-center gap-1.5 mb-6 text-[12px] text-neutral-500">
            <img className="h-5" src="/logo.png" alt="logo"/> 
            @{user.username}
          </div>

          {/* Name & Bio Title */}
          <h1 className="font-serif text-3xl font-medium text-neutral-900 mb-1 theseason">
            {user.name}
          </h1>
          <p className="tracking-wide text-neutral-500 mb-6">
            {user.bio}
          </p>

          {/* Net Worth Metrics block */}
          <div className="flex items-center justify-between pt-5 gap-5">
            <div className="text-4xl font-bold font-sans text-neutral-900 mb-1 text-left">
              {user.netWorth}
              <span className={`font-light flex text-xs items-center gap-0.5 mt-0.5   ${user.isChangeNegative ? 'text-red-600' : 'text-green-600'}`}>
                {user.isChangeNegative ? '▼' : '▲'} {user.netWorthChange}
              </span>
            </div>
            
            {/* Daily changes tracking */}
            <div className="flex flex-col gap-0.5 mt-1 text-left gap-2">
              {/* Real-time stats ticker subtext */}
              <div className="text-[11px] text-neutral-800 font-medium tracking-wider">
                Real Time Net Worth
                <br/>
                <span className="text-xs text-zinc-500">as of 26/6/26</span>
              </div>
              
              <span className="text-neutral-400 italic text-[11px] underline cursor-pointer">
                #{user.rank} in the <span className="theseason  text-neutral-600">RICHACLE</span> today
              </span>
            </div>
          </div>

        </div>
      </div>

    </main>
  );
}