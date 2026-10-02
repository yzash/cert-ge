export const metadata = { title: 'Mozart Frontline BFF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', background: '#07111F', color: '#EEF3FA', padding: 32 }}>{children}</body>
    </html>
  );
}
