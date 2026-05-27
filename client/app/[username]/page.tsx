"use client";

import React, { useState, useEffect, useRef } from "react";
import { notFound, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, Camera, X, Check, Loader2, Share2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// ─── Animation Variants ────────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 },
  },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const avatarVariants = {
  initial: { opacity: 0, scale: 0.88 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

interface UserProfile {
  name: string;
  username: string;
  bio: string;
  netWorth: string;
  netWorthChange: string;
  isChangeNegative: boolean;
  rank: string;
  avatar: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = React.use(params);
  const username = resolvedParams.username;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  const [isOwner, setIsOwner] = useState(false);
  const [targetEmail, setTargetEmail] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({ name: "", username: "", bio: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // ── Share handler ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    const shareData = {
      title: `${user?.name || "User"}'s Profile | Richacle`,
      text: `Check out ${user?.name || "this"} profile on Richacle!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share canceled or failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Could not copy text: ", err);
      }
    }
  };

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function getProfileData() {
      try {
        setLoading(true);

        const apiResponse = await fetch(`https://api.richacle.com/api/user/${username}`);
        if (!apiResponse.ok) {
          setError(true);
          return;
        }

        const apiData = await apiResponse.json();
        const profileEmail = apiData.email;

        if (!profileEmail) {
          setError(true);
          return;
        }

        setTargetEmail(profileEmail);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === profileEmail) setIsOwner(true);

        const formData = new FormData();
        formData.append("email", profileEmail);

        const tradeResponse = await fetch("https://api.richacle.com/api/trade-history", {
          method: "POST",
          body: formData,
        });

        let displayNetWorth = "$0.00";
        let displayNetWorthChange = "$0.00 (0.00%)";
        let isNegative = false;

        if (tradeResponse.ok) {
          const tradeData = await tradeResponse.json();
          if (tradeData.status === "success" && tradeData.calendar?.length > 0) {
            const calendar = [...tradeData.calendar].sort(
              (a, b) => new Date(a.date) - new Date(b.date)
            );
            const totalPnL = calendar.reduce((sum, day) => sum + (day.pnl || 0), 0);
            displayNetWorth = `$${totalPnL.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
            const latestPnL = calendar[calendar.length - 1].pnl || 0;
            isNegative = latestPnL < 0;
            const historicBaseline = totalPnL - latestPnL;
            const pct = historicBaseline !== 0
              ? (latestPnL / Math.abs(historicBaseline)) * 100
              : 0;
            displayNetWorthChange = `$${Math.abs(latestPnL).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} (${Math.abs(pct).toFixed(2)}%)`;
          }
        }

        const fetchedAvatar =
          apiData.avatar ||
          "https://upload.wikimedia.org/wikipedia/commons/0/0e/Elon_Musk_%2854816836217%29_%28cropped_2%29_%28b%29.jpg";

        setUser({
          name: apiData.name || "Nilesh Shinde",
          username: apiData.username || username,
          bio: apiData.bio || "Founder & CEO, Richacle",
          netWorth: displayNetWorth,
          netWorthChange: displayNetWorthChange,
          isChangeNegative: isNegative,
          rank: "1",
          avatar: fetchedAvatar,
        });

        setEditForm({
          name: apiData.name || "Nilesh Shinde",
          username: apiData.username || username,
          bio: apiData.bio || "Founder & CEO, Richacle",
        });
        setImagePreview(fetchedAvatar);
      } catch (err) {
        console.error("Error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (username) getProfileData();
  }, [username]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }  
  };

  async function handleSaveProfile() {
    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("email", targetEmail); 
      if (editForm.name) formData.append("name", editForm.name);
      if (editForm.username) formData.append("username", editForm.username);
      if (editForm.bio) formData.append("bio", editForm.bio);
      if (imageFile) formData.append("profile_image", imageFile);

      const response = await fetch("https://api.richacle.com/api/user/edit", {
        method: "POST",
        body: formData,
      });

      console.log("response", response)


      const result = await response.json();
      console.log(result)
      if (response.ok) {
        setUser((prev) => ({
          ...prev,
          name: editForm.name,
          username: editForm.username,
          bio: editForm.bio,
          avatar: result.updated_fields?.avatar || prev.avatar,
        }));
        if (editForm.username !== username) {
          router.replace(`/${editForm.username}`);
        }
        setIsEditing(false);
      } else {
        toast(result.detail || "Error updating profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSaving(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex flex-col justify-between items-center text-white text-center p-6">
        <div className="h-12 w-full opacity-0 pointer-events-none" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center justify-center gap-5"
        >
          <img className="h-12 w-auto object-contain" src="/logo.png" alt="logo" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="pb-4"
        >
          <p className="text-zinc-500 text-lg">from</p>
          <p className="theseason text-xl tracking-wider">RICHACLE</p>
        </motion.div>
      </main>
    );
  }

  if (error || !user) notFound();

  // ── Edit View ──────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <AnimatePresence mode="wait">
        <motion.main
          key="edit"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen  flex items-center justify-center p-4"
        >
          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="w-full max-w-sm overflow-hidden rounded-lg relative "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(false)}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-9 w-9 cursor-pointer rounded-full transition-all duration-200"
              >
                <X size={24} />
              </Button>

              <h2 className="text-white theseason text-lg">RICHACLE</h2>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="text-zinc-200 hover:text-white hover:bg-zinc-800 h-9 w-9 cursor-pointer rounded-full transition-all duration-200"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
              </Button>
            </div>

            {/* Form Body */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="p-7 flex flex-col items-center gap-7"
            >
              {/* Avatar Upload */}
             <motion.div variants={avatarVariants}>
  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
    <div style={{
      width: "144px",
      height: "144px",
      borderRadius: "50%",
      backgroundImage: `url(${imagePreview})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      flexShrink: 0,
      opacity: 0.7,
    }} className="group-hover:opacity-40 transition-opacity duration-300" />
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <Camera className="text-zinc-200" size={28} />
    </div>
    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
  </div>
</motion.div>


              {/* Inputs */}
              <motion.div variants={fadeUp} className="w-full space-y-5 p-5 px-0">
                {/* Name */}
                <div>
                  <label className="text-[10px]  text-zinc-500 font-semibold ml-0.5 block mb-1.5">
                    Name
                  </label>
                  <Input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="bg-transparent border-0  rounded p-2 text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:border-zinc-400 transition-colors duration-200 h-8"
                  />
                </div>
                {/* Username */}
                <div>
                  <label className="text-[10px]  text-zinc-500 font-semibold ml-0.5 block mb-1.5">
                    Username
                  </label>
                  <Input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="bg-transparent border-0  rounded p-2 text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:border-zinc-400 transition-colors duration-200 h-8"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-[10px]  text-zinc-500 font-semibold ml-0.5 block mb-1.5">
                    Bio
                  </label>
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={3}
                    className="bg-transparent border-0 rounded p-2 text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:border-zinc-400 transition-colors duration-200 resize-none"
                  />
                </div>
              </motion.div>

            </motion.div>
          </motion.div>
        </motion.main>
      </AnimatePresence>
    );
  }

  // ── Profile View ───────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key="profile"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen bg-neutral-900 flex items-center justify-center p-4"
      >
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="w-full max-w-sm overflow-hidden rounded-sm relative"
        >
          {/* Back button */}
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white absolute top-4 left-4 z-10 cursor-pointer transition-colors duration-150"
          >
            <ChevronLeft size={20} />
          </motion.button>

          {/* Top Half — Avatar */}
<div className="p-6 flex justify-center pt-10 pb-0">
  <motion.div variants={avatarVariants} initial="initial" animate="animate">
    <div style={{
      width: "192px",
      height: "192px",
      borderRadius: "50%",
      backgroundImage: `url(${user.avatar})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      flexShrink: 0,
    }} />
  </motion.div>
</div>

          {/* Bottom Half — Details */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="px-8 pt-6 pb-12 text-center flex flex-col items-center"
          >
            {/* @username row */}
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-1.5 mb-6 text-[12px] text-zinc-500"
            >
              <img className="h-5" src="/logo.png" alt="logo" />
              @{user.username}
            </motion.div>

            {/* Name */}
            <motion.h1
              variants={fadeUp}
              className="font-serif text-3xl font-medium text-neutral-900 mb-1 theseason"
            >
              {user.name}
            </motion.h1>

            {/* Bio */}
            <motion.p
              variants={fadeUp}
              className="tracking-wide text-zinc-500 mb-4"
            >
              {user.bio}
            </motion.p>

            {/* Owner Actions */}
            {isOwner && (
              <motion.div
                variants={fadeUp}
                className="flex items-center gap-5 mb-4"
              >
                {/* Edit Profile */}
                <motion.div
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                >
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="
                      cursor-pointer h-8 px-5 text-xs font-semibold 
                      bg-zinc-900 hover:bg-zinc-800
                      text-zinc-100 hover:text-white
                      
                      rounded
                      transition-all duration-200
                    "
                  >
       
                    Edit Profile
                  </Button>
                </motion.div>

                {/* Share Profile */}
                <motion.div
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                >
                  <Button
                    onClick={handleShare}
                    className="
                      cursor-pointer h-8 px-5 text-xs font-semibold 
                      bg-zinc-900 hover:bg-zinc-800
                      text-zinc-300 hover:text-zinc-100
                      
                      rounded
                      transition-all duration-200
                    "
                  >
                    Share Profile
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Net Worth Row */}
            <motion.div
              variants={fadeUp}
              className="flex items-center justify-between  gap-5"
            >
              <div className="text-4xl font-bold font-sans text-neutral-900 mb-1 text-left">
                {user.netWorth}
                <span
                  className={`font-light flex text-xs items-center gap-0.5 mt-0.5 ${
                    user.isChangeNegative ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {user.isChangeNegative ? "▼" : "▲"} {user.netWorthChange}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 mt-1 text-left gap-2">
                <div className="text-[11px] text-neutral-800 font-medium tracking-wider">
                  Real Time Net Worth
                  <br />
                <span className="text-xs text-zinc-500">
  as of {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })}
</span>
                </div>

                <motion.span
                  whileHover={{ x: 1 }}
                  className="text-zinc-400 italic text-[11px] underline cursor-pointer transition-all duration-150"
                >
                  #{user.rank} in the{" "}
                  <span className="theseason">RICHACLE</span> today
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.main>
    </AnimatePresence>
  );
}