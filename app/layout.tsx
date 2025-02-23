// app/layout.tsx (Global App Layout File)
import "./globals.css";

export const metadata = {
  title: "Taberna Concur",
  description: "An Online Community for Bartenders",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,}: Readonly<{
  children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
