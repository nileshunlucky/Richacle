"use client"

import React, { useState, useEffect } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import Menu from "@/components/Menu"

// Define the structural type of a real user from your API
interface TraderUser {
  id: string
  username: string
  name: string
  networth: number // parsed balance/equity mapping
  avatar: string
  verified: Boolean
}

export default function Home() {
  const [users, setUsers] = useState<TraderUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Fetch all leaderboard users on mount
  useEffect(() => {
    async function fetchLeaderboardData() {
      try {
        setLoading(true)
        setError(false)

        // NOTE: Replace this endpoint with your real global "all users" or "leaderboard" endpoint
        // Step 1: Fetch the core list of users
        const usersRes = await fetch("https://api.richacle.com/users-full")
        if (!usersRes.ok) throw new Error("Failed to fetch traders list")
        const dynamicTraders = await usersRes.ok ? await usersRes.json() : []

        // Step 2: Fetch balances concurrently for all users using Promise.all
        const detailedUsers: TraderUser[] = await Promise.all(
          dynamicTraders.map(async (trader: any, index: number) => {
            const traderEmail = trader.email

            let liveEquity = 0

            if (traderEmail) {
              try {
                // Prepare form data for the POST balance API
                const formData = new FormData()
                formData.append("email", traderEmail)

                const balRes = await fetch("https://api.richacle.com/api/balance", {
                  method: "POST",
                  body: formData,
                })

                if (balRes.ok) {
                  const balData = await balRes.json()
                  if (balData.status === "success") {
                    liveEquity = Number(balData.equity || 0)
                  }
                }
              } catch (balErr) {
                console.error(`Could not fetch balance for ${traderEmail}:`, balErr)
                // Fallback to 0 or baseline asset if individual API fails
                liveEquity = Number(trader.equity || 0) 
              }
            }

            return {
              id: trader.id || String(index),
              username: trader.username || "anonymous",
              name: trader.name || "Unknown Trader",
              email: traderEmail || "",
              networth: liveEquity, 
              avatar: trader.avatar || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAgvAlI9O_F3MJZ9WdUONOZZSzUPopo9wQXw&s",
              verified : trader.active || false,
            }
          })
        )

        setUsers(detailedUsers)
      } catch (err) {
        console.error("Leaderboard Error:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboardData()
  }, [])

  // Sort strictly by networth descending for true ranking layout structure
  const sortedAndFilteredUsers = [...users]
    .sort((a, b) => b.networth - a.networth)
    .filter(
      (user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  // Premium formatting tool for net worth metrics ($1.2B, $628.9K)
  const formatNetWorth = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex justify-center">
      <div className="w-full max-w-md bg-black flex flex-col pt-3">
        
        {/* Search Bar */}
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1 bg-zinc-900 rounded-full flex items-center p-3 border border-transparent focus-within:border-neutral-800 transition-all duration-200">
            <Search size={20} className="text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent px-3 text-[15px] text-white placeholder-[#737373] outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="cursor-pointer text-[#a8a8a8] hover:text-white transition-colors rounded-full p-0.5"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Table Header Row */}
        <div className="flex items-center justify-between gap-3 px-6 py-2 text-[13px] font-semibold text-zinc-500">
          <div className="flex items-center gap-4">
            <span>Rank</span>
            <span>Trader</span>
          </div>
          <span className="text-right">Net Worth</span>
        </div>

        {/* Display System States */}
        <div className="flex-1 px-4 pt-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-24 text-zinc-500 gap-2 text-sm">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : error ? (
            <div className="text-center py-24 text-red-400 text-sm">
              Failed to load real-time database rankings.
            </div>
          ) : (
            <ul className="space-y-1">
              <AnimatePresence mode="popLayout">
                {sortedAndFilteredUsers.map((user) => {
                  // Keep a persistent global rank baseline even when matching custom filters
                  const globalRank = users.sort((a, b) => b.networth - a.networth).findIndex(u => u.id === user.id) + 1

                  return (
                    <Link key={user.id} href={`/${user.username}`}>
                      <motion.li
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex justify-between items-center gap-3 py-2 px-2 rounded-xl cursor-pointer hover:bg-zinc-900/40 active:scale-[0.99] transition-all"
                      >
                        <div className="flex items-center gap-5 min-w-0">
                          <span className="text-[15px] font-bold text-zinc-400 w-5 text-center">
                            {globalRank}
                          </span>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar} alt={user.username} className="object-cover" />
                            <AvatarFallback className="bg-zinc-800 text-xs font-semibold text-zinc-400">
                              {user.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex flex-col min-w-0">
                            <span className="text-[15px] font-semibold leading-tight text-white flex itmes-center gap-2">
                              {user.username}
                              {user.verified && (
              <img className="h-4" src="https://cdn-icons-png.magnific.com/256/18984/18984328.png?semt=ais_white_label" alt="logo" />
              )}
                            </span>
                            <span className="text-[14px] text-zinc-400 leading-tight mt-0.5 ">
                              {user.name}
                            </span>
                          </div>
                        </div>

                        <span className="text-[15px] text-white font-semibold whitespace-nowrap">
                          {formatNetWorth(user.networth)}
                        </span>
                      </motion.li>
                    </Link>
                  )
                })}
              </AnimatePresence>

              {sortedAndFilteredUsers.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-[#737373] text-[14px]"
                >
                  No trader found.
                </motion.div>
              )}
            </ul>
          )}
        </div>

      </div>
      <Menu/>
    </div>
  )
}