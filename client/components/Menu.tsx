"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Journal from "@/components/Journal";
import { 
  MessageCircle,
  ChartNoAxesColumn,
  Calendar,
  Search 
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const avatarVariants = {
  initial: { opacity: 0, scale: 0.88 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function MenuContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [showJournal, setShowJournal] = useState(false);
  const [email, setEmail] = useState("");
  const [userProfile, setUserProfile] = useState({
    avatarUrl: "",
    username: "",
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email || "");
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!email) return;
    const fetchBinance = async () => {
      try {
        const userRes = await fetch(`https://api.richacle.com/user/${email}`);
        const userData = await userRes.json();
        setUserProfile({
          avatarUrl: userData?.avatar || "",
          username: userData?.username || "",
        });
      } catch (error) {
        console.error("Poll error:", error);
      }
    };
    fetchBinance();
  }, [email]);

  const isAgentActive = pathname === "/dashboard" && searchParams.get("agent") === "true";
  const isChartActive = pathname === "/dashboard" && !isAgentActive;
  const isExploreActive = pathname === "/explore";
  const isProfileActive = pathname === `/${userProfile?.username || "dashboard"}`;

  const iconClass = (active: boolean) =>
    active ? "text-white" : "text-white/40 hover:text-white/70 transition-colors";

  return (
    <div className="md:hidden fixed flex items-center justify-between bottom-0 left-0 z-50 p-3 px-7 bg-black text-white w-full">
      <button onClick={() => setShowJournal(true)} className="cursor-pointer text-white/40 hover:text-white/70 transition-colors">
        <Calendar size={23} />
      </button>
      <AnimatePresence>
        {showJournal && (
          <Journal email={email} onClose={() => setShowJournal(false)} />
        )}
      </AnimatePresence>

      <button onClick={() => router.push("/dashboard")}>
        <ChartNoAxesColumn size={23} className={iconClass(isChartActive)} />
      </button>

      <button onClick={() => router.push("/dashboard?agent=true")}>
        <MessageCircle size={23} className={iconClass(isAgentActive)} />
      </button>

      <button onClick={() => router.push("/explore")}>
        <Search size={23} className={iconClass(isExploreActive)} />
      </button>

      <button onClick={() => router.push(`/${userProfile?.username || "dashboard"}`)}>
        <div className="flex justify-center pb-0 cursor-pointer">
          <motion.div variants={avatarVariants} initial="initial" animate="animate">
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundImage: `url(${userProfile?.avatarUrl || "/user.png"})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                flexShrink: 0,
                border: isProfileActive ? "2px solid white" : "",
              }}
            />
          </motion.div>
        </div>
      </button>
    </div>
  );
}

export default function Menu() {
  return (
    <Suspense fallback={null}>
      <MenuContent />
    </Suspense>
  );
}