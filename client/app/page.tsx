"use client"

import react from "react"
import Nav from "../components/Nav"
import Hero from "../components/Hero"
import Brands from "../components/Brands"
import Footer from "../components/Footer"
import Steps from "../components/Steps"

export default function Home() {
  return (
    <div className="bg-black">
    <Nav/>
      <Hero />
      <Brands />
      <Steps />
      <Footer />
    </div>
  );
}