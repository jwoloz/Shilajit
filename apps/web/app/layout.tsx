export const metadata = {
  title: 'Shilajit',
  description: 'Your psychedelic journey companion',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
