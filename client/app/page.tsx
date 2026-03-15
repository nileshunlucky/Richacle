"use client"

import react from "react"
import Hero from "../components/Hero"
import Footer from "../components/Footer"

export default function Home() {
  return (
    <div className="bg-black">
      <Hero />
      <Footer />
    </div>
  );
}