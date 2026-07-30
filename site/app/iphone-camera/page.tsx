import type { Metadata } from "next";
import IPhoneCameraSender from "./IPhoneCameraSender";

export const metadata: Metadata = {
  title: "Caméra iPhone pour Mini OBS Windows | adoptan.ai",
  description: "Liaison privée de la caméra iPhone vers Adoptan Mini OBS pour Windows.",
  robots: {
    index: false,
    follow: false
  }
};

export default function IPhoneCameraPage() {
  return <IPhoneCameraSender />;
}
