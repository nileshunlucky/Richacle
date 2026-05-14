import { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

const EVENTS: Record<string, any> = {
  "richacle-xcard": {
title:"Richacle AI",
  description: "The Oracle of Vibe Trading for Market Research Prediction Platform with OpenAI, Cluade, Grok, Gemini, DeepSeek AI models by Binance Integration and TradingView Chart support to Make Trading & Investing Simple, Fast and Extraodinary smart",
}
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = EVENTS[slug];

  return {
    twitter: {
      card: "summary_large_image",
      title: event?.title,
      description: event?.description,
      images: [`https://richacle.com/events/${slug}.png`], 
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const event = EVENTS[slug];

  if (event) {
    redirect("/");
  }

  return ;
}