import loadingCat from "../assets/loading-cat.svg";

const styles = `
  .lcat-root {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .lcat-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .lcat-art {
    width: var(--lcat-size, 172px);
    max-width: 100%;
    height: auto;
    user-select: none;
    pointer-events: none;
  }

  .lcat-status {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.1px;
  }

  .lcat-spinner {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 2px solid color-mix(in srgb, var(--accent), transparent 70%);
    border-top-color: var(--accent);
    animation: lcat-spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes lcat-spin {
    to { transform: rotate(360deg); }
  }
`;

export default function LoadingState({
  message = "Loading",
  minHeight = 260,
  imageWidth = 172,
  className = "",
  statusPlacement = "inline",
  lightModeOnly = false,
}) {
  const isBottomStatus = statusPlacement === "bottom";
  const rootStyle = {
    minHeight,
    ...(lightModeOnly
      ? {
          "--text-muted": "#5f6b85",
          "--accent": "#3b82f6",
        }
      : {}),
  };

  return (
    <div className={`lcat-root ${className}`} style={rootStyle}>
      <style>{styles}</style>
      <div
        className="lcat-inner"
        style={isBottomStatus ? { minHeight: "100%", width: "100%", justifyContent: "space-between" } : undefined}
      >
        {isBottomStatus && <div />}
        <img className="lcat-art" src={loadingCat} alt="" aria-hidden="true" style={{ "--lcat-size": `${imageWidth}px` }} />
        <div className="lcat-status">
          <span>{message}</span>
          <span className="lcat-spinner" />
        </div>
      </div>
    </div>
  );
}
