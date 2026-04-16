import { useEffect, useState } from "react";
import serverDownIllustration from "../../assets/server-down-illustration.svg";

const JULY_RESTART_IST = "2026-07-01T09:00:00+05:30";

const getJulyRestartCountdown = (now = new Date()) => {
  const julyRestart = new Date(JULY_RESTART_IST);
  const countdownMs = Math.max(0, julyRestart.getTime() - now.getTime());
  return { countdownMs };
};

export default function ServerDown() {
  const [elapsed, setElapsed] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const [restartCountdown, setRestartCountdown] = useState(() => getJulyRestartCountdown());

  useEffect(() => {
    const elapsedInterval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    const scheduleInterval = setInterval(() => {
      setRestartCountdown(getJulyRestartCountdown());
    }, 1000);
    const pulseInterval = setInterval(() => {
      setPulseKey((k) => k + 1);
    }, 15000);

    return () => {
      clearInterval(elapsedInterval);
      clearInterval(scheduleInterval);
      clearInterval(pulseInterval);
    };
  }, []);

  const formatElapsed = (secs) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const formatCountdown = (countdownMs) => {
    const totalSeconds = Math.max(0, Math.floor(countdownMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(
      seconds
    ).padStart(2, "0")}s`;
  };

  const startupMessage =
    restartCountdown.countdownMs > 0
      ? `${formatCountdown(restartCountdown.countdownMs)} to July 1, 2026, 9:00 AM IST`
      : "July restart window has begun";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sd-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .sd-bg {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 10% 100%, rgba(64,123,255,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 90% 0%, rgba(64,123,255,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .sd-grid {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(64,123,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(64,123,255,0.04) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
        }

        .sd-layout {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          max-width: 1220px;
          width: calc(100% - 56px);
          padding: 56px 0;
          animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .sd-illus {
          flex: 0 0 540px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .sd-illus img {
          width: 100%;
          max-width: 520px;
          filter: drop-shadow(0 24px 48px rgba(64,123,255,0.12));
        }

        .sd-illus-glow {
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(64,123,255,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .sd-content {
          flex: 1;
          padding-left: 72px;
        }

        .sd-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(64,123,255,0.08);
          border: 1px solid rgba(64,123,255,0.2);
          border-radius: 100px;
          padding: 6px 16px 6px 11px;
          margin-bottom: 28px;
          animation: fadeUp 0.7s 0.1s cubic-bezier(0.16,1,0.3,1) both;
        }

        .sd-badge-dot {
          width: 9px; height: 9px;
          border-radius: 50%;
          background: #407BFF;
          flex-shrink: 0;
          animation: blink 1.4s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(64,123,255,0.4); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 5px rgba(64,123,255,0); }
        }

        .sd-badge-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          font-weight: 500;
          color: #407BFF;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .sd-heading {
          font-size: 52px;
          font-weight: 800;
          color: #0b1537;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: 18px;
          animation: fadeUp 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both;
        }

        .sd-heading span { color: #407BFF; }

        .sd-body {
          font-size: 20px;
          color: #6b7a9e;
          line-height: 1.7;
          margin-bottom: 36px;
          max-width: 580px;
          font-weight: 400;
          animation: fadeUp 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both;
        }

        .sd-status-card {
          background: #f8faff;
          border: 1px solid rgba(64,123,255,0.14);
          border-radius: 18px;
          overflow: hidden;
          margin-bottom: 32px;
          animation: fadeUp 0.7s 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }

        .sd-progress-wrap {
          height: 4px;
          background: rgba(64,123,255,0.1);
        }

        .sd-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #407BFF 0%, #7aaaff 100%);
          border-radius: 0 2px 2px 0;
          animation: progressFill 15s linear infinite;
        }

        @keyframes progressFill {
          0%   { width: 0%; }
          100% { width: 100%; }
        }

        .sd-status-rows { padding: 4px 0; }

        .sd-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(64,123,255,0.07);
        }
        .sd-status-row:last-child { border-bottom: none; }

        .sd-status-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          color: #9bacc8;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .sd-status-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 16px;
          font-weight: 500;
          color: #0b1537;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .sd-status-value.active { color: #407BFF; }
        .sd-status-value.active::before {
          content: '';
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #407BFF;
          animation: blink 1.4s ease-in-out infinite;
        }

        .sd-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
          animation: fadeUp 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }

        .sd-info-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 18px;
          color: #8494b7;
          line-height: 1.65;
        }

        .sd-info-icon {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(64,123,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .sd-info-icon svg { width: 12px; height: 12px; color: #407BFF; }

        .sd-info-item strong { color: #0b1537; font-weight: 600; }

        @media (max-width: 1200px) {
          .sd-layout {
            max-width: 1080px;
          }
          .sd-illus {
            flex: 0 0 470px;
          }
          .sd-illus img {
            max-width: 450px;
          }
          .sd-content {
            padding-left: 56px;
          }
          .sd-heading {
            font-size: 46px;
          }
          .sd-body {
            font-size: 18px;
            max-width: 520px;
          }
          .sd-info-item {
            font-size: 16px;
          }
        }

        @media (max-width: 768px) {
          .sd-layout {
            flex-direction: column;
            text-align: center;
            width: calc(100% - 32px);
            padding: 44px 0;
          }
          .sd-illus { flex: none; width: 100%; }
          .sd-illus img { max-width: 350px; }
          .sd-content { padding-left: 0; padding-top: 32px; }
          .sd-body { max-width: 100%; }
          .sd-badge { margin-left: auto; margin-right: auto; }
          .sd-heading { font-size: 40px; }
          .sd-body { font-size: 18px; }
          .sd-info-item { font-size: 16px; }
          .sd-status-value { font-size: 14px; }
          .sd-info-item { text-align: left; }
        }
      `}</style>

      <div className="sd-root">
        <div className="sd-bg" />
        <div className="sd-grid" />

        <div className="sd-layout">
          <div className="sd-illus">
            <div className="sd-illus-glow" />
            <img src={serverDownIllustration} alt="Server down illustration" />
          </div>

          <div className="sd-content">
            <div className="sd-badge">
              <span className="sd-badge-dot" />
              <span className="sd-badge-text">Backend Status</span>
            </div>

            <h1 className="sd-heading">
              Backend is <span>paused until July</span>
            </h1>

            <p className="sd-body">
              Structra infrastructure is temporarily shut down for cost savings. The backend will remain offline until July and will be started again in the July restart window.
            </p>

            <div className="sd-status-card">
              <div className="sd-progress-wrap">
                <div className="sd-progress-bar" key={pulseKey} />
              </div>
              <div className="sd-status-rows">
                <div className="sd-status-row">
                  <span className="sd-status-label">Auto-retry</span>
                  <span className="sd-status-value">Paused</span>
                </div>
                <div className="sd-status-row">
                  <span className="sd-status-label">Expected restart</span>
                  <span className="sd-status-value">July 1, 2026 - 9:00 AM IST</span>
                </div>
                <div className="sd-status-row">
                  <span className="sd-status-label">Time remaining</span>
                  <span className="sd-status-value">{startupMessage}</span>
                </div>
                <div className="sd-status-row">
                  <span className="sd-status-label">Waiting for</span>
                  <span className="sd-status-value">{formatElapsed(elapsed)}</span>
                </div>
              </div>
            </div>

            <div className="sd-info">
              <div className="sd-info-item">
                <div className="sd-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span>No action is needed now. <strong>Service access resumes in July</strong>.</span>
              </div>
              <div className="sd-info-item">
                <div className="sd-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <span>Service state: <strong>Offline until July</strong>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
