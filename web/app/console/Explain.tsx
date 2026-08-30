// Storytelling device used at the top of every console page: what am I
// looking at, and why does it matter. Plain, confident, no JSX children —
// just a title and a short list of points.

export function Explain({ title, points }: { title: string; points: string[] }) {
  return (
    <div
      style={{
        background: "var(--accent-soft)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: "var(--radius)",
        padding: "14px 18px",
        marginBottom: 16,
        fontSize: 15,
        lineHeight: 1.6,
      }}
    >
      <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
