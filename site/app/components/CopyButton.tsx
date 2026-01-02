"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
};

export function CopyButton({ text }: CopyButtonProps) {
  const [label, setLabel] = useState("Copier");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copie");
      window.setTimeout(() => setLabel("Copier"), 1400);
    } catch (error) {
      setLabel("Echec");
      window.setTimeout(() => setLabel("Copier"), 1400);
    }
  };

  return (
    <button className="copy" type="button" onClick={handleCopy}>
      {label}
    </button>
  );
}
