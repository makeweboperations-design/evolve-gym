// Signature motif: ascending weight-plate silhouettes used as a section divider.
// Not decorative for its own sake — gyms genuinely stack plates smallest-to-largest,
// so this reuses the subject's own visual vocabulary instead of a generic rule/numbering.
export default function PlateDivider() {
  const sizes = [14, 20, 28, 38, 28, 20, 14];
  return (
    <div className="gl-plate-divider" aria-hidden="true">
      {sizes.map((s, i) => (
        <span
          key={i}
          className="gl-plate"
          style={{ width: s, height: s }}
        />
      ))}
    </div>
  );
}
