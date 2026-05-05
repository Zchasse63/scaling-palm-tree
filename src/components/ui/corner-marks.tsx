// Decorative `+` register-marks at the four corners of a relatively-positioned block.

export function CornerMarks() {
  return (
    <>
      <span className="regmark" style={{ position: "absolute", top: 6, left: 6 }}>+</span>
      <span className="regmark" style={{ position: "absolute", top: 6, right: 6 }}>+</span>
      <span className="regmark" style={{ position: "absolute", bottom: 6, left: 6 }}>+</span>
      <span className="regmark" style={{ position: "absolute", bottom: 6, right: 6 }}>+</span>
    </>
  );
}
