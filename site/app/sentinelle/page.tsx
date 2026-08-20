import type { Metadata } from "next";
import SentinelleApp from "./SentinelleApp";

export const metadata: Metadata = {
  title: "Sentinelle — Same reality. Different eyes.",
  description:
    "Work with Sentinelle inside the same structured World: shared objects, direct manipulation and one canonical reality."
};

export default function SentinellePage() {
  return <SentinelleApp />;
}
