import "./globals.css";

export const metadata = {
  title: "Taberna Concur",
  description: "An Online Community for Bartenders",
};

export default function RootLayout({
  children,}: Readonly<{
  children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
