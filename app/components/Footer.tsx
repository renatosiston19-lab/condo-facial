const WHATSAPP_NUMBER = "552132730300";
const PHONE_DISPLAY = "(21) 3273-0300";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-navy/10 bg-brand-navy text-white">
      <div className="mx-auto max-w-3xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <span>Infra Monitoramento — Desenvolvido por Infra Monitoramento</span>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-brand-red transition-colors"
        >
          <WhatsAppIcon />
          {PHONE_DISPLAY}
        </a>
      </div>
    </footer>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" width="18" height="18" fill="#25D366" aria-hidden="true">
      <path d="M16 3C9.373 3 4 8.373 4 15c0 2.362.687 4.564 1.875 6.417L4 29l7.79-1.833A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.627 3 16 3Zm0 21.9c-1.99 0-3.845-.58-5.404-1.579l-.388-.242-4.62 1.088 1.06-4.503-.253-.4A9.88 9.88 0 0 1 6.1 15C6.1 9.53 10.53 5.1 16 5.1S25.9 9.53 25.9 15 21.47 24.9 16 24.9Zm5.42-7.36c-.297-.148-1.755-.866-2.027-.965-.272-.099-.47-.148-.668.149-.198.297-.767.965-.94 1.163-.173.198-.347.223-.644.075-.297-.149-1.254-.462-2.389-1.474-.883-.788-1.48-1.76-1.653-2.057-.173-.297-.019-.458.13-.606.133-.133.297-.347.446-.52.148-.174.198-.298.297-.496.099-.198.05-.372-.025-.52-.074-.149-.668-1.61-.916-2.205-.241-.579-.486-.5-.668-.51l-.569-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.478 0 1.462 1.065 2.875 1.213 3.073.148.198 2.096 3.2 5.079 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.755-.718 2.002-1.412.247-.694.247-1.288.173-1.412-.074-.124-.272-.198-.569-.347Z" />
    </svg>
  );
}
