import { Link } from "react-router-dom";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import TalentXBrand from "../../components/TalentXBrand";

export default function Footer({ footer }) {
  return (
    <footer className="bg-[#2f3341] px-4 pb-8 pt-8 text-white sm:px-6 sm:pb-10 lg:px-8">
      <div className="mx-auto max-w-7xl border-t border-white/10 pt-6 sm:pt-8">
        {/* Main grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))]">
          {/* Brand + contact */}
          <div className="space-y-4">
            <TalentXBrand theme="muted" size="sm" className="max-w-[22rem]" />
            <p className="max-w-md text-sm leading-7 text-slate-300">{footer.summary}</p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:rounded-[1.5rem] sm:p-4">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
                {footer.contact.label}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-white sm:mt-2 sm:text-base">
                {footer.contact.email}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                {footer.contact.note}
              </p>
            </div>
          </div>

          {/* Link groups */}
          {footer.groups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-sm">
                {group.title}
              </p>
              <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-400 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:pt-6 sm:text-sm">
          <p>TalentX landing-first experience for students, employers, and universities.</p>
          <a
            href="#hero"
            className="inline-flex items-center gap-1.5 font-semibold text-white transition-colors duration-200 hover:text-slate-300 sm:gap-2"
          >
            Back to top
            <KeyboardArrowUpRoundedIcon sx={{ fontSize: 18 }} />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ link }) {
  const className =
    "text-sm text-slate-300 transition-colors duration-200 hover:text-white";

  if (link.to) {
    return (
      <Link to={link.to} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={link.href} className={className}>
      {link.label}
    </a>
  );
}
