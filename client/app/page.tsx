"use client"

import react from "react"
import Nav from "../components/Nav"
import Hero from "../components/Hero"
import Footer from "../components/Footer"

export default function Home() {
  return (
    <div className="bg-black">
      <Nav />
      <Hero />  
      <Footer />
    </div>
  );
}