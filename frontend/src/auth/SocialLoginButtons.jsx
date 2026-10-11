import { Chrome, Github } from "lucide-react";
import { oauthStartUrl } from "./authClient";
import { rememberPostAuth } from "./postAuth";

const buttonClass =
  "flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50";

// Both providers are plain navigations to the backend, which runs the whole OAuth flow.
export default function SocialLoginButtons({ inviteToken = "" }) {
  const start = (provider) => {
    rememberPostAuth({ inviteToken });
    window.location.assign(oauthStartUrl(provider));
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button type="button" onClick={() => start("google")} className={buttonClass}>
        <Chrome size={14} /> Google
      </button>
      <button type="button" onClick={() => start("github")} className={buttonClass}>
        <Github size={14} /> GitHub
      </button>
    </div>
  );
}
