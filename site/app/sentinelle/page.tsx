import type { Metadata } from "next";
import SentinelleApp from "./SentinelleApp";

export const metadata: Metadata = {
  title: "Sentinelle — Lucia Moments",
  description:
    "Watch, shape and compose Lucia Moments with Sentinelle inside the same shared reality."
};

export default function SentinellePage() {
  return <SentinelleApp />;
}
