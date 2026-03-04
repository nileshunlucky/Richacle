"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Twitter, Youtube, Instagram, Loader2 } from "lucide-react"
import { toast } from "sonner"

const Waitlist = () => {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Append state to FormData
    const formData = new FormData()
    formData.append("email", email)

    try {
      const response = await fetch("https://api.richacle.com/add-user", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast("You're on the list!")
        setEmail("") // Reset email input on success
      } else {
        toast.error("Something went wrong. Please try again.")
      }
    } catch (error) {
      console.error("Submission failed", error)
      toast.error("Failed to connect to the server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] px-6">
      {/* Gradient Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.35),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.25),transparent_60%)]" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 mx-auto max-w-2xl text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          Get notified when <br /> we’re launching
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-xs md:text-lg text-zinc-300"
        >
          Be part of the excitement. Receive exclusive launch updates
          and early access notifications.
        </motion.p>

        {/* Email Form */}
        <motion.form
          onSubmit={handleNotify}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address..."
            className="h-12 w-full max-w-md rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-purple-500"
          />
          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="h-12 w-full sm:w-auto rounded-xl bg-white px-6 text-black hover:bg-zinc-200 disabled:opacity-70"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Notify me"}
          </Button>
        </motion.form>

        {/* Social Icons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-16 flex justify-center gap-8 text-zinc-400"
        >
          <SocialLink href="https://x.com/richacleai" Icon={Twitter} />
          <SocialLink href="https://www.youtube.com/@richacle" Icon={Youtube} />
          <SocialLink href="https://www.instagram.com/richacle" Icon={Instagram} />
        </motion.div>
      </motion.div>
    </div>
  )
}

const SocialLink = ({ href, Icon }: { href: string; Icon: any }) => (
  <Link 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className="hover:text-white transition-colors duration-200"
  >
    <Icon className="h-5 w-5" />
  </Link>
)

export default Waitlist