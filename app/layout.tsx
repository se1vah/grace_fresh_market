import type { Metadata } from "next";
import { Quicksand, Nunito_Sans } from "next/font/google";
import { SocketProvider } from "@/components/providers/SocketProvider";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Grace Fresh Market - Farm Fresh Fruits & Vegetables App",
  description: "100% Certified organic farm-fresh fruits and vegetables delivered to your doorstep in 30 minutes.",
  icons: {
    icon: "/logo.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${quicksand.variable} ${nunitoSans.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F9FBF9] text-[#1E2922]">
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
