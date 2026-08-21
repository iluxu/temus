import type { Metadata } from "next";
import TradingRoom from "./TradingRoom";

export const metadata: Metadata = {
  title: "Sentinelle Trading",
  description: "Le marché, les positions et des intelligences indépendantes dans un même World."
};

export default function SentinelleTradingPage() {
  return <TradingRoom />;
}
