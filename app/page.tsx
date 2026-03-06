/**
 * Portal dashboard — placeholder home page.
 * Uses `overflow: auto` so the content area scrolls independently
 * while the portal nav stays fixed at the top.
 */
export default function DashboardPage() {
  return (
    <main
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 40px',
      }}
    >
      <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700 }}>
        Dashboard
      </h1>
      <p style={{ margin: 0, color: '#555' }}>
        Welcome to the OpenText Business Network portal.
      </p>
    </main>
  );
}
