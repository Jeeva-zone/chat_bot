import "./globals.css";

export const metadata = {
  title: "Token Harbor · AI Team Studio",
  description:
    "Single-chat and multi-agent team workflows on any OpenAI-compatible endpoint.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
