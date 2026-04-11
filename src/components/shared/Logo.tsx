"use client";

import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "white";
  linkTo?: string;
  asLink?: boolean; // Set to false when Logo is already inside a Link
}

export function Logo({
  size = "md",
  showText = true,
  variant = "default",
  linkTo,
  asLink = true,
}: LogoProps) {
  const sizes = {
    sm: { box: "w-28 h-7", text: "text-base", img: "w-42 h-8" },
    md: { box: "w-32 h-8", text: "text-lg", img: "w-48 h-12" },
    lg: { box: "w-12 h-12", text: "text-2xl", img: "w-8 h-8" },
    xl: { box: "w-48 h-16", text: "text-3xl", img: "w-48 h-12" },
  };

  const s = sizes[size];
  const isWhite = variant === "white";

  const content = (
    <div className="flex items-center gap-2.5">
      <div className={`${s.box} rounded-lg flex items-center justify-center overflow-hidden`}>
        <img
          src={isWhite ? "/white-logo.svg" : "/logo.svg"}
          alt="Hirasys"
          className={s.img}
          onError={(e) => {
            // Fallback if SVG not found
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).parentElement!.innerHTML = `
              <svg viewBox="0 0 40 40" class="${s.box}">
                <rect width="40" height="40" rx="8" fill="${isWhite ? "rgba(255,255,255,0.2)" : "#0245EF"}" />
                <path d="M10 12h6v16h-6zM24 12h6v16h-6zM16 18h8v4h-8z" fill="${isWhite ? "white" : "white"}" />
              </svg>
            `;
          }}
        />
      </div>
      
    </div>
  );

  if (!asLink) return content;

  return (
    <Link href={linkTo || "/"}>
      {content}
    </Link>
  );
}

export function LogoIcon({
  size = "md",
  variant = "default",
}: {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "white";
}) {
  const sizes = { sm: "w-5 h-5", md: "w-6 h-6", lg: "w-8 h-8" };

  return (
    <img
      src={variant === "white" ? "/logo-white.svg" : "/logo.svg"}
      alt="Hirasys"
      className={sizes[size]}
    />
  );
}