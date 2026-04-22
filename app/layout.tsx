import "./globals.css";
import { AppNav } from "@/components/nav";
import { cookies } from "next/headers";

export const metadata = {
  title: "Tip",
  description: "Private daily value bets dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionToken = cookies().get("tip_session")?.value;
  return (
    <html lang="en">
      <body className="app-body">
        <main className="app-shell">
          {sessionToken ? <AppNav /> : null}
          <div className="app-content">{children}</div>
        </main>
      </body>
    </html>
  );
}
