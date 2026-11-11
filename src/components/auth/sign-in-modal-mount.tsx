"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { useAuth } from "@/components/providers/auth-provider";

// The modal, its form and the OTP input are only needed once somebody asks to sign in, so they are a
// separate chunk (not in the bundle every page loads). The chunk is warmed when the browser is idle, so
// the first open does not wait for the network.
const loadSignInModal = () => import("./sign-in-modal");
const SignInModal = dynamic(() => loadSignInModal().then((m) => m.SignInModal), { ssr: false });

/**
 * Mounts the sign-in modal at the layout root, driven by `AuthProvider` state.
 * Kept separate from the provider so the provider never imports the modal (and
 * its form, which reads `useAuth`) — no import cycle. Nothing is mounted until
 * the modal has been asked for once; after that it stays mounted so its exit
 * animation can play.
 */
export function SignInModalMount() {
  const { signIn, closeSignIn } = useAuth();
  const [asked, setAsked] = useState(signIn.open);
  if (signIn.open && !asked) setAsked(true);

  useEffect(() => {
    const warm = () => void loadSignInModal();
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 3000);
    return () => window.clearTimeout(id);
  }, []);

  if (!asked) return null;
  return (
    <SignInModal
      open={signIn.open}
      next={signIn.next}
      authError={signIn.error}
      onClose={closeSignIn}
    />
  );
}
