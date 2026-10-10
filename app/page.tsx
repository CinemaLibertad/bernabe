import Image from "next/image";
import Link from "next/link";

const areas = [
  ["01", "Derecho Civil", "Contratos, daños y perjuicios, sucesiones y obligaciones."],
  ["02", "Derecho Comercial", "Asesoramiento corporativo, contratos y conflictos mercantiles."],
  ["03", "Derecho Laboral", "Despidos, indemnizaciones, accidentes y acuerdos."],
  ["04", "Derecho Penal", "Defensa técnica, garantías constitucionales y estrategia procesal."],
];

export default function HomePage() {
  return <main className="public-site">
    <header className="public-header">
      <Link href="/" className="brand-lockup"><Image src="/images/brand/logo.png" alt="Bernabé Nieto" width={48} height={48} priority /><span><strong>Bernabé Nieto</strong><small>ESTUDIO JURÍDICO</small></span></Link>
      <nav><a href="#estudio">El estudio</a><a href="#areas">Áreas</a><a href="#fallos">Fallos</a><a href="#contacto">Contacto</a></nav>
      <Link href="/login" className="header-login">Panel privado ↗</Link>
    </header>

    <section className="public-hero">
      <div className="hero-emblem"><Image src="/images/brand/logo.png" alt="Emblema del estudio jurídico" width={210} height={210} priority /></div>
      <p className="eyebrow">MAT. N.º 1-31980 · MAT. FED. T.º 500 F.º 5</p>
      <p className="hero-kicker">JUSTICIA · COMPROMISO · EXCELENCIA</p>
      <h1>Defendemos sus derechos con la experiencia y la dedicación que su caso merece.</h1>
      <p className="hero-copy">Asesoramiento jurídico estratégico, atención personalizada y defensa comprometida en cada instancia.</p>
      <div className="hero-actions"><a className="button button-light" href="#contacto">Realizar una consulta</a><a className="button button-outline" href="#estudio">Conocer el estudio</a></div>
      <div className="hero-proof"><span><b>01</b> Atención personalizada</span><span><b>02</b> Estrategia y claridad</span><span><b>03</b> Confidencialidad profesional</span></div>
    </section>

    <section className="public-section intro-section" id="estudio"><div><p className="eyebrow dark">INSTITUCIÓN JURÍDICA</p><h2>Rigor técnico, templanza procesal y compromiso ético innegociable.</h2></div><p>El estudio acompaña cada asunto con una mirada estratégica, comunicación clara y absoluto respeto por la confidencialidad. La tecnología organiza el trabajo; el criterio profesional guía cada decisión.</p></section>
    <section className="public-section" id="areas"><div className="section-heading"><div><p className="eyebrow dark">ESPECIALIDADES</p><h2>Áreas de práctica</h2></div><p>Una estructura jurídica preparada para comprender el problema y construir una respuesta precisa.</p></div><div className="areas-grid">{areas.map(([number, title, copy]) => <article className="area-card" key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p><a href="#contacto">Conocer el área →</a></article>)}</div></section>
    <section className="public-section dark-band" id="fallos"><div><p className="eyebrow">BIBLIOTECA JURÍDICA</p><h2>Fallos seleccionados y conocimiento aplicado.</h2></div><p>La plataforma incorporará una biblioteca de jurisprudencia con fuentes trazables, búsqueda y publicaciones autorizadas.</p></section>
    <section className="public-section contact-section" id="contacto"><div><p className="eyebrow dark">CONTACTO DIRECTO</p><h2>Primera consulta jurídica confidencial.</h2><p>Cuéntenos brevemente su situación. La información será tratada con reserva profesional.</p></div><form className="contact-card"><label>Nombre completo<input placeholder="Su nombre" /></label><label>Correo electrónico<input type="email" placeholder="nombre@correo.com" /></label><label>Consulta<textarea placeholder="Describa brevemente su consulta" rows={5} /></label><button className="button button-dark" type="button">Enviar consulta confidencial</button></form></section>
    <footer className="public-footer"><div className="brand-lockup"><Image src="/images/brand/logo.png" alt="Bernabé Nieto" width={44} height={44} /><span><strong>Bernabé Nieto</strong><small>ESTUDIO JURÍDICO</small></span></div><p>Justicia, compromiso y excelencia.</p><small>© 2026 Bernabé Nieto. Todos los derechos reservados.</small></footer>
  </main>;
}
